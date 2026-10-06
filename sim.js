// Fabrik-Simulation ohne Rendering. Läuft im Browser und in Node (Tests).
import { BUILDINGS, TIERS, isGenerator } from './data.js';

export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // +x, +z, -x, -z
export const MACHINE_BUFFER = 2;   // so viele Items je Zutat puffert eine Maschine über den Rezeptbedarf hinaus
export const BRIDGE_RANGE = 4;     // so weit (in Feldern) springt ein Item zwischen zwei Brücken
const CARRIERS = new Set(['belt', 'expressband', 'splitter', 'bruecke', 'sortierer']);

export const isCarrier = (kind) => CARRIERS.has(kind);
export const isSource = (kind) => BUILDINGS[kind]?.cat === 'quelle';
export const isMachine = (kind) => BUILDINGS[kind]?.cat === 'maschine';

let nextItemId = 1;

export class Factory {
  // content: Ergebnis von chapterContent(), hooks: spawn(item, cell), drop(item), deliver(type), trash(type), store(type)
  constructor(size, content, hooks = {}) {
    this.N = size;
    this.content = content;
    this.hooks = hooks;
    this.cells = new Array(size * size).fill(null);
    this.list = [];
    this.tickNo = 0;
    this.sub = 0;
    this.produced = {};
    this.parts = new Set(content.parts.map(p => p.item));
    this.speed = { source: 1, machine: 1 };   // Werkstatt-Upgrades
    this.power = { supply: 0, demand: 0, ratio: 1 };
  }

  inBounds(x, z) { return x >= 0 && z >= 0 && x < this.N && z < this.N; }
  at(x, z) { return this.inBounds(x, z) ? this.cells[z * this.N + x] : null; }
  front(c, d = c.dir, dist = 1) {
    const [dx, dz] = DIRS[d];
    return this.at(c.x + dx * dist, c.z + dz * dist);
  }

  place(kind, x, z, dir) {
    if (!this.inBounds(x, z)) return null;
    this.remove(x, z);
    const cell = { kind, x, z, dir, item: null, out: null, pending: null, inv: {}, busy: null, timer: 0, rr: 0, filter: null, blocked: 0,
      lastFrom: null, wantFrom: null, wantTick: -1, fuel: 0, tier: 0 };
    this.cells[z * this.N + x] = cell;
    this.list.push(cell);
    return cell;
  }

  remove(x, z) {
    const c = this.at(x, z);
    if (!c) return null;
    this.drop(c.item);
    this.drop(c.out);
    this.cells[z * this.N + x] = null;
    this.list.splice(this.list.indexOf(c), 1);
    return c;
  }

  clear() {
    for (const c of [...this.list]) this.remove(c.x, c.z);
  }

  drop(item) {
    if (item && this.hooks.drop) this.hooks.drop(item);
  }

  spawn(cell, type) {
    const item = { id: nextItemId++, type, stamp: this.sub };
    this.produced[type] = (this.produced[type] || 0) + 1;
    if (this.hooks.spawn) this.hooks.spawn(item, cell);
    return item;
  }

  recipesOf(kind) { return this.content.byMachine[kind] || []; }

  // Energiebedarf eines Gebäudes: eingebauter Bedarf (Labormaschinen) plus Antriebsstufe
  powerOf(c) { return (BUILDINGS[c.kind].power || 0) + TIERS[c.tier || 0].power; }
  running(c) { return isSource(c.kind) ? !c.out : !!c.busy; }

  machineWants(c, type) {
    if (isGenerator(c.kind)) { const f = BUILDINGS[c.kind].fuel; return !!f && !!f[type] && (c.inv[type] || 0) < f[type] + 1; }
    const rs = this.recipesOf(c.kind).filter(r => r.in[type]);
    if (!rs.length) return false;
    const cap = Math.max(...rs.map(r => r.in[type])) + MACHINE_BUFFER - 1;
    return (c.inv[type] || 0) < cap;
  }

  // Reißverschluss: Wer zuletzt rein durfte, lässt einen wartenden Nachbarn vor.
  carrierFree(dest, from) {
    if (dest.item) {
      dest.wantFrom = from;
      dest.wantTick = this.tickNo;
      return false;
    }
    const w = dest.wantFrom;
    if (w && w !== from && dest.lastFrom === from && dest.wantTick >= this.tickNo - 1 && this.cells[w.z * this.N + w.x] === w && (w.item || w.out)) {
      dest.wantFrom = from;
      dest.wantTick = this.tickNo;
      return false;
    }
    return true;
  }

  accepts(dest, type, from) {
    switch (dest.kind) {
      case 'belt':
      case 'expressband':
      case 'bruecke':
      case 'sortierer':
        return this.front(dest) !== from && this.carrierFree(dest, from); // nie gegen die Fahrtrichtung
      case 'splitter': return this.carrierFree(dest, from);
      case 'sink': return this.parts.has(type);
      case 'muelleimer': return true;
      case 'lager': return type === 'eisen';
      default: return isMachine(dest.kind) && this.machineWants(dest, type);
    }
  }

  give(dest, item, from) {
    item.stamp = this.sub;
    if (isCarrier(dest.kind)) {
      dest.item = item;
      dest.lastFrom = from;
      item.via = from && from.kind === 'bruecke' && dest.kind === 'bruecke' && this.front(from) !== dest ? 'bridge' : null;
      if (dest.kind === 'sortierer' && dest.filter === null) dest.filter = item.type;
      return;
    }
    this.drop(item);
    if (dest.kind === 'sink') { if (this.hooks.deliver) this.hooks.deliver(item.type); return; }
    if (dest.kind === 'muelleimer') { if (this.hooks.trash) this.hooks.trash(item.type); return; }
    if (dest.kind === 'lager') { if (this.hooks.store) this.hooks.store(item.type); return; }
    dest.inv[item.type] = (dest.inv[item.type] || 0) + 1;
  }

  // Wohin will das Item dieser Zelle? Gibt die Zielzelle zurück (oder null) und merkt sich ggf. den Verteiler-Index.
  route(c, item) {
    if (c.kind === 'splitter') {
      const cand = [c.dir, (c.dir + 1) % 4, (c.dir + 3) % 4];
      for (let i = 0; i < 3; i++) {
        const idx = (c.rr + i) % 3;
        const d = this.front(c, cand[idx]);
        if (d && this.accepts(d, item.type, c)) { c.rr = (idx + 1) % 3; return d; }
      }
      return null;
    }
    if (c.kind === 'sortierer' && item.type === c.filter) {
      const d = this.front(c, (c.dir + 3) % 4);
      return d && this.accepts(d, item.type, c) ? d : null;
    }
    if (c.kind === 'bruecke' && item.via !== 'bridge') {
      for (let dist = 2; dist <= BRIDGE_RANGE + 1; dist++) {
        const p = this.front(c, c.dir, dist);
        if (p && p.kind === 'bruecke' && p.dir === c.dir) return p.item ? null : p;
      }
    }
    const d = this.front(c);
    return d && this.accepts(d, item.type, c) ? d : null;
  }

  tick() {
    this.tickNo++;
    this.sub = this.tickNo * 2;
    const list = this.list;

    // Energienetz: Bedarf der laufenden angetriebenen Gebäude gegen Erzeuger, die nur bei Bedarf Brennstoff verbrauchen
    let demand = 0;
    for (const c of list) if (this.running(c)) demand += this.powerOf(c);
    let supply = 0;
    for (const c of list) {
      if (!isGenerator(c.kind)) continue;
      const b = BUILDINGS[c.kind];
      if (!b.fuel) { supply += b.supply; continue; }
      const hasFuel = Object.entries(b.fuel).every(([k, v]) => (c.inv[k] || 0) >= v);
      if (demand > 0 && !(c.fuel > 0) && hasFuel) { for (const [k, v] of Object.entries(b.fuel)) c.inv[k] -= v; c.fuel = b.burn; }
      if (c.fuel > 0) { supply += b.supply; if (demand > 0) c.fuel--; }
    }
    const ratio = demand > 0 ? Math.min(1, supply / demand) : 1;
    this.power = { supply, demand, ratio };
    const drive = (c) => TIERS[c.tier].speed * (this.powerOf(c) ? ratio : 1);

    for (const c of list) {
      if (isSource(c.kind)) {
        if (!c.out && (c.timer += this.speed.source * drive(c)) >= BUILDINGS[c.kind].ticks) { c.out = this.spawn(c, BUILDINGS[c.kind].out); c.timer = 0; }
      } else if (isMachine(c.kind) && !isGenerator(c.kind)) {
        const step = this.speed.machine * drive(c);
        if (c.busy && (c.busy.timer += step) >= c.busy.recipe.t) {
          c.pending = { type: c.busy.recipe.out, n: c.busy.recipe.n };
          c.busy = null;
        }
        if (!c.out && c.pending) {
          c.out = this.spawn(c, c.pending.type);
          if (--c.pending.n <= 0) c.pending = null;
        }
        if (!c.busy && !c.pending) {
          const r = this.recipesOf(c.kind).find(rec => Object.entries(rec.in).every(([k, v]) => (c.inv[k] || 0) >= v));
          if (r) {
            for (const [k, v] of Object.entries(r.in)) c.inv[k] -= v;
            c.busy = { recipe: r, timer: 0 };
          }
        }
      }
    }

    // Bewegung in zwei Halbschritten: im ersten bewegt sich alles, im zweiten nur, was auf Expressbändern liegt
    // (so laufen Expressbänder doppelt so schnell). stamp verhindert Doppelschritte im selben Halbschritt.
    this.sub = this.tickNo * 2;
    this.move(list);
    this.sub = this.tickNo * 2 + 1;
    this.move(list.filter(c => c.kind === 'expressband'));

    for (const c of list) {
      const item = isCarrier(c.kind) ? c.item : c.out;
      c.blocked = item && item.stamp < this.tickNo * 2 ? c.blocked + 1 : 0;
    }
  }

  move(cells) {
    for (let pass = 0; pass < 64; pass++) {
      let moved = false;
      for (const c of cells) {
        const slot = isCarrier(c.kind) ? 'item' : (isSource(c.kind) || isMachine(c.kind)) ? 'out' : null;
        const item = slot && c[slot];
        if (!item || item.stamp === this.sub) continue;
        const dest = this.route(c, item);
        if (dest) { c[slot] = null; this.give(dest, item, c); moved = true; }
      }
      if (!moved) break;
    }
  }

  // Für Info-Anzeige: was macht die Maschine gerade?
  status(c) {
    if (isGenerator(c.kind)) {
      const f = BUILDINGS[c.kind].fuel;
      if (!f) return { state: 'busy' };
      const missing = Object.entries(f).filter(([k, v]) => (c.inv[k] || 0) < v).map(([k]) => k);
      return { state: c.fuel > 0 ? 'busy' : missing.length ? 'waiting' : 'idle', missing };
    }
    if (this.powerOf(c) && this.running(c) && this.power.ratio < 1) return { state: 'lowpower', recipe: c.busy?.recipe, progress: c.busy ? c.busy.timer / c.busy.recipe.t : 0 };
    if (isMachine(c.kind)) {
      if (c.busy) return { state: 'busy', recipe: c.busy.recipe, progress: c.busy.timer / c.busy.recipe.t };
      if (c.out && c.blocked > 4) return { state: 'blocked' };
      const rs = this.recipesOf(c.kind);
      const partial = rs.find(r => Object.keys(r.in).some(k => c.inv[k] > 0)) || null;
      if (partial) {
        const missing = Object.entries(partial.in).filter(([k, v]) => (c.inv[k] || 0) < v).map(([k]) => k);
        return { state: 'waiting', recipe: partial, missing };
      }
      return { state: 'idle' };
    }
    if (isSource(c.kind)) return { state: c.out && c.blocked > 4 ? 'blocked' : 'busy' };
    return { state: 'idle' };
  }

  serialize() {
    return this.list.map(c => [c.kind, c.x, c.z, c.dir, c.filter, c.tier]);
  }
}

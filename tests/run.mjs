// Node-Tests ohne Abhängigkeiten: node tests/run.mjs
import { ITEMS, BUILDINGS, RECIPES, CHAPTERS, CAMPAIGN, chapterContent } from '../data.js';
import { Factory } from '../sim.js';
import { planChapter } from '../layout.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.log('  FEHLER:', msg); } };
const section = (name) => console.log(`\n# ${name}`);

// ---------------------------------------------------------------- Daten
section('Daten');
for (const r of RECIPES) {
  ok(BUILDINGS[r.m]?.cat === 'maschine', `Rezept ${r.out}: Maschine ${r.m} fehlt`);
  ok(ITEMS[r.out], `Rezept: Item ${r.out} fehlt`);
  for (const i of Object.keys(r.in)) ok(ITEMS[i], `Rezept ${r.out}: Zutat ${i} fehlt`);
  ok(CHAPTERS[r.from], `Rezept ${r.out}: Kapitel ${r.from} fehlt`);
}
for (const [id, b] of Object.entries(BUILDINGS)) if (b.cat === 'quelle') ok(ITEMS[b.out], `Quelle ${id}: Item ${b.out} fehlt`);
for (const [id, ch] of Object.entries(CHAPTERS)) {
  for (const b of ch.unlock) ok(BUILDINGS[b], `${id}: Gebäude ${b} fehlt`);
  const c = chapterContent(id);
  const seen = {};
  for (const b of c.buildings) if (BUILDINGS[b].cat === 'quelle') (seen[BUILDINGS[b].out] ||= []).push(b);
  for (const r of c.recipes) (seen[r.out] ||= []).push(r.m);
  for (const [item, who] of Object.entries(seen)) ok(who.length === 1, `${id}: ${item} hat mehrere Hersteller (${who})`);
  for (const r of c.recipes) ok(c.buildings.includes(r.m), `${id}: Rezept ${r.out} braucht ${r.m}, nicht freigeschaltet`);
  const need = (item, depth = 0) => {
    const p = c.producer[item];
    ok(p, `${id}: kein Hersteller für ${item}`);
    if (p?.recipe && depth < 20) for (const i of Object.keys(p.recipe.in)) need(i, depth + 1);
  };
  for (const p of ch.parts) need(p.item);
  for (const k of ['sink', 'belt']) ok(c.buildings.includes(k), `${id}: ${k} fehlt`);
}
ok(CAMPAIGN.every(id => CHAPTERS[id] && !CHAPTERS[id].bonus), 'Kampagne enthält ungültige Kapitel');
console.log('  geprüft:', RECIPES.length, 'Rezepte,', Object.keys(CHAPTERS).length, 'Kapitel');

// ---------------------------------------------------------------- Mechanik
section('Mechanik');
const content = chapterContent('weltrekord');
function run(f, ticks) { for (let i = 0; i < ticks; i++) f.tick(); }

{ // Verteiler: drei Ausgänge gleichmäßig
  const f = new Factory(12, content);
  f.place('weizenfeld', 1, 5, 0); f.place('belt', 2, 5, 0); f.place('splitter', 3, 5, 0);
  for (let i = 4; i < 7; i++) f.place('belt', i, 5, 0);
  for (let i = 6; i < 9; i++) f.place('belt', 3, i, 1);
  for (let i = 4; i > 1; i--) f.place('belt', 3, i, 3);
  run(f, 400);
  const full = (pts) => pts.filter(([x, z]) => f.at(x, z).item).length;
  ok(full([[4, 5], [5, 5], [6, 5]]) === 3 && full([[3, 6], [3, 7], [3, 8]]) === 3 && full([[3, 4], [3, 3], [3, 2]]) === 3, 'Verteiler füllt nicht alle drei Ausgänge');
}
{ // Brücke: springt über ein querlaufendes Band
  const f = new Factory(12, content);
  let delivered = 0;
  f.hooks.trash = () => delivered++;
  f.place('weizenfeld', 0, 5, 0); f.place('belt', 1, 5, 0); f.place('bruecke', 2, 5, 0);
  for (let z = 0; z < 12; z++) f.place('belt', 3, z, 1);     // Querband unter der Brücke
  f.place('bruecke', 4, 5, 0); f.place('belt', 5, 5, 0); f.place('muelleimer', 6, 5, 0);
  run(f, 200);
  ok(delivered > 10, `Brücke transportiert nicht (${delivered})`);
  let onCross = 0; for (let z = 0; z < 12; z++) if (f.at(3, z).item) onCross++;
  ok(onCross === 0, 'Brücke hat Items aufs Querband abgegeben');
}
{ // Sortierer: Filter zur Seite, Rest geradeaus
  const f = new Factory(12, content);
  const trash = {};
  f.hooks.trash = (t) => { trash[t] = (trash[t] || 0) + 1; };
  f.place('weizenfeld', 1, 4, 1); f.place('kuhweide', 0, 5, 0);
  f.place('belt', 1, 5, 0); f.place('belt', 2, 5, 0);
  const s = f.place('sortierer', 3, 5, 0); s.filter = 'milch';
  f.place('belt', 4, 5, 0); f.place('muelleimer', 5, 5, 0);     // geradeaus
  f.place('belt', 3, 4, 3); f.place('muelleimer', 3, 3, 0);     // Seite (dir+3 = -z)
  run(f, 300);
  ok(trash.milch > 5 && trash.weizen > 5, 'Sortierer: nichts angekommen');
  ok(!f.at(4, 5).item || f.at(4, 5).item.type === 'weizen', 'Sortierer: Milch geradeaus');
  ok(!f.at(3, 4).item || f.at(3, 4).item.type === 'milch', 'Sortierer: Weizen zur Seite');
}
{ // Mehrfach-Ausgabe und Mehrfach-Zutaten: Toastbrot -> 4 Toastscheiben, Butterfass braucht 2 Milch
  const f = new Factory(12, content);
  const got = {};
  f.hooks.trash = (t) => { got[t] = (got[t] || 0) + 1; };
  const sch = f.place('schneider', 3, 3, 0); sch.inv.toastbrot = 1; f.place('muelleimer', 4, 3, 0);
  f.place('kuhweide', 1, 6, 0); f.place('butterfass', 2, 6, 0); f.place('muelleimer', 3, 6, 0);
  run(f, 60);
  ok(got.toastscheibe === 4, `Schneider: ${got.toastscheibe} statt 4 Scheiben`);
  ok(got.butter >= 2 && f.produced.milch >= got.butter * 2, `Butterfass: ${got.butter} Butter aus ${f.produced.milch} Milch`);
}
{ // Reißverschluss: ein seitlich einmündendes Band kommt auch auf ein volles Hauptband
  const f = new Factory(12, content);
  const trash = {};
  f.hooks.trash = (t) => { trash[t] = (trash[t] || 0) + 1; };
  for (let x = 0; x < 3; x++) { f.place('weizenfeld', x, 4, 1); f.place('belt', x, 5, 0); }   // drei Felder: Hauptband voll
  for (let x = 3; x < 8; x++) f.place('belt', x, 5, 0);
  f.place('muelleimer', 8, 5, 0);
  f.place('brunnen', 5, 2, 1); f.place('belt', 5, 3, 1); f.place('belt', 5, 4, 1);          // Wasser von der Seite
  run(f, 400);
  ok(trash.wasser > 20 && trash.weizen > 20, `Reißverschluss: Wasser ${trash.wasser}, Weizen ${trash.weizen}`);
}
{ // Eisen: Erz + Kohle -> Schmelzofen -> Materiallager
  const f = new Factory(10, content);
  let eisen = 0;
  f.hooks.store = () => eisen++;
  f.place('erzmine', 1, 4, 0); f.place('kohlemine', 2, 3, 1); f.place('schmelze', 2, 4, 0); f.place('belt', 3, 4, 0); f.place('lager', 4, 4, 0);
  run(f, 200);
  ok(eisen > 5, `Materiallager: nur ${eisen} Eisen`);
}
{ // Strom: ohne Kraftwerk steht die Elektrolyse, mit Kraftwerk läuft sie, Upgrades beschleunigen
  const wr = chapterContent('weltraum');
  const make = (withPower, speed = 1) => {
    const f = new Factory(10, wr);
    let alu = 0;
    f.hooks.trash = () => alu++;
    f.speed.machine = speed;
    f.speed.source = speed;
    f.place('bauxitmine', 1, 5, 0); f.place('elektrolyse', 2, 5, 0); f.place('muelleimer', 3, 5, 0);
    if (withPower) { f.place('kohlemine', 5, 1, 1); f.place('kraftwerk', 5, 2, 0); }
    run(f, 400);
    return { alu, f };
  };
  ok(make(false).alu === 0, 'Elektrolyse läuft ohne Strom');
  const a = make(true), b = make(true, 1.5);
  ok(a.alu > 10, `Elektrolyse mit Strom: nur ${a.alu}`);
  ok(b.alu > a.alu, `Upgrade bringt nichts (${b.alu} vs ${a.alu})`);
  ok(a.f.power.supply > 0, 'Kraftwerk liefert keinen Strom');
}
{ // Stau: Endmontage nimmt keine Nicht-Teile an
  const f = new Factory(8, chapterContent('butterbrot'));
  f.place('weizenfeld', 0, 0, 0); f.place('belt', 1, 0, 0); f.place('sink', 2, 0, 0);
  run(f, 60);
  ok(f.at(1, 0).item?.type === 'weizen', 'Endmontage hat Weizen angenommen');
}

// ---------------------------------------------------------------- Kapitel lösbar
section('Kapitel (Auto-Fabrik)');
for (const id of Object.keys(CHAPTERS)) {
  const c = chapterContent(id);
  const plan = planChapter(c, c.chapter.grid, BUILDINGS);
  ok(plan, `${id}: Auto-Fabrik passt nicht ins ${c.chapter.grid}er-Raster`);
  if (!plan) continue;
  const delivered = {};
  const f = new Factory(c.chapter.grid, c, { deliver: (t) => { delivered[t] = (delivered[t] || 0) + 1; } });
  for (const [kind, x, z, dir] of plan) {
    ok(!f.at(x, z), `${id}: Layout überlappt bei ${x},${z}`);
    ok(c.buildings.includes(kind), `${id}: Layout nutzt gesperrtes ${kind}`);
    f.place(kind, x, z, dir);
  }
  let t = 0;
  const done = () => c.parts.every(p => (delivered[p.item] || 0) >= p.need);
  while (!done() && t < 20000) { f.tick(); t++; }
  ok(done(), `${id}: nicht fertig geworden: ${JSON.stringify(delivered)}`);
  console.log(`  ${id.padEnd(11)} ${done() ? 'fertig' : 'FEHLT '} nach ${(t * 0.25 / 60).toFixed(1)} min Spielzeit, ${plan.length} Gebäude`);
}

console.log(failed ? `\n${failed} Fehler` : '\nAlles grün');
process.exit(failed ? 1 : 0);

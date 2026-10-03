import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { ITEMS, SOURCES, MACHINES, LOGISTICS, CHAPTERS, GRID } from './data.js';
import { mat, part, makeItem, makeBuilding, makeEndProject } from './models.js';
import { sfx } from './audio.js';

// ---------------------------------------------------------------- Konfiguration
const N = GRID;
const TICK = 0.25;                                  // Sekunden pro Simulationsschritt
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];    // +x, +z, -x, -z
const MACHINE_BUFFER = 2;                           // so viele Items je Sorte darf eine Maschine puffern
const ITEM_Y = { belt: 0.28, splitter: 0.32, other: 0.6 };

// ---------------------------------------------------------------- Szene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2430);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 300);
camera.position.set(22, 26, 24);

const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 6;
controls.maxDistance = 60;
controls.enableDamping = true;
controls.target.set(5, 0, 1);

scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a3140, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(10, 22, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
scene.add(sun);

const ground = new THREE.Mesh(new THREE.BoxGeometry(N, 0.4, N), mat(0x33414f, { roughness: 0.95 }));
ground.position.y = -0.2;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(N, N, 0x5b6c7e, 0x445364);
grid.position.y = 0.01;
scene.add(grid);

const cellPos = (x, z) => new THREE.Vector3(x - N / 2 + 0.5, 0, z - N / 2 + 0.5);
const inBounds = (x, z) => x >= 0 && z >= 0 && x < N && z < N;

// Schaufenster fürs Endprojekt: ein Sockel neben dem Spielfeld
const podium = new THREE.Group();
podium.position.set(N / 2 + 3.2, 0, -N / 2 + 3);
podium.add(part('cyl', mat(0x2c3a4a), 3.4, 0.3, 3.4, 0, 0.15, 0));
podium.add(part('cyl', mat(0xffb703, { emissive: 0xffb703, emissiveIntensity: 0.2 }), 3.0, 0.05, 3.0, 0, 0.32, 0, false));
scene.add(podium);
let showcase = null;

// ---------------------------------------------------------------- Zustand
const cells = Array.from({ length: N * N }, () => null);
const at = (x, z) => (inBounds(x, z) ? cells[z * N + x] : null);
const itemLayer = new THREE.Group();
scene.add(itemLayer);

let chapterId = 'sandwich';
let delivered = {};
let surplus = 0;
let finished = false;
let tickNo = 0;
let startTick = null;
let finishTick = null;
let speed = 1;

const chapter = () => CHAPTERS[chapterId];
const isPartItem = (type) => chapter().parts.some(p => p.item === type);

function spawnItem(cell, type) {
  const mesh = makeItem(type);
  mesh.position.copy(cell.mesh.position).setY(ITEM_Y.other);
  itemLayer.add(mesh);
  return { type, mesh, stamp: -1 };
}

function dropItem(item) {
  if (item && item.mesh) itemLayer.remove(item.mesh);
}

function removeCell(x, z, silent = false) {
  const c = at(x, z);
  if (!c) return;
  scene.remove(c.mesh);
  dropItem(c.item);
  dropItem(c.out);
  cells[z * N + x] = null;
  if (!silent) { sfx.remove(); scheduleSave(); }
}

function placeCell(kind, x, z, dir, silent = false) {
  if (!inBounds(x, z)) return null;
  const old = at(x, z);
  if (old && old.kind === kind) {
    if (old.dir !== dir) { old.dir = dir; applyDir(old); scheduleSave(); }
    return old;
  }
  removeCell(x, z, true);
  const mesh = makeBuilding(kind);
  mesh.position.copy(cellPos(x, z));
  scene.add(mesh);
  const cell = { kind, x, z, dir, mesh, item: null, out: null, inv: {}, busy: null, timer: 0, rr: 0, anim: { spin: [], bob: [] } };
  mesh.traverse(o => {
    if (o.name === 'spin') cell.anim.spin.push(o);
    if (o.name === 'bob') { o.userData.baseY = o.position.y; cell.anim.bob.push(o); }
  });
  applyDir(cell);
  cells[z * N + x] = cell;
  if (startTick === null && !silent) startTick = tickNo;
  if (!silent) { sfx.place(); scheduleSave(); }
  return cell;
}

function applyDir(cell) {
  cell.mesh.rotation.y = -cell.dir * Math.PI / 2;
}

function clearFactory() {
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) removeCell(x, z, true);
}

// ---------------------------------------------------------------- Endprojekt
function doneSet() {
  return new Set(chapter().parts.filter(p => (delivered[p.item] || 0) >= p.need).map(p => p.item));
}

function resetProgress() {
  delivered = {};
  surplus = 0;
  finished = false;
  startTick = cells.some(Boolean) ? tickNo : null;
  finishTick = null;
  confetti.length = 0;
  buildShowcase();
  renderGoal();
}

function buildShowcase() {
  if (showcase) podium.remove(showcase.group);
  showcase = makeEndProject(chapterId);
  showcase.group.position.y = 0.36;
  showcase.group.scale.setScalar(2.2);
  podium.add(showcase.group);
  showcase.update(doneSet());
}

const confetti = [];
function burstConfetti() {
  const colors = [0xffb703, 0xfb5607, 0xff006e, 0x8338ec, 0x3a86ff, 0x06d6a0];
  for (let i = 0; i < 70; i++) {
    const m = part('box', mat(colors[i % colors.length]), 0.12, 0.12, 0.12, 0, 0, 0, false);
    m.position.set(podium.position.x, 3, podium.position.z);
    scene.add(m);
    confetti.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 6, 4 + Math.random() * 5, (Math.random() - 0.5) * 6), life: 2.8 });
  }
}

// ---------------------------------------------------------------- Simulation
function frontOf(cell, d = cell.dir) {
  const [dx, dz] = DIRS[d];
  return at(cell.x + dx, cell.z + dz);
}

function machineWants(c, type) {
  return MACHINES[c.kind].recipes.some(r => r.in[type]) && (c.inv[type] || 0) < MACHINE_BUFFER;
}

function accepts(dest, type, from) {
  if (dest.kind === 'belt') {
    if (dest.item) return false;
    const f = frontOf(dest);
    return !(f && f === from);               // nie gegen die Fahrtrichtung
  }
  if (dest.kind === 'splitter') return !dest.item;
  if (dest.kind === 'sink') return isPartItem(type);
  if (MACHINES[dest.kind]) return machineWants(dest, type);
  return false;
}

function give(dest, item) {
  item.stamp = tickNo;
  if (dest.kind === 'belt' || dest.kind === 'splitter') { dest.item = item; return; }
  dropItem(item);
  if (dest.kind === 'sink') { deliver(item.type); return; }
  dest.inv[item.type] = (dest.inv[item.type] || 0) + 1;
}

function deliver(type) {
  const need = chapter().parts.find(p => p.item === type).need;
  const have = delivered[type] || 0;
  if (have >= need) { surplus++; renderGoal(); return; }
  delivered[type] = have + 1;
  const total = chapter().parts.reduce((s, p) => s + p.need, 0);
  const got = chapter().parts.reduce((s, p) => s + Math.min(delivered[p.item] || 0, p.need), 0);
  if (delivered[type] === need) {
    sfx.partDone();
    showcase.update(doneSet());
    toast(`${ITEMS[type].name} fertig`, 1400);
  } else {
    sfx.deliver(got / total);
  }
  renderGoal();
  if (!finished && got === total) {
    finished = true;
    finishTick = tickNo;
    sfx.finish();
    if (chapterId === 'ente') setTimeout(sfx.squeak, 900);
    burstConfetti();
    toast(`${chapter().title} – fertig in ${fmtTime((finishTick - (startTick ?? finishTick)) * TICK)}!`, 6000);
  }
}

function tick() {
  tickNo++;

  for (const c of cells) {
    if (!c) continue;
    if (SOURCES[c.kind]) {
      if (!c.out && ++c.timer >= SOURCES[c.kind].ticks) { c.out = spawnItem(c, SOURCES[c.kind].out); c.timer = 0; }
    } else if (MACHINES[c.kind]) {
      if (c.busy && ++c.busy.timer >= c.busy.recipe.ticks) {
        c.out = spawnItem(c, c.busy.recipe.out);
        c.busy = null;
      }
      if (!c.busy && !c.out) {
        const r = MACHINES[c.kind].recipes.find(rec => Object.entries(rec.in).every(([k, v]) => (c.inv[k] || 0) >= v));
        if (r) {
          for (const [k, v] of Object.entries(r.in)) c.inv[k] -= v;
          c.busy = { recipe: r, timer: 0 };
        }
      }
    }
  }

  // Mehrere Durchläufe, damit Schlangen sauber nachrücken; stamp verhindert Doppelschritte
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const c of cells) {
      if (!c) continue;
      const slot = c.kind === 'belt' || c.kind === 'splitter' ? 'item' : c.kind === 'sink' ? null : 'out';
      const item = slot && c[slot];
      if (!item || item.stamp === tickNo) continue;
      let dest = null;
      if (c.kind === 'splitter') {
        const cand = [c.dir, (c.dir + 1) % 4, (c.dir + 3) % 4];
        for (let i = 0; i < 3; i++) {
          const idx = (c.rr + i) % 3;
          const d = frontOf(c, cand[idx]);
          if (d && accepts(d, item.type, c)) { dest = d; c.rr = (idx + 1) % 3; break; }
        }
      } else {
        const d = frontOf(c);
        if (d && accepts(d, item.type, c)) dest = d;
      }
      if (dest) { c[slot] = null; give(dest, item); moved = true; }
    }
    if (!moved) break;
  }
}

function syncItems(dt) {
  const k = 1 - Math.exp(-dt * 18);
  const target = new THREE.Vector3();
  for (const c of cells) {
    if (!c) continue;
    const it = c.kind === 'belt' || c.kind === 'splitter' ? c.item : c.out;
    if (it && it.mesh) {
      target.copy(c.mesh.position).setY(ITEM_Y[c.kind] ?? ITEM_Y.other);
      it.mesh.position.lerp(target, k);
    }
  }
}

function animate(dt, t) {
  for (const c of cells) {
    if (!c || !MACHINES[c.kind]) continue;
    const on = !!c.busy;
    for (const s of c.anim.spin) {
      if (on) s.rotation[s.userData.axis === 'y' ? 'y' : 'z'] += dt * 8;
    }
    for (const b of c.anim.bob) {
      b.position.y = b.userData.baseY + (on ? Math.max(0, Math.sin(t * 9)) * 0.14 : 0);
    }
  }
  if (showcase) showcase.group.rotation.y += dt * (finished ? 1.6 : 0.45);
  for (let i = confetti.length - 1; i >= 0; i--) {
    const p = confetti[i];
    p.life -= dt;
    p.v.y -= 12 * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.rotation.x += dt * 5;
    p.m.rotation.z += dt * 4;
    if (p.life <= 0 || p.m.position.y < 0) { scene.remove(p.m); confetti.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- Werkzeuge & Eingabe
let tool = 'belt';
let toolList = [];
let buildDir = 0;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();
let hover = null;
let ghost = null;

function buildToolList() {
  const ch = chapter();
  toolList = ['belt', 'splitter', 'sink', ...ch.sources, ...ch.machines];
}

function nameOf(kind) {
  return (SOURCES[kind] || MACHINES[kind] || LOGISTICS[kind] || { name: kind }).name;
}

function describe(kind) {
  const it = (id) => ITEMS[id].name;
  if (SOURCES[kind]) {
    const s = SOURCES[kind];
    return `<b>${s.name}</b> erzeugt ${it(s.out)} (alle ${(s.ticks * TICK).toFixed(1)} s) und gibt es nach vorn ab.`;
  }
  if (MACHINES[kind]) {
    const lines = MACHINES[kind].recipes.map(r =>
      `${Object.entries(r.in).map(([k, v]) => (v > 1 ? `${v}× ` : '') + it(k)).join(' + ')} → <b>${it(r.out)}</b>`);
    return `<b>${MACHINES[kind].name}</b><br>${lines.join('<br>')}`;
  }
  if (LOGISTICS[kind]) return `<b>${LOGISTICS[kind].name}</b><br>${LOGISTICS[kind].info}`;
  return '';
}

function renderInfo() {
  const c = hover && at(hover.x, hover.z);
  const kind = tool === 'erase' ? (c ? c.kind : null) : (c ? c.kind : tool);
  document.getElementById('info').innerHTML = tool === 'erase' && !c ? 'Abriss: Klicke auf ein Gebäude.' : kind ? describe(kind) : '';
}

function setTool(t) {
  tool = t;
  document.querySelectorAll('.tool').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  makeGhost();
  renderInfo();
}

function makeGhost() {
  if (ghost) scene.remove(ghost);
  ghost = tool === 'erase'
    ? new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.3, 0.96), new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.45 }))
    : makeBuilding(tool, true);
  ghost.visible = false;
  ghost.traverse(o => { o.castShadow = false; });
  scene.add(ghost);
  updateGhost();
}

function updateGhost() {
  if (!ghost) return;
  ghost.visible = !!hover;
  if (!hover) return;
  ghost.position.copy(cellPos(hover.x, hover.z));
  if (tool === 'erase') ghost.position.y = 0.15;
  else ghost.rotation.y = -buildDir * Math.PI / 2;
}

function pickCell(ev) {
  pointer.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectPlane(plane, hit)) return null;
  const x = Math.floor(hit.x + N / 2);
  const z = Math.floor(hit.z + N / 2);
  return inBounds(x, z) ? { x, z } : null;
}

let painting = false;
let lastPaint = null;

function paint(cell, ev) {
  if (ev.shiftKey || tool === 'erase') { removeCell(cell.x, cell.z); lastPaint = cell; return; }
  if (tool === 'belt' && lastPaint && (lastPaint.x !== cell.x || lastPaint.z !== cell.z)) {
    // Beim Ziehen zeigt das vorherige Band zum neuen
    const dx = cell.x - lastPaint.x, dz = cell.z - lastPaint.z;
    const d = DIRS.findIndex(([ax, az]) => ax === dx && az === dz);
    const prev = at(lastPaint.x, lastPaint.z);
    if (d >= 0) {
      buildDir = d;
      if (prev && prev.kind === 'belt') { prev.dir = d; applyDir(prev); }
    }
  }
  placeCell(tool, cell.x, cell.z, buildDir);
  lastPaint = cell;
  updateGhost();
}

const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', ev => {
  if (ev.button !== 0) return;
  const cell = pickCell(ev);
  if (!cell) return;
  painting = true;
  lastPaint = null;
  paint(cell, ev);
});
canvas.addEventListener('pointermove', ev => {
  const prev = hover;
  hover = pickCell(ev);
  updateGhost();
  if (!prev || !hover || prev.x !== hover.x || prev.z !== hover.z) renderInfo();
  if (painting && hover && !(lastPaint && lastPaint.x === hover.x && lastPaint.z === hover.z)) paint(hover, ev);
});
canvas.addEventListener('pointerleave', () => { hover = null; updateGhost(); renderInfo(); });
addEventListener('pointerup', () => { painting = false; lastPaint = null; });
canvas.addEventListener('contextmenu', ev => ev.preventDefault());

const keys = new Set();
addEventListener('keydown', ev => {
  if (ev.repeat) return;
  const k = ev.key.toLowerCase();
  if (k === 'r') {
    const c = hover && at(hover.x, hover.z);
    if (c && c.kind !== 'sink') { c.dir = (c.dir + 1) % 4; applyDir(c); scheduleSave(); }
    buildDir = (buildDir + 1) % 4;
    updateGhost();
    return;
  }
  if (k === '0' || k === 'x') { setTool('erase'); return; }
  const n = Number(k);
  if (n >= 1 && n <= 9 && toolList[n - 1]) { setTool(toolList[n - 1]); return; }
  if ('wasd'.includes(k) && k.length === 1) keys.add(k);
});
addEventListener('keyup', ev => keys.delete(ev.key.toLowerCase()));

const fwd = new THREE.Vector3();
const rightV = new THREE.Vector3();
function panCamera(dt) {
  if (!keys.size) return;
  camera.getWorldDirection(fwd).setY(0).normalize();
  rightV.crossVectors(fwd, camera.up).normalize();
  const v = new THREE.Vector3();
  if (keys.has('w')) v.add(fwd);
  if (keys.has('s')) v.sub(fwd);
  if (keys.has('d')) v.add(rightV);
  if (keys.has('a')) v.sub(rightV);
  v.multiplyScalar(14 * dt);
  camera.position.add(v);
  controls.target.add(v);
}

// ---------------------------------------------------------------- HUD
const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function renderToolbar() {
  const el = $('tools');
  el.innerHTML = '';
  const groups = [
    ['Logistik', ['belt', 'splitter', 'sink']],
    ['Quellen', chapter().sources],
    ['Maschinen', chapter().machines],
  ];
  for (const [title, kinds] of groups) {
    const h = document.createElement('div');
    h.className = 'group';
    h.textContent = title;
    el.appendChild(h);
    for (const kind of kinds) {
      const def = SOURCES[kind] || MACHINES[kind] || LOGISTICS[kind];
      const idx = toolList.indexOf(kind);
      const b = document.createElement('button');
      b.className = 'tool';
      b.dataset.tool = kind;
      b.innerHTML = `<span class="dot" style="background:${def.color}"></span>${def.name}${idx < 9 ? `<kbd>${idx + 1}</kbd>` : ''}`;
      b.addEventListener('click', () => setTool(kind));
      el.appendChild(b);
    }
  }
  const e = document.createElement('button');
  e.className = 'tool';
  e.dataset.tool = 'erase';
  e.innerHTML = '<span class="dot" style="background:#ff4040"></span>Abriss<kbd>0</kbd>';
  e.addEventListener('click', () => setTool('erase'));
  el.appendChild(e);
}

function renderChapters() {
  const el = $('chapters');
  el.innerHTML = '';
  Object.entries(CHAPTERS).forEach(([id, ch], i) => {
    const b = document.createElement('button');
    b.className = 'chap' + (id === chapterId ? ' active' : '');
    b.textContent = `Kapitel ${i + 1} · ${ch.short}`;
    b.addEventListener('click', () => switchChapter(id));
    el.appendChild(b);
  });
}

function renderGoal() {
  const ch = chapter();
  $('goal-title').textContent = ch.title;
  $('parts').innerHTML = ch.parts.map(p => {
    const have = Math.min(delivered[p.item] || 0, p.need);
    const ok = have >= p.need;
    return `<li class="${ok ? 'ok' : ''}"><span class="dot" style="background:${hex(ITEMS[p.item].color)}"></span>` +
      `<span class="pn">${ITEMS[p.item].name}</span><span class="pc">${ok ? '✓' : `${have}/${p.need}`}</span></li>`;
  }).join('');
  const total = ch.parts.reduce((s, p) => s + p.need, 0);
  const got = ch.parts.reduce((s, p) => s + Math.min(delivered[p.item] || 0, p.need), 0);
  $('bar').firstElementChild.style.width = `${(got / total) * 100}%`;
  $('surplus').textContent = surplus ? `Überschuss: ${surplus}` : '';
}

function renderTime() {
  const end = finished ? finishTick : tickNo;
  $('time').textContent = startTick === null ? '0:00' : fmtTime(Math.max(0, end - startTick) * TICK);
}

let toastTimer = 0;
function toast(msg, ms = 2500) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

document.querySelectorAll('.speed').forEach(b => b.addEventListener('click', () => {
  speed = Number(b.dataset.speed);
  document.querySelectorAll('.speed').forEach(x => x.classList.toggle('active', x === b));
}));
$('mute').addEventListener('click', () => {
  sfx.setMuted(!sfx.isMuted());
  $('mute').textContent = sfx.isMuted() ? 'Ton aus' : 'Ton an';
});
$('clear').addEventListener('click', () => { clearFactory(); resetProgress(); scheduleSave(); });
$('demo').addEventListener('click', () => { loadDemo(); toast('Demo-Fabrik gebaut – schau zu!'); });

// ---------------------------------------------------------------- Speichern
const saveKey = (id) => `absurd-industries.v1.${id}`;
let saveTimer = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}
function save() {
  try {
    const data = cells.filter(Boolean).map(c => [c.kind, c.x, c.z, c.dir]);
    localStorage.setItem(saveKey(chapterId), JSON.stringify(data));
  } catch { /* privater Modus o. Ä.: Speichern ist optional */ }
}
function loadSave(id) {
  try {
    const raw = localStorage.getItem(saveKey(id));
    if (!raw) return false;
    const list = JSON.parse(raw);
    const ch = CHAPTERS[id];
    const allowed = new Set(['belt', 'splitter', 'sink', ...ch.sources, ...ch.machines]);
    for (const [kind, x, z, dir] of list) if (allowed.has(kind)) placeCell(kind, x, z, dir, true);
    return list.length > 0;
  } catch { return false; }
}

function switchChapter(id) {
  save();
  clearFactory();
  chapterId = id;
  buildToolList();
  renderToolbar();
  renderChapters();
  loadSave(id);
  resetProgress();
  setTool(toolList.includes(tool) ? tool : 'belt');
}

// ---------------------------------------------------------------- Demo-Fabrik
// Jede Zeile ist eine Produktionskette für ein Teil; alle laufen in ein Sammelband zur Endmontage.
const DEMOS = {
  sandwich: [
    { chain: ['weizenfeld', 'muehle', 'ofen'] },
    { chain: ['kuhstall', 'kaeserei'] },
    { chain: ['salatbeet', 'schneider'] },
    { chain: ['gewaechshaus', 'schneider'] },
    { chain: ['schweinestall', 'ofen'] },
    { chain: ['kraeutergarten', 'muehle', 'mixer'], feed: 'gewaechshaus' },
    { chain: ['kraeutergarten', 'muehle'] },
    { chain: ['wald', 'presse'] },
  ],
  ente: [
    { chain: ['oelquelle', 'raffinerie', 'formpresse'] },
    { chain: ['gummibaum', 'formpresse'] },
    { chain: ['wald', 'schneider'] },
    { chain: ['sandgrube', 'ofen', 'schneider'] },
    { chain: ['oelquelle', 'raffinerie', 'mixer'], feed: 'gummibaum' },
    { chain: ['pigmentmine', 'mixer'], feed: 'oelquelle' },
    { chain: ['sandgrube', 'ofen', 'mixer'], feed: 'oelquelle' },
    { chain: ['wald', 'presse'] },
  ],
};

function loadDemo() {
  clearFactory();
  const lanes = DEMOS[chapterId];
  const busX = N - 3;
  lanes.forEach((lane, k) => {
    const z = 1 + 3 * k;
    let x = 1;
    lane.chain.forEach((kind, i) => {
      placeCell(kind, x, z, 0, true);
      if (lane.feed && i === lane.chain.length - 1) placeCell(lane.feed, x, z - 1, 1, true);
      x += 2;
      if (i < lane.chain.length - 1) placeCell('belt', x - 1, z, 0, true);
    });
    for (let bx = x - 1; bx < busX; bx++) placeCell('belt', bx, z, 0, true);
  });
  for (let z = 0; z < N - 1; z++) placeCell('belt', busX, z, 1, true);
  placeCell('sink', busX, N - 1, 0, true);
  resetProgress();
  startTick = tickNo;
  scheduleSave();
}

// ---------------------------------------------------------------- Loop
const clock = new THREE.Clock();
let acc = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  acc += dt * speed;
  let steps = 0;
  while (acc >= TICK && steps++ < 40) { acc -= TICK; tick(); }
  syncItems(dt);
  animate(dt, clock.elapsedTime);
  panCamera(dt);
  renderTime();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------------------------------------------------------------- Start
const params = new URLSearchParams(location.search);
if (params.get('chapter') && CHAPTERS[params.get('chapter')]) chapterId = params.get('chapter');
buildToolList();
renderToolbar();
renderChapters();
if (!params.has('fresh')) loadSave(chapterId);
resetProgress();
setTool('belt');
if (params.has('demo')) loadDemo();
window.__game = {
  cells, tick, loadDemo, switchChapter, place: placeCell,
  get chapter() { return chapterId; },
  get delivered() { return { ...delivered }; },
  get finished() { return finished; },
  get surplus() { return surplus; },
};
frame();

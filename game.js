import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { ITEMS, BUILDINGS, CHAPTERS, CAMPAIGN, ERAS, TIERS, TICK, chapterContent, costOf, eraOf, isGenerator, isUpgradable } from './data.js';
import { Factory, DIRS, isCarrier, isMachine, isSource } from './sim.js';
import { planChapter } from './layout.js';
import { mat, part, makeItem, makeBuilding, makeEndProject } from './models.js';
import { sfx } from './audio.js';
import { thumb } from './thumbs.js';

// ================================================================ Szene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
// Minimalistischer Look: heller, matter Boden, weiche Schatten, Nebel am Horizont
scene.background = new THREE.Color(0xdde3e9);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400);

const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 5;
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96a3, 1.5));
const sun = new THREE.DirectionalLight(0xfff6ea, 1.9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);
scene.add(sun.target);

let ground = null;
let grid = null;
const itemLayer = new THREE.Group();
scene.add(itemLayer);

let N = 16;
const cellPos = (x, z) => new THREE.Vector3(x - N / 2 + 0.5, 0, z - N / 2 + 0.5);

function buildWorld(size) {
  N = size;
  if (ground) { scene.remove(ground, grid); ground.geometry.dispose(); grid.geometry.dispose(); }
  ground = new THREE.Mesh(new THREE.BoxGeometry(N, 0.4, N), mat(0xc9d1da, { roughness: 1 }));
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  grid = new THREE.GridHelper(N, N, 0xb3bdc8, 0xbac4ce);
  grid.position.y = 0.01;
  scene.add(ground, grid);
  scene.fog = new THREE.Fog(0xdde3e9, N * 1.8, N * 4 + 20);
  const s = N / 2 + 6;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: N * 3 + 40 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.position.set(N * 0.4, N + 10, N * 0.3);
  controls.maxDistance = N * 2.4 + 10;
  controls.target.set(0, 0, 0);
  camera.position.set(N * 0.66, N * 0.84 + 3, N * 0.74);
  controls.update();
}

// Schaufenster: eigene kleine Szene mit Sockel und Endprojekt, gerendert in das Panel rechts
const showScene = new THREE.Scene();
const showCam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
showScene.add(new THREE.HemisphereLight(0xdfeaff, 0x2a3140, 1.3));
const showSun = new THREE.DirectionalLight(0xffffff, 2.0);
showSun.position.set(4, 8, 6);
showScene.add(showSun);
const podium = new THREE.Group();
podium.add(part('cyl', mat(0x2c3a4a), 3.6, 0.3, 3.6, 0, 0.15, 0, false));
podium.add(part('cyl', mat(0xffb703, { emissive: 0xffb703, emissiveIntensity: 0.2 }), 3.2, 0.05, 3.2, 0, 0.32, 0, false));
showScene.add(podium);
const showPanel = document.getElementById('showcase');
showPanel.addEventListener('click', () => document.getElementById('right').classList.toggle('big'));

function renderShowcase() {
  const r = showPanel.getBoundingClientRect();
  if (r.width < 10 || r.height < 30) return;
  const y = innerHeight - r.bottom;
  // Kamera so weit zurück, dass Sockel (Radius ~1,8) und Endprojekt (Höhe h) ins Bild passen
  const aspect = r.width / r.height;
  const h = (showcase ? showcase.height : 1) + 0.36;
  const tanV = Math.tan(THREE.MathUtils.degToRad(showCam.fov / 2));
  const dist = Math.max((h / 2 + 0.7) / tanV, 2.3 / (tanV * aspect)) + 1;
  showCam.aspect = aspect;
  showCam.position.set(0, h / 2 + dist * 0.22, dist);
  showCam.lookAt(0, h / 2 - 0.1, 0);
  showCam.updateProjectionMatrix();
  renderer.setScissorTest(true);
  renderer.setScissor(r.left, y, r.width, r.height);
  renderer.setViewport(r.left, y, r.width, r.height);
  renderer.setClearColor(0x172030, 0.92);
  renderer.clear();
  renderer.render(showScene, showCam);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, innerWidth, innerHeight);
}

// ================================================================ Zustand
const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const secs = (ticks) => `${String(Number((ticks * TICK).toFixed(2))).replace('.', ',')} s`;
const itemName = (id) => ITEMS[id].name;
const bName = (k) => BUILDINGS[k].name;
const chip = (item, qty = '') => `<span class="chip"><span class="dot" style="background:${hex(ITEMS[item].color)}"></span>${qty}${itemName(item)}</span>`;

const params = new URLSearchParams(location.search);
const SAVE_PREFIX = 'absurd-industries.v2.';
const unlockAll = params.has('unlock');

let chapterId = null;
let content = null;
let factory = null;
let showcase = null;
let progress = null;     // { delivered, surplus, trashed, elapsed, started, finished, demo, tut }
let speed = 1;
let overlayOpen = false;
let meta = loadMeta();

function newProgress() {
  return { delivered: {}, surplus: 0, trashed: 0, elapsed: 0, started: false, finished: false, demo: false, tut: 0, eisen: content.chapter.budget,
    upgrades: { source: 0, machine: 0 } };
}

const hooks = {
  spawn(item, cell) {
    item.mesh = makeItem(item.type);
    item.mesh.position.copy(cellPos(cell.x, cell.z)).setY(0.62);
    itemLayer.add(item.mesh);
  },
  drop(item) { if (item.mesh) itemLayer.remove(item.mesh); },
  deliver(type) { deliver(type); },
  trash() { progress.trashed++; },
  store() { progress.eisen++; renderStock(); },
};

// ================================================================ Gebäude
function attachMesh(cell) {
  const mesh = makeBuilding(cell.kind, false, cell.tier || 0);
  mesh.position.copy(cellPos(cell.x, cell.z));
  mesh.rotation.y = -cell.dir * Math.PI / 2;
  cell.mesh = mesh;
  cell.anim = { spin: [], bob: [] };
  mesh.traverse(o => {
    if (o.name === 'spin') cell.anim.spin.push(o);
    if (o.name === 'bob') { o.userData.baseY = o.position.y; cell.anim.bob.push(o); }
  });
  scene.add(mesh);
}

function detachMesh(cell) {
  if (cell?.mesh) scene.remove(cell.mesh);
  if (cell?.filterMesh) scene.remove(cell.filterMesh);
}

// Was ein Gebäude insgesamt gekostet hat (inkl. Aufrüstungen) – so viel gibt es beim Abriss zurück
const totalCost = (c) => costOf(c.kind) + TIERS.slice(1, (c.tier || 0) + 1).reduce((s, t) => s + t.cost, 0);

function refreshMesh(cell) {
  detachMesh(cell);
  attachMesh(cell);
}

function upgradeCell(cell, { silent = false } = {}) {
  if (!cell) return false;
  if (!isUpgradable(cell.kind)) { if (!silent) toast('Dieses Gebäude lässt sich nicht aufrüsten', 1200); return false; }
  const next = (cell.tier || 0) + 1;
  if (next > content.maxTier || next >= TIERS.length) {
    if (!silent) toast(content.maxTier === 0 ? 'Aufrüsten gibt es erst ab der Industrialisierung' : `${TIERS[cell.tier].name} ist das Maximum dieser Epoche`, 1500);
    return false;
  }
  const cost = TIERS[next].cost;
  if (cost > progress.eisen) { noIron(cost); return false; }
  if (stroke) stroke.push({ type: 'tier', x: cell.x, z: cell.z, from: cell.tier || 0 });
  progress.eisen -= cost;
  cell.tier = next;
  refreshMesh(cell);
  renderStock();
  sfx.partDone();
  scheduleSave();
  return true;
}

function placeBuilding(kind, x, z, dir, { silent = false } = {}) {
  if (!factory.inBounds(x, z) || !content.buildings.includes(kind)) return null;
  const old = factory.at(x, z);
  if (old && old.kind === kind) {
    if (old.dir !== dir) { old.dir = dir; old.mesh.rotation.y = -dir * Math.PI / 2; scheduleSave(); }
    return old;
  }
  const price = costOf(kind) - (old ? totalCost(old) : 0);
  if (!silent && price > progress.eisen) { noIron(costOf(kind)); return null; }
  if (!silent && stroke) stroke.push({ type: 'place', kind, x, z, dir, old: old ? { kind: old.kind, dir: old.dir, filter: old.filter, tier: old.tier } : null });
  detachMesh(old);
  const cell = factory.place(kind, x, z, dir);
  attachMesh(cell);
  if (!silent) {
    progress.eisen -= price;
    renderStock();
    sfx.place();
    if (!progress.started) progress.started = true;
    scheduleSave();
    checkTutorial();
  }
  return cell;
}

function removeBuilding(x, z, { silent = false } = {}) {
  const cell = factory.remove(x, z);
  if (!cell) return;
  detachMesh(cell);
  if (!silent) {
    if (stroke) stroke.push({ type: 'remove', kind: cell.kind, x, z, dir: cell.dir, filter: cell.filter, tier: cell.tier });
    progress.eisen += totalCost(cell);
    renderStock();
    sfx.remove();
    scheduleSave();
  }
}

// Rückgängig: ein Strich (Maus gedrückt bis losgelassen) ist ein Schritt
let stroke = null;
let history = [];
function beginStroke() { stroke = []; }
function endStroke() {
  if (stroke && stroke.length) { history.push(stroke); if (history.length > 60) history.shift(); }
  stroke = null;
}
function restore(kind, x, z, dir, filter, tier) {
  const c = placeBuilding(kind, x, z, dir);
  if (!c) return;
  c.filter = filter ?? null;
  const extra = totalCost({ kind, tier: tier || 0 }) - costOf(kind);
  if (tier && extra <= progress.eisen) { c.tier = tier; progress.eisen -= extra; refreshMesh(c); renderStock(); }
}

function undo() {
  const last = history.pop();
  if (!last) { toast('Nichts zum Rückgängigmachen', 1200); return; }
  for (const a of [...last].reverse()) {
    if (a.type === 'tier') {
      const c = factory.at(a.x, a.z);
      if (c) { progress.eisen += totalCost(c); c.tier = a.from; progress.eisen -= totalCost(c); refreshMesh(c); renderStock(); }
    } else if (a.type === 'place') {
      removeBuilding(a.x, a.z);
      if (a.old) restore(a.old.kind, a.x, a.z, a.old.dir, a.old.filter, a.old.tier);
    } else {
      restore(a.kind, a.x, a.z, a.dir, a.filter, a.tier);
    }
  }
  toast('Rückgängig', 900);
}

function rotateCell(cell) {
  if (!cell || cell.kind === 'sink' || cell.kind === 'muelleimer') return;
  cell.dir = (cell.dir + 1) % 4;
  cell.mesh.rotation.y = -cell.dir * Math.PI / 2;
  scheduleSave();
}

function syncFilterMesh(cell) {
  if (cell.shownFilter === cell.filter) return;
  if (cell.filterMesh) scene.remove(cell.filterMesh);
  cell.filterMesh = null;
  cell.shownFilter = cell.filter;
  if (!cell.filter) return;
  const m = makeItem(cell.filter);
  m.scale.multiplyScalar(0.8);
  m.position.copy(cellPos(cell.x, cell.z)).setY(0.62);
  cell.filterMesh = m;
  scene.add(m);
}

// ================================================================ Fortschritt & Endprojekt
const partTotal = () => content.parts.reduce((s, p) => s + p.need, 0);
const partGot = () => content.parts.reduce((s, p) => s + Math.min(progress.delivered[p.item] || 0, p.need), 0);
const doneSet = () => new Set(content.parts.filter(p => (progress.delivered[p.item] || 0) >= p.need).map(p => p.item));
const starsFor = (seconds) => { const s = content.chapter.stars; return seconds <= s[0] ? 3 : seconds <= s[1] ? 2 : 1; };
const starHTML = (n) => '<span class="stars">' + '★'.repeat(n) + `<span class="off">${'★'.repeat(3 - n)}</span></span>`;

function deliver(type) {
  const need = content.parts.find(p => p.item === type).need;
  const have = progress.delivered[type] || 0;
  if (have >= need) { progress.surplus++; renderGoal(); return; }
  progress.delivered[type] = have + 1;
  if (progress.delivered[type] === need) {
    sfx.partDone();
    showcase.update(doneSet(), type);
    toast(`${itemName(type)} komplett!`, 1400);
  } else {
    sfx.deliver(partGot() / partTotal());
  }
  renderGoal();
  scheduleSave();
  if (!progress.finished && partGot() === partTotal()) finishChapter();
}

function finishChapter() {
  progress.finished = true;
  const seconds = progress.elapsed * TICK;
  const rec = meta.completed[chapterId] || { best: null, stars: 0 };
  let stars = 0;
  if (!progress.demo) {
    stars = starsFor(seconds);
    rec.stars = Math.max(rec.stars, stars);
    rec.best = rec.best === null ? seconds : Math.min(rec.best, seconds);
  }
  meta.completed[chapterId] = rec;
  saveMeta();
  save();
  sfx.finish();
  if (chapterId === 'ente') setTimeout(() => sfx.squeak(), 900);
  burstConfetti();
  toast(`${content.chapter.title} – geschafft!`, 2500);
  setTimeout(() => showOutro(seconds, stars), 2200);
}

const confetti = [];
function burstConfetti() {
  const colors = [0xffb703, 0xfb5607, 0xff006e, 0x8338ec, 0x3a86ff, 0x06d6a0];
  for (let i = 0; i < 90; i++) {
    const m = part('box', mat(colors[i % colors.length]), 0.12, 0.12, 0.12, 0, 0, 0, false);
    m.position.set(0, 3.2, 0);
    showScene.add(m);
    confetti.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 4, 3 + Math.random() * 4, (Math.random() - 0.5) * 4), life: 3 });
  }
}

function buildShowcase() {
  if (showcase) podium.remove(showcase.group);
  showcase = makeEndProject(chapterId);
  showcase.group.position.y = 0.36;
  podium.add(showcase.group);
  showcase.update(doneSet());
}

// ================================================================ Simulation & Animation
const ITEM_Y = { belt: 0.28, splitter: 0.32, sortierer: 0.34, bruecke: 0.72 };
const tmp = new THREE.Vector3();

const statSnaps = [];
function simTick() {
  factory.tick();
  if (factory.tickNo % 20 === 0) {
    statSnaps.push({ t: factory.tickNo, p: { ...factory.produced } });
    if (statSnaps.length > 30) statSnaps.shift();
  }
  if (progress.started && !progress.finished) progress.elapsed++;
  checkTutorial();
}

function syncItems(dt) {
  const k = 1 - Math.exp(-dt * 18);
  for (const c of factory.list) {
    const it = isCarrier(c.kind) ? c.item : c.out;
    if (it && it.mesh) {
      tmp.copy(cellPos(c.x, c.z)).setY(ITEM_Y[c.kind] ?? 0.62);
      it.mesh.position.lerp(tmp, k);
    }
    if (c.kind === 'sortierer') syncFilterMesh(c);
  }
}

function animate(dt, t) {
  for (const c of factory.list) {
    if (!isMachine(c.kind)) continue;
    const on = !!c.busy;
    if (on) for (const s of c.anim.spin) s.rotation[s.userData.axis || 'y'] += dt * 7;
    for (const b of c.anim.bob) b.position.y = b.userData.baseY + (on ? Math.max(0, Math.sin(t * 9 + c.x)) * 0.12 : 0);
  }
  if (showcase) {
    showcase.group.rotation.y += dt * (progress.finished ? 1.4 : 0.4);
    showcase.tick(dt);
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    const p = confetti[i];
    p.life -= dt;
    p.v.y -= 7 * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.rotation.x += dt * 5;
    p.m.rotation.z += dt * 4;
    if (p.life <= 0 || p.m.position.y < -2) { showScene.remove(p.m); confetti.splice(i, 1); }
  }
}

// ================================================================ Tutorial (Kapitel 1)
const has = (kind) => factory.list.some(c => c.kind === kind);
const made = (item) => (factory.produced[item] || 0) > 0;
const TUTORIAL = [
  { text: 'Wähle unten in der Bauleiste unter <b>Quellen</b> das <b>Weizenfeld</b> und setze es aufs Spielfeld.', done: () => has('weizenfeld') },
  { text: 'Wechsle zu <b>Maschinen</b> und baue eine <b>Mühle</b> ein paar Felder vor den weißen Pfeil des Weizenfelds.', done: () => has('muehle') },
  { text: 'Verbinde Feld und Mühle mit <b>Förderbändern</b> (Kategorie <b>Logistik</b>): Maustaste halten und ziehen. <b>R</b> dreht vor dem Bauen.', done: () => made('mehl') },
  { text: 'Die Mühle mahlt Mehl. Leite es mit Bändern in einen <b>Ofen</b> – der backt daraus Bauernbrot.', done: () => made('brot') },
  { text: 'Baue die <b>Endmontage</b> (Logistik) und bring das Brot dorthin. Rechts auf dem Sockel wächst dein Butterbrot.', done: () => (progress.delivered.brot || 0) > 0 },
  { text: 'Jetzt die Butter: <b>Kuhweide</b> → <b>Butterfass</b> → Endmontage. Das Butterfass braucht 2 Milch pro Butter.', done: () => made('butter') },
  { text: 'Liefere 4 Brote und 4 Butter. Tipp: <b>Q</b> kopiert das Gebäude unter der Maus, <b>B</b> öffnet das Rezeptbuch.', done: () => progress.finished },
];

function checkTutorial() {
  if (!content.chapter.tutorial || progress.tut >= TUTORIAL.length) return;
  let step = progress.tut;
  while (step < TUTORIAL.length && TUTORIAL[step].done()) step++;
  if (step !== progress.tut) {
    progress.tut = step;
    if (step < TUTORIAL.length) sfx.partDone();
    renderTutorial();
    scheduleSave();
  }
}

function renderTutorial() {
  const el = $('tutorial');
  if (!content.chapter.tutorial || progress.tut >= TUTORIAL.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="step">Schritt ${progress.tut + 1} von ${TUTORIAL.length}</div>${TUTORIAL[progress.tut].text}`;
}

// ================================================================ Werkzeuge & Eingabe
const TABS = [['logistik', 'Logistik'], ['quelle', 'Quellen'], ['maschine', 'Maschinen']];
let search = '';
let tab = 'logistik';
let tool = 'belt';
let buildDir = 0;
let hover = null;
let ghost = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

const tabTools = () => search
  ? content.buildings.filter(k => bName(k).toLowerCase().includes(search) ||
      (BUILDINGS[k].out && itemName(BUILDINGS[k].out).toLowerCase().includes(search)) ||
      (content.byMachine[k] || []).some(r => itemName(r.out).toLowerCase().includes(search)))
  : content.buildings.filter(k => BUILDINGS[k].cat === tab);

function setTool(t) {
  tool = t;
  if (BUILDINGS[t]) tab = BUILDINGS[t].cat;
  renderToolbar();
  makeGhost();
  renderInfo();
}

// ---------------------------------------------------------------- Blaupausen
// Werkzeug „Kopieren“: Rechteck aufziehen -> clipboard; Werkzeug „Einfügen“: Vorschau folgt der Maus, Klick baut alles
let clipboard = null;       // [{ kind, dx, dz, dir, filter, tier }]
let selStart = null;
const selBox = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), new THREE.MeshBasicMaterial({ color: 0x3fa9ff, transparent: true, opacity: 0.3, depthWrite: false }));
selBox.visible = false;
scene.add(selBox);

function showSelection(a, b) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z);
  selBox.scale.set(x1 - x0 + 1, 1, z1 - z0 + 1);
  selBox.position.copy(cellPos((x0 + x1) / 2, (z0 + z1) / 2)).setY(0.05);
  selBox.visible = true;
}

function copyArea(a, b) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z);
  const list = factory.list.filter(c => c.x >= x0 && c.x <= x1 && c.z >= z0 && c.z <= z1)
    .map(c => ({ kind: c.kind, dx: c.x - x0, dz: c.z - z0, dir: c.dir, filter: c.filter, tier: c.tier || 0 }));
  selBox.visible = false;
  if (!list.length) { toast('Nichts ausgewählt', 1000); return; }
  clipboard = list;
  toast(`${list.length} Gebäude kopiert – klicke zum Einfügen, R dreht`, 2200);
  setTool('paste');
}

function rotateClipboard() {
  if (!clipboard) return;
  const h = Math.max(...clipboard.map(c => c.dz));
  clipboard = clipboard.map(c => ({ ...c, dx: h - c.dz, dz: c.dx, dir: (c.dir + 1) % 4 }));
}

const blueprintCost = () => clipboard.reduce((sum, c) => sum + totalCost(c), 0);

function pasteAt(cell) {
  if (!clipboard) return;
  const cost = blueprintCost();
  const freed = clipboard.reduce((sum, c) => { const o = factory.at(cell.x + c.dx, cell.z + c.dz); return sum + (o ? totalCost(o) : 0); }, 0);
  if (cost - freed > progress.eisen) { noIron(cost - freed); return; }
  if (clipboard.some(c => !factory.inBounds(cell.x + c.dx, cell.z + c.dz))) { toast('Passt hier nicht aufs Feld', 1200); return; }
  for (const c of clipboard) restore(c.kind, cell.x + c.dx, cell.z + c.dz, c.dir, c.filter, Math.min(c.tier, content.maxTier));
}

function makeGhost() {
  if (ghost) scene.remove(ghost);
  if (tool === 'paste' && clipboard) {
    ghost = new THREE.Group();
    for (const c of clipboard) {
      const m = makeBuilding(c.kind, true);
      m.position.set(c.dx, 0, c.dz);
      m.rotation.y = -c.dir * Math.PI / 2;
      ghost.add(m);
    }
    ghost.visible = false;
    scene.add(ghost);
    updateGhost();
    return;
  }
  ghost = tool === 'erase' || tool === 'upgrade' || tool === 'copy'
    ? new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.3, 0.96), new THREE.MeshBasicMaterial({ color: tool === 'erase' ? 0xff4040 : 0x3fa9ff, transparent: true, opacity: 0.45 }))
    : makeBuilding(tool, true);
  ghost.visible = false;
  ghost.traverse(o => { o.castShadow = false; });
  scene.add(ghost);
  updateGhost();
}

function updateGhost() {
  if (!ghost) return;
  ghost.visible = !!hover && !overlayOpen;
  if (!hover) return;
  ghost.position.copy(cellPos(hover.x, hover.z));
  if (tool === 'erase' || tool === 'upgrade' || tool === 'copy') ghost.position.y = 0.15;
  else if (tool === 'paste') ghost.position.y = 0.02;
  else ghost.rotation.y = -buildDir * Math.PI / 2;
}

function pickCell(ev) {
  pointer.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectPlane(plane, hit)) return null;
  const x = Math.floor(hit.x + N / 2);
  const z = Math.floor(hit.z + N / 2);
  return factory.inBounds(x, z) ? { x, z } : null;
}

let painting = false;
let lastPaint = null;

function paint(cell, ev) {
  if (ev.shiftKey || tool === 'erase') { removeBuilding(cell.x, cell.z); lastPaint = cell; return; }
  if (tool === 'upgrade') { upgradeCell(factory.at(cell.x, cell.z)); lastPaint = cell; renderInfo(); return; }
  if ((tool === 'belt' || tool === 'bruecke') && lastPaint && (lastPaint.x !== cell.x || lastPaint.z !== cell.z)) {
    // Beim Ziehen zeigt das vorherige Band zum neuen
    const d = DIRS.findIndex(([ax, az]) => ax === cell.x - lastPaint.x && az === cell.z - lastPaint.z);
    if (d >= 0) {
      buildDir = d;
      const prev = factory.at(lastPaint.x, lastPaint.z);
      if (prev && prev.kind === tool && prev.dir !== d) { prev.dir = d; prev.mesh.rotation.y = -d * Math.PI / 2; }
    }
  }
  placeBuilding(tool, cell.x, cell.z, buildDir);
  lastPaint = cell;
  updateGhost();
}

const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', ev => {
  if (ev.button !== 0 || overlayOpen) return;
  const cell = pickCell(ev);
  if (!cell) return;
  if (tool === 'copy') { selStart = cell; showSelection(cell, cell); return; }
  if (tool === 'paste') { beginStroke(); pasteAt(cell); endStroke(); return; }
  painting = true;
  lastPaint = null;
  beginStroke();
  paint(cell, ev);
});
canvas.addEventListener('pointermove', ev => {
  const prev = hover;
  hover = pickCell(ev);
  updateGhost();
  if (!prev || !hover || prev.x !== hover.x || prev.z !== hover.z) renderInfo();
  if (selStart && hover) showSelection(selStart, hover);
  if (painting && hover && !(lastPaint && lastPaint.x === hover.x && lastPaint.z === hover.z)) paint(hover, ev);
});
canvas.addEventListener('pointerleave', () => { hover = null; updateGhost(); renderInfo(); });
addEventListener('pointerup', () => {
  if (selStart) { const end = hover || selStart; const a = selStart; selStart = null; copyArea(a, end); }
  painting = false; lastPaint = null; endStroke();
});
canvas.addEventListener('contextmenu', ev => ev.preventDefault());

const keys = new Set();
addEventListener('keydown', ev => {
  const k = ev.key.toLowerCase();
  if (ev.target instanceof HTMLInputElement) {
    if (k === 'escape' || k === 'enter') { ev.target.blur(); if (ev.target.id === 'search' && k === 'enter' && tabTools()[0]) setTool(tabTools()[0]); }
    return;
  }
  if (k === 'escape') { overlayOpen ? closeOverlayIfAllowed() : showMenu(); return; }
  if (k === '/' && !overlayOpen) { ev.preventDefault(); $('search').focus(); return; }
  if (k === 'h' && !ev.repeat) { if (overlayKind === 'help') closeOverlay(); else if (!overlayOpen) showHelp(); return; }
  if (k === 'b' && !ev.repeat) { if (overlayKind === 'book') closeOverlay(); else if (!overlayOpen) showBook(); return; }
  if (k === 'u' && !ev.repeat) { if (overlayKind === 'shop') closeOverlay(); else if (!overlayOpen) showShop(); return; }
  if (k === 'p' && !ev.repeat) { if (overlayKind === 'stats') closeOverlay(); else if (!overlayOpen) showStats(); return; }
  if (k === 'z' && (ev.ctrlKey || ev.metaKey) && !overlayOpen) { ev.preventDefault(); undo(); return; }
  if (overlayOpen || ev.repeat) return;
  const hovered = hover && factory.at(hover.x, hover.z);
  if (k === 'r' && tool === 'paste') {
    rotateClipboard();
    makeGhost();
  } else if (k === 'c' && !ev.ctrlKey && !ev.metaKey) {
    setTool('copy');
  } else if (k === 'v' && !ev.ctrlKey && !ev.metaKey) {
    if (clipboard) setTool('paste'); else toast('Erst mit C einen Bereich kopieren', 1400);
  } else if (k === 'r') {
    if (hovered) rotateCell(hovered);
    buildDir = (buildDir + 1) % 4;
    updateGhost();
    renderInfo();
  } else if (k === 'q') {
    if (hovered) { buildDir = hovered.dir; setTool(hovered.kind); }
  } else if (k === 'f') {
    if (hovered && hovered.kind === 'sortierer') cycleFilter(hovered, ev.shiftKey);
  } else if (k === ' ') {
    ev.preventDefault();
    setSpeed(speed === 0 ? 1 : 0);
  } else if (k === '0' || k === 'x') {
    setTool('erase');
  } else if (k === 'e') {
    if (content.maxTier > 0) setTool('upgrade'); else toast('Aufrüsten gibt es erst ab der Industrialisierung', 1500);
  } else if (/^[1-9]$/.test(k)) {
    const t = tabTools()[Number(k) - 1];
    if (t) setTool(t);
  } else if ('wasd'.includes(k) && k.length === 1) {
    keys.add(k);
  }
});
addEventListener('keyup', ev => keys.delete(ev.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

function cycleFilter(cell, reset) {
  if (reset) { cell.filter = null; toast('Sortierer lernt neu', 1200); scheduleSave(); renderInfo(); return; }
  const items = Object.keys(content.producer);
  const i = items.indexOf(cell.filter);
  cell.filter = items[(i + 1) % items.length];
  toast(`Filter: ${itemName(cell.filter)}`, 1200);
  scheduleSave();
  renderInfo();
}

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
  v.multiplyScalar((10 + N * 0.4) * dt);
  camera.position.add(v);
  controls.target.add(v);
}

function setSpeed(s) {
  speed = s;
  document.querySelectorAll('.speed').forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === s));
}

// ================================================================ HUD
function recipeLine(r) {
  const ins = Object.entries(r.in).map(([k, v]) => (v > 1 ? `${v}× ` : '') + itemName(k)).join(' + ');
  return `${ins} → <b>${r.n > 1 ? r.n + '× ' : ''}${itemName(r.out)}</b> <span class="st">(${secs(r.t)})</span>`;
}

let noIronAt = 0;
function noIron(cost) {
  if (performance.now() - noIronAt < 1500) return;
  noIronAt = performance.now();
  toast(`Zu wenig Eisen – braucht ${cost}, du hast ${progress.eisen}`, 1600);
}

function renderStock() {
  $('stock').textContent = progress.eisen;
  document.querySelectorAll('.tool[data-kind]').forEach(b => b.classList.toggle('poor', costOf(b.dataset.kind) > progress.eisen));
}

function describeKind(kind) {
  if (kind === 'upgrade') return upgradeInfo();
  if (kind === 'copy') return '<b>Kopieren</b><br>Ziehe ein Rechteck über Gebäude, um sie als Blaupause zu kopieren.';
  if (kind === 'paste') return `<b>Einfügen</b><br>Klicke, um die Blaupause (${clipboard ? clipboard.length : 0} Gebäude, ⛓ ${clipboard ? blueprintCost() : 0}) zu bauen. R dreht sie. Rückgängig mit Strg+Z.`;
  if (kind === 'erase') return '<b>Abriss</b><br>Klicke oder ziehe über Gebäude, um sie zu entfernen. Du bekommst das Eisen zurück.';
  return describeKindBase(kind) + `<br><span class="st">Kosten: ${costOf(kind)} Eisen</span>`;
}

function describeKindBase(kind) {
  const b = BUILDINGS[kind];
  if (b.cat === 'quelle') return `<b>${b.name}</b><br>Erzeugt ${itemName(b.out)} alle ${secs(b.ticks)}.`;
  if (isGenerator(kind)) return `<b>${b.name}</b><br>${b.fuel ? Object.keys(b.fuel).map(itemName).join(' + ') : 'Sonnenlicht'} → <b>⚡ ${b.supply} Energie</b><br><span class="st">${b.info}</span>`;
  if (b.cat === 'maschine') return `<b>${b.name}</b>${b.power ? ` <span class="st">⚡ ${b.power} Strom</span>` : ''}<br>${(content.byMachine[kind] || []).map(recipeLine).join('<br>')}`;
  return `<b>${b.name}</b><br>${b.info}`;
}

function upgradeInfo() {
  const lines = TIERS.slice(1, content.maxTier + 1).map(t => `${t.name}: ×${t.speed} Tempo, ⚡ ${t.power} Energie, ⛓ ${t.cost} Eisen`);
  return `<b>Aufrüsten</b><br>Klicke auf eine Quelle oder Maschine, um sie eine Stufe hochzurüsten.<br><span class="st">${lines.join('<br>')}</span>`;
}

function describeCell(c) {
  let html = describeKind(c.kind);
  if (isUpgradable(c.kind) && (content.maxTier > 0 || c.tier)) {
    const t = TIERS[c.tier || 0];
    const next = TIERS[(c.tier || 0) + 1];
    html += `<br><span class="st">Antrieb: ${t.name} (×${t.speed}${t.power ? `, ⚡ ${t.power}` : ''})` +
      (next && (c.tier || 0) < content.maxTier ? ` · E: ${next.name} für ⛓ ${next.cost}` : '') + '</span>';
  }
  if (isMachine(c.kind)) {
    const st = factory.status(c);
    const inv = Object.entries(c.inv).filter(([, v]) => v > 0).map(([k, v]) => `${v}× ${itemName(k)}`);
    if (isGenerator(c.kind)) html += `<br><span class="st ${st.state === 'busy' ? 'good' : st.state === 'waiting' ? 'bad' : ''}">${st.state === 'busy' ? 'liefert Energie' : st.state === 'waiting' ? 'braucht: ' + st.missing.map(itemName).join(', ') : 'bereit (kein Bedarf)'}</span>`;
    else if (st.state === 'lowpower') html += `<br><span class="st bad">zu wenig Strom – läuft mit ${Math.round(factory.power.ratio * 100)} %</span>`;
    else if (st.state === 'busy') html += `<br><span class="st good">arbeitet: ${itemName(st.recipe.out)} ${Math.round(st.progress * 100)} %</span>`;
    else if (st.state === 'blocked') html += '<br><span class="st bad">Ausgang blockiert – nichts nimmt das Produkt an</span>';
    else if (st.state === 'waiting') html += `<br><span class="st bad">wartet auf: ${st.missing.map(itemName).join(', ')}</span>`;
    else html += '<br><span class="st">wartet auf Zutaten</span>';
    if (inv.length && !isGenerator(c.kind)) html += `<br><span class="st">Lager: ${inv.join(', ')}</span>`;
  } else if (isSource(c.kind)) {
    if (factory.status(c).state === 'blocked') html += '<br><span class="st bad">Ausgang blockiert</span>';
  } else {
    if (c.item) html += `<br><span class="st">trägt: ${itemName(c.item.type)}</span>`;
    if (c.kind === 'sortierer') html += `<br><span class="st">Filter: ${c.filter ? itemName(c.filter) : 'lernt vom ersten Item'} · F ändern, Shift+F zurücksetzen</span>`;
  }
  return html;
}

let infoOverride = null;
function renderInfo() {
  const el = $('info');
  if (infoOverride) { el.innerHTML = describeKind(infoOverride); return; }
  const c = hover && factory.at(hover.x, hover.z);
  if (c) el.innerHTML = describeCell(c);
  else if (tool === 'erase') el.innerHTML = '<b>Abriss</b><br>Klicke oder ziehe über Gebäude, um sie zu entfernen.';
  else if (tool === 'upgrade') el.innerHTML = upgradeInfo();
  else el.innerHTML = describeKind(tool);
}

function toolTile(kind, i, { label, icon, cls = '', cost = null } = {}) {
  const b = document.createElement('button');
  const isB = !!BUILDINGS[kind];
  const c = cost ?? (isB ? costOf(kind) : null);
  b.className = 'tool ' + cls + (kind === tool ? ' active' : '') + (c !== null && c > progress.eisen ? ' poor' : '');
  if (isB) b.dataset.kind = kind;
  const img = isB ? thumb(kind) : '';
  b.innerHTML = (img ? `<img src="${img}" alt="">` : `<span class="ph">${icon || ''}</span>`) +
    `<span class="nm">${label || bName(kind)}</span>` + (c !== null ? `<span class="cost">⛓ ${c}</span>` : '<span class="cost">&nbsp;</span>') +
    (isB && content.isNew.has(kind) ? '<span class="new">NEU</span>' : '') + (i !== null && i < 9 ? `<kbd>${i + 1}</kbd>` : '');
  b.addEventListener('click', () => setTool(kind));
  b.addEventListener('mouseenter', () => { infoOverride = kind; renderInfo(); });
  b.addEventListener('mouseleave', () => { infoOverride = null; renderInfo(); });
  return b;
}

function renderToolbar() {
  infoOverride = null;
  const count = (cat) => content.buildings.filter(k => BUILDINGS[k].cat === cat).length;
  $('cats').innerHTML = TABS.map(([id, label]) => `<button data-tab="${id}" class="cat ${id === tab && !search ? 'active' : ''}">${label}<span class="n">${count(id)}</span></button>`).join('');
  $('cats').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; search = ''; $('search').value = ''; renderToolbar(); }));
  const el = $('tiles');
  el.innerHTML = '';
  const list = tabTools();
  list.forEach((kind, i) => el.appendChild(toolTile(kind, i)));
  if (!list.length) el.innerHTML = '<span class="sub" style="padding:18px 8px">Nichts gefunden.</span>';
  el.appendChild(toolTile('erase', null, { label: 'Abriss  (0)', icon: '✖', cls: 'sep' }));
  if (content.maxTier > 0) el.appendChild(toolTile('upgrade', null, { label: 'Aufrüsten (E)', icon: '⇧' }));
  el.appendChild(toolTile('copy', null, { label: 'Kopieren (C)', icon: '⧉' }));
  if (clipboard) el.appendChild(toolTile('paste', null, { label: `Einfügen (V)`, icon: '⎘', cost: blueprintCost() }));
  el.querySelectorAll('.ph').forEach((ph, i) => { ph.style.background = i === 0 ? 'rgba(255,64,64,.18)' : 'rgba(63,169,255,.18)'; ph.style.color = i === 0 ? '#ff8a7a' : '#8ecae6'; });
  const act = el.querySelector('.tool.active');
  if (act) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

$('search').addEventListener('input', (ev) => { search = ev.target.value.trim().toLowerCase(); renderToolbar(); });

function renderGoal() {
  $('goal-title').textContent = content.chapter.title;
  $('parts').innerHTML = content.parts.map(p => {
    const have = Math.min(progress.delivered[p.item] || 0, p.need);
    const ok = have >= p.need;
    return `<li class="${ok ? 'ok' : ''}" data-item="${p.item}" title="Im Rezeptbuch zeigen"><span class="dot" style="background:${hex(ITEMS[p.item].color)}"></span>` +
      `<span class="pn">${itemName(p.item)}</span><span class="pc">${ok ? '✓' : `${have}/${p.need}`}</span></li>`;
  }).join('');
  $('parts').querySelectorAll('li').forEach(li => li.addEventListener('click', () => showBook(li.dataset.item)));
  $('bar').firstElementChild.style.width = `${(partGot() / partTotal()) * 100}%`;
  const extra = [progress.surplus ? `Überschuss ${progress.surplus}` : '', progress.trashed ? `Müll ${progress.trashed}` : ''].filter(Boolean).join(' · ');
  $('surplus').textContent = extra;
  renderStarTarget();
}

function renderStarTarget() {
  const el = $('star-target');
  if (progress.demo) { el.textContent = 'Demo – ohne Wertung'; return; }
  const s = content.chapter.stars;
  const t = progress.elapsed * TICK;
  const stars = starsFor(t);
  el.innerHTML = `${starHTML(stars)} ${stars > 1 ? 'bis ' + fmtTime(s[3 - stars]) : ''}`;
}

let lastShownSecond = -1;
function renderPower() {
  const el = $('power');
  const on = content.buildings.some(isGenerator);
  el.style.display = on ? '' : 'none';
  if (!on) return;
  const { supply, demand } = factory.power;
  el.innerHTML = `⚡ <b>${supply}</b>/${demand}`;
  el.classList.toggle('bad', demand > supply);
}

function renderTime() {
  renderPower();
  const sec = Math.floor(progress.elapsed * TICK);
  if (sec === lastShownSecond) return;
  lastShownSecond = sec;
  $('time').textContent = fmtTime(sec);
  renderStarTarget();
}

let toastTimer = 0;
function toast(msg, ms = 2200) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ================================================================ Overlays
let overlayKind = null;
function openOverlay(kind, html, cls = '') {
  overlayKind = kind;
  overlayOpen = true;
  $('card').className = 'card ' + cls;
  $('card').innerHTML = html;
  $('overlay').classList.add('show');
  updateGhost();
}
function closeOverlay() {
  overlayKind = null;
  overlayOpen = false;
  $('overlay').classList.remove('show');
}
function closeOverlayIfAllowed() {
  if (overlayKind === 'menu' && !chapterId) return;
  closeOverlay();
}
$('overlay').addEventListener('click', ev => { if (ev.target === $('overlay') && ['book', 'help', 'stats', 'shop'].includes(overlayKind)) closeOverlay(); });
const bind = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };

function isUnlocked(id) {
  if (unlockAll) return true;
  const idx = CAMPAIGN.indexOf(id);
  if (idx === 0) return true;
  if (idx > 0) return !!meta.completed[CAMPAIGN[idx - 1]];
  return !!meta.completed[CAMPAIGN[0]]; // Bonus: nach dem ersten Kapitel
}

const ERA_ICONS = ['🔨', '🏭', '⚡', '🧪'];
let menuSel = null;

function showMenu() {
  const bonus = Object.keys(CHAPTERS).filter(id => CHAPTERS[id].bonus);
  if (!menuSel || !CHAPTERS[menuSel]) menuSel = chapterId || CAMPAIGN[0];
  const node = (id) => {
    const ch = CHAPTERS[id];
    const rec = meta.completed[id];
    const open = isUnlocked(id);
    const num = ch.bonus ? '★' : CAMPAIGN.indexOf(id) + 1;
    return `<button class="node${open ? '' : ' locked'}${rec ? ' done' : ''}${id === menuSel ? ' sel' : ''}" data-ch="${id}">
      <span class="num">${open ? num : '🔒'}</span>
      <span><span class="tt">${ch.short.replace('Bonus: ', '')}</span><br><span class="ss">${rec ? starHTML(rec.stars) : open ? '<span class="sub">neu</span>' : '<span class="sub">gesperrt</span>'}</span></span></button>`;
  };
  const cols = ERAS.map((era, e) => `<div class="era-col"><span class="ei">${ERA_ICONS[e]}</span><span class="en">Epoche ${e + 1}</span>
      <span class="et">${era.name}</span>${era.chapters.map(node).join('')}</div>`).join('');
  const total = Object.values(meta.completed).reduce((sum, r) => sum + (r.stars || 0), 0);
  openOverlay('menu', `
    <div class="menu-main">
      <p class="logo">ABSURD INDUSTRIES</p>
      <p class="sub">Das Sandwich-Imperium – vom Handwerk bis zum Chemielabor · <span class="stars">★</span> ${total} Sterne gesammelt</p>
      <div class="timeline">${cols}</div>
      <h3 class="era" style="margin-top:18px">Bonus</h3><div style="display:flex;gap:8px">${bonus.map(node).join('')}</div>
      <div class="actions" style="justify-content:space-between;align-items:center">
        <button class="linkish" id="reset-all">Gesamten Fortschritt löschen</button>
        ${chapterId ? '<button class="btn" id="menu-back">Zurück zum Spiel</button>' : ''}
      </div>
    </div>
    <aside class="menu-side" id="menu-side"></aside>`, 'menu');
  renderMenuSide();
  $('card').querySelectorAll('.node').forEach(b => {
    b.addEventListener('click', () => {
      menuSel = b.dataset.ch;
      $('card').querySelectorAll('.node').forEach(n => n.classList.toggle('sel', n === b));
      renderMenuSide();
    });
    b.addEventListener('dblclick', () => { if (isUnlocked(b.dataset.ch)) playChapter(b.dataset.ch); });
  });
  bind('menu-back', closeOverlay);
  bind('reset-all', () => {
    if (!confirm('Wirklich alle Spielstände und Sterne löschen?')) return;
    try { Object.keys(localStorage).filter(k => k.startsWith(SAVE_PREFIX)).forEach(k => localStorage.removeItem(k)); } catch { /* egal */ }
    meta = { completed: {} };
    chapterId = null;
    location.reload();
  });
}

function playChapter(id, fresh = false) {
  closeOverlay();
  if (fresh || id !== chapterId) loadChapter(id, { fresh });
  else if (!progress.started) showIntro();
}

function renderMenuSide() {
  const id = menuSel;
  const ch = CHAPTERS[id];
  const rec = meta.completed[id];
  const open = isUnlocked(id);
  const era = eraOf(id);
  const hasSave = !!loadSave(id)?.b?.length;
  $('menu-side').innerHTML = `
    <span class="sub">${ch.bonus ? 'Bonus-Kapitel' : `Kapitel ${CAMPAIGN.indexOf(id) + 1} · ${era.name}`}</span>
    <h2 style="margin:0">${ch.title.replace('Bonus: ', '')}</h2>
    <p style="font-size:13.5px">${ch.story}</p>
    <h3>Bestellung</h3>
    <div class="thumbs">${ch.parts.map(p => `<span><img src="${thumb(p.item, 'i')}" alt="">${p.need}× ${itemName(p.item)}</span>`).join('')}</div>
    <h3>Wertung</h3>
    <p style="font-size:13px">${rec ? `${starHTML(rec.stars)} ${rec.best !== null ? '· Bestzeit ' + fmtTime(rec.best) : '· mit Demo'}` : 'noch nicht geschafft'}<br>
      <span class="sub">★★★ bis ${fmtTime(ch.stars[0])} · ★★ bis ${fmtTime(ch.stars[1])}</span></p>
    <div class="grow"></div>
    ${open ? `<button class="btn primary" id="side-play">${id === chapterId ? 'Weiterspielen' : hasSave ? 'Fortsetzen' : 'Spielen'}</button>
      ${hasSave || id === chapterId ? '<button class="btn" id="side-fresh">Von vorn beginnen</button>' : ''}`
      : `<p class="sub">🔒 ${ch.bonus ? 'Wird nach Kapitel 1 freigeschaltet.' : 'Schließe erst das vorherige Kapitel ab.'}</p>`}`;
  bind('side-play', () => playChapter(id));
  bind('side-fresh', () => { if (confirm('Spielstand dieses Kapitels verwerfen und neu beginnen?')) playChapter(id, true); });
}

function showIntro() {
  const ch = content.chapter;
  const newOnes = [...content.isNew].map(k => `<span><img src="${thumb(k)}" alt="">${bName(k)}</span>`).join('');
  openOverlay('intro', `
    <p class="sub">${ch.bonus ? 'Bonus-Kapitel' : `Kapitel ${CAMPAIGN.indexOf(chapterId) + 1} von ${CAMPAIGN.length} · Epoche: ${content.era.name}`}</p>
    <h2>${ch.title}</h2>
    ${content.era && content.era.chapters[0] === chapterId ? `<p class="era-banner">Neue Epoche: <b>${content.era.name}</b> – ${content.era.intro}</p>` : ''}
    <p>${ch.story}</p>
    <h3>Bestellung</h3>
    <div class="thumbs">${ch.parts.map(p => `<span><img src="${thumb(p.item, 'i')}" alt="">${p.need}× ${itemName(p.item)}</span>`).join('')}</div>
    ${newOnes ? `<h3>Neu freigeschaltet</h3><div class="thumbs">${newOnes}</div>` : ''}
    <h3>Tipp</h3><p>${ch.tip}</p>
    <h3>Wertung (Spielzeit ab dem ersten Gebäude)</h3>
    <p>${starHTML(3)} bis ${fmtTime(ch.stars[0])} · ${starHTML(2)} bis ${fmtTime(ch.stars[1])} · ${starHTML(1)} immer</p>
    <div class="actions">
      <button class="btn" id="intro-book">Rezeptbuch</button>
      <button class="btn" id="intro-demo" title="Baut automatisch eine fertige Fabrik – ohne Wertung">Demo ansehen</button>
      <button class="btn primary" id="intro-go">Los geht's</button>
    </div>`);
  bind('intro-go', closeOverlay);
  bind('intro-book', () => showBook());
  bind('intro-demo', () => { closeOverlay(); runDemo(); });
}

function showOutro(seconds, stars) {
  if (overlayOpen && overlayKind !== 'book') return;
  const idx = CAMPAIGN.indexOf(chapterId);
  const next = idx >= 0 && idx < CAMPAIGN.length - 1 ? CAMPAIGN[idx + 1] : null;
  const rec = meta.completed[chapterId];
  const lines = {
    butterbrot: 'Ein Butterbrot. Vollautomatisch. Der Kunde weint vor Rührung.',
    kaesetoast: 'Der Käse schmilzt, die Hefe lebt, die Fabrik summt.',
    blt: 'Bacon, Lettuce, Tomato – und eine Mayo, auf die das Marketing stolz ist.',
    club: 'Drei Etagen und ein Zahnstocher. Der Club ist zufrieden.',
    weltrekord: 'Das Komitee misst nach. Weltrekord! Niemand weiß, wer das essen soll.',
    weltraum: 'Krümelfrei, vakuumiert, in Alufolie. Houston, wir haben ein Sandwich.',
    ente: 'QUIETSCH.',
  };
  openOverlay('outro', `
    <p class="sub center">Bestellung ausgeliefert</p>
    <h2 class="center">${content.chapter.title}</h2>
    <div class="bigstars">${progress.demo ? '<span class="stars"><span class="off">★★★</span></span>' : starHTML(stars)}</div>
    <p class="center">${progress.demo ? 'Mit der Demo gebaut – keine Wertung, aber das nächste Kapitel ist frei.' : `Spielzeit ${fmtTime(seconds)}${rec?.best !== null && rec?.best !== undefined ? ` · Bestzeit ${fmtTime(rec.best)}` : ''}`}</p>
    <p class="center" style="margin-top:8px">${lines[chapterId] || ''}</p>
    ${chapterId === 'weltraum' ? '<p class="center" style="margin-top:8px;color:var(--accent)">Du hast das Sandwich-Imperium vollendet – bis ins All. Probier das Bonus-Kapitel mit der Quietscheente!</p>' : ''}
    ${chapterId === 'weltrekord' ? '<p class="center" style="margin-top:8px;color:var(--accent)">Rekord gebrochen! Aber da oben auf der Raumstation knurrt schon der nächste Magen …</p>' : ''}
    <div class="actions" style="justify-content:center">
      <button class="btn" id="out-stay">Weiterbauen</button>
      <button class="btn" id="out-menu">Menü</button>
      ${next ? `<button class="btn primary" id="out-next">Nächstes Kapitel: ${CHAPTERS[next].short}</button>` : ''}
    </div>`);
  bind('out-stay', closeOverlay);
  bind('out-menu', showMenu);
  bind('out-next', () => { closeOverlay(); loadChapter(next); });
}

function treeHTML(item, qty = 1, depth = 0) {
  const p = content.producer[item];
  const q = qty > 1 ? `${qty}× ` : '';
  if (!p || depth > 12) return `<li>${chip(item, q)}</li>`;
  if (p.source) return `<li>${chip(item, q)} <span class="via">← <b>${bName(p.source)}</b></span></li>`;
  const r = p.recipe;
  const kids = Object.entries(r.in).map(([k, v]) => treeHTML(k, v, depth + 1)).join('');
  return `<li>${chip(item, q)} <span class="via">← <b>${bName(r.m)}</b>${r.n > 1 ? ` (macht ${r.n} Stück)` : ''}</span><ul>${kids}</ul></li>`;
}

let bookSel = null;
let bookFilter = '';

function showBook(focus = null) {
  if (focus) bookSel = focus;
  if (!bookSel || !content.producer[bookSel]) bookSel = content.parts[0].item;
  openOverlay('book', `
    <div class="book-list">
      <div class="bh"><h2 style="margin:0">Rezeptbuch</h2><span class="sub">${content.chapter.title}</span>
        <input id="book-search" placeholder="Item suchen …" value="${bookFilter}" autocomplete="off"></div>
      <div class="book-items" id="book-items"></div>
    </div>
    <div class="book-detail" id="book-detail"></div>`, 'book');
  $('book-search').addEventListener('input', ev => { bookFilter = ev.target.value.trim().toLowerCase(); renderBookList(); });
  renderBookList();
  renderBookDetail();
}

function renderBookList() {
  const parts = content.parts.map(p => p.item);
  const all = Object.keys(content.producer);
  const raw = all.filter(i => content.producer[i].source && !parts.includes(i));
  const mid = all.filter(i => !content.producer[i].source && !parts.includes(i));
  const f = (list) => list.filter(i => !bookFilter || itemName(i).toLowerCase().includes(bookFilter))
    .sort((a, b) => itemName(a).localeCompare(itemName(b), 'de'));
  const group = (title, list) => list.length ? `<h4>${title}</h4>` + list.map(i =>
    `<button class="bi${i === bookSel ? ' sel' : ''}" data-item="${i}"><img src="${thumb(i, 'i')}" alt="">${itemName(i)}</button>`).join('') : '';
  $('book-items').innerHTML = group('Bestellung', bookFilter ? f(parts) : parts) + group('Zwischenprodukte', f(mid)) + group('Rohstoffe', f(raw));
  $('book-items').querySelectorAll('.bi').forEach(b => b.addEventListener('click', () => { bookSel = b.dataset.item; renderBookList(); renderBookDetail(); }));
}

function ingButton(item, qty = 1) {
  return `<button class="ing" data-item="${item}"><img src="${thumb(item, 'i')}" alt="">${qty > 1 ? `<span class="q">${qty}×</span>` : ''}${itemName(item)}</button>`;
}

function renderBookDetail() {
  const item = bookSel;
  const p = content.producer[item];
  const part = content.parts.find(x => x.item === item);
  const usedIn = content.recipes.filter(r => r.in[item]);
  let how;
  if (p.source) {
    const b = BUILDINGS[p.source];
    how = `<div class="recipe-row"><span class="mach"><img src="${thumb(p.source)}" alt="">${b.name}</span><span class="arrow">→</span>${ingButton(item)}
      <span class="sub">Rohstoff, alle ${secs(b.ticks)}</span></div>`;
  } else {
    const r = p.recipe;
    const b = BUILDINGS[r.m];
    how = `<div class="recipe-row">${Object.entries(r.in).map(([k, v]) => ingButton(k, v)).join('<span class="arrow">+</span>')}
      <span class="arrow">→</span><span class="mach"><img src="${thumb(r.m)}" alt="">${b.name}${b.power ? `<span class="sub">⚡ ${b.power}</span>` : ''}</span>
      <span class="arrow">→</span>${ingButton(item, r.n)}<span class="sub">${secs(r.t)} pro Durchgang</span></div>`;
  }
  $('book-detail').innerHTML = `
    <div class="bd-head"><img src="${thumb(item, 'i')}" alt=""><div><h2 style="margin:0">${itemName(item)}</h2>
      <span class="sub">${part ? `Teil der Bestellung: ${Math.min(progress.delivered[item] || 0, part.need)} / ${part.need} geliefert` : p.source ? 'Rohstoff' : 'Zwischenprodukt'}</span></div></div>
    <h3>Herstellung</h3>${how}
    <h3>Wird verwendet für</h3>
    <div class="usedin">${usedIn.length ? usedIn.map(r => ingButton(r.out)).join('') : part ? '<span class="sub">Geht direkt in die Endmontage.</span>' : '<span class="sub">Nichts in diesem Kapitel.</span>'}</div>
    <h3>Kompletter Weg von den Rohstoffen</h3>
    <ul class="tree">${treeHTML(item)}</ul>`;
  $('book-detail').querySelectorAll('.ing').forEach(b => b.addEventListener('click', () => {
    if (!content.producer[b.dataset.item]) return;
    bookSel = b.dataset.item;
    renderBookList();
    renderBookDetail();
    $('book-detail').scrollTop = 0;
  }));
  const sel = $('book-items').querySelector('.bi.sel');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function showHelp() {
  const keys = [
    ['Linksklick', 'Bauen – bei Bändern gedrückt halten und ziehen'], ['R', 'Drehen (vor dem Bauen oder das Gebäude unter der Maus)'],
    ['Shift + Klick', 'Abreißen (Eisen kommt zurück)'], ['0', 'Werkzeug Abriss'], ['E', 'Werkzeug Aufrüsten (ab Industrialisierung)'],
    ['1 – 9', 'Gebäude der aktuellen Kategorie'], ['C / V', 'Bereich kopieren (Rechteck ziehen) / Blaupause einfügen, R dreht sie'], ['/', 'Gebäude suchen'], ['Q', 'Gebäude unter der Maus kopieren'],
    ['F / Shift+F', 'Sortierer-Filter wechseln / neu lernen'], ['Strg + Z', 'Letzten Strich rückgängig machen'],
    ['B', 'Rezeptbuch'], ['U', 'Werkstatt'], ['P', 'Produktion'], ['Leertaste', 'Pause'], ['Esc', 'Menü'],
    ['Rechte Maustaste', 'Kamera drehen'], ['WASD', 'Kamera verschieben'], ['Mausrad', 'Zoom'],
  ];
  openOverlay('help', `<h2>Steuerung</h2>
    <div class="keys">${keys.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join('')}</div>
    <h3>So funktioniert's</h3>
    <p>Quellen erzeugen Rohstoffe, Maschinen verarbeiten sie. Jedes Gebäude gibt in Richtung seines weißen Pfeils ab, Maschinen nehmen Zutaten von allen Seiten an.
    Bring alle Teile der Bestellung in eine Endmontage – rechts im Schaufenster wächst dein Sandwich.</p>
    <div class="actions"><button class="btn primary" id="help-close">Alles klar</button></div>`);
  bind('help-close', closeOverlay);
}

// ================================================================ Werkstatt
const UPGRADES = {
  source:  { name: 'Turbo-Quellen',  desc: 'Alle Quellen produzieren 25 % schneller.' },
  machine: { name: 'Turbo-Maschinen', desc: 'Alle Maschinen arbeiten 25 % schneller.' },
};
const UPGRADE_COSTS = [30, 60, 100];
const upgradeLevel = (k) => progress.upgrades?.[k] || 0;

function applyUpgrades() {
  progress.upgrades ||= { source: 0, machine: 0 };
  factory.speed.source = 1 + 0.25 * upgradeLevel('source');
  factory.speed.machine = 1 + 0.25 * upgradeLevel('machine');
}

function buyUpgrade(k) {
  const lvl = upgradeLevel(k);
  const cost = UPGRADE_COSTS[lvl];
  if (cost === undefined) return;
  if (progress.eisen < cost) { noIron(cost); return; }
  progress.eisen -= cost;
  progress.upgrades[k] = lvl + 1;
  applyUpgrades();
  renderStock();
  sfx.partDone();
  scheduleSave();
  showShop();
}

function showShop() {
  const rows = Object.entries(UPGRADES).map(([k, u]) => {
    const lvl = upgradeLevel(k);
    const cost = UPGRADE_COSTS[lvl];
    const pips = '●'.repeat(lvl) + '<span class="off">' + '●'.repeat(UPGRADE_COSTS.length - lvl) + '</span>';
    return `<div class="upgrade"><div><b>${u.name}</b> <span class="stars">${pips}</span><br><span class="sub">${u.desc} Aktuell: ${Math.round((1 + 0.25 * lvl) * 100)} %</span></div>
      ${cost === undefined ? '<span class="sub">Maximum</span>' : `<button class="btn ${progress.eisen >= cost ? 'primary' : ''}" data-up="${k}">⛓ ${cost} Eisen</button>`}</div>`;
  }).join('');
  openOverlay('shop', `
    <h2>Werkstatt</h2>
    <p class="sub">Upgrades gelten für dieses Kapitel und kosten Eisen aus deinem Baukonto (aktuell ⛓ ${progress.eisen}).</p>
    <div class="upgrades">${rows}</div>
    <div class="actions"><button class="btn primary" id="shop-close">Schließen <kbd>U</kbd></button></div>`);
  $('card').querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => buyUpgrade(b.dataset.up)));
  bind('shop-close', closeOverlay);
}

// ================================================================ Statistik
function showStats() {
  const now = { t: factory.tickNo, p: factory.produced };
  const ref = statSnaps.find(sn => now.t - sn.t <= 240) || statSnaps[0];
  const minutes = ref ? (now.t - ref.t) * TICK / 60 : 0;
  const rows = Object.entries(now.p).sort((a, b) => b[1] - a[1]).map(([item, total]) => {
    const rate = minutes > 0 ? (total - (ref.p[item] || 0)) / minutes : 0;
    const part = content.parts.find(p => p.item === item);
    return `<tr><td>${chip(item)}</td><td>${total}</td><td>${rate.toFixed(1).replace('.', ',')}</td><td>${part ? `${Math.min(progress.delivered[item] || 0, part.need)}/${part.need}` : ''}</td></tr>`;
  }).join('');
  const pw = content.buildings.some(isGenerator) ? `<p class="sub">Energie: ⚡ ${factory.power.supply} Angebot, ${factory.power.demand} Bedarf</p>` : '';
  openOverlay('stats', `
    <h2>Produktion</h2>
    <p class="sub">Hergestellte Items seit dem Laden des Kapitels, Rate über die letzte Minute Spielzeit.</p>${pw}
    ${rows ? `<table class="stats"><tr><th>Item</th><th>Gesamt</th><th>pro Minute</th><th>Bestellung</th></tr>${rows}</table>` : '<p style="margin-top:12px">Noch nichts produziert.</p>'}
    <div class="actions"><button class="btn primary" id="stats-close">Schließen <kbd>P</kbd></button></div>`);
  bind('stats-close', closeOverlay);
}

// ================================================================ Speichern
function loadMeta() {
  try { return JSON.parse(localStorage.getItem(SAVE_PREFIX + 'meta')) || { completed: {} }; } catch { return { completed: {} }; }
}
function saveMeta() {
  try { localStorage.setItem(SAVE_PREFIX + 'meta', JSON.stringify(meta)); } catch { /* Speichern ist optional */ }
}
let saveTimer = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 500);
}
function save() {
  if (!chapterId || !factory) return;
  try {
    const p = { ...progress };
    localStorage.setItem(SAVE_PREFIX + 'ch.' + chapterId, JSON.stringify({ b: factory.serialize(), p }));
    localStorage.setItem(SAVE_PREFIX + 'last', chapterId);
  } catch { /* Speichern ist optional */ }
}
function loadSave(id) {
  try { return JSON.parse(localStorage.getItem(SAVE_PREFIX + 'ch.' + id)); } catch { return null; }
}

// ================================================================ Kapitel
function loadChapter(id, { fresh = false } = {}) {
  if (chapterId) save();
  if (factory) { for (const c of [...factory.list]) detachMesh(c); factory.clear(); }
  itemLayer.clear();
  chapterId = id;
  content = chapterContent(id);
  buildWorld(content.chapter.grid);
  factory = new Factory(N, content, hooks);
  progress = newProgress();
  const saved = fresh ? null : loadSave(id);
  if (saved) {
    for (const [kind, x, z, dir, filter, tier] of saved.b || []) {
      const c = placeBuilding(kind, x, z, dir, { silent: true });
      if (c && filter !== undefined) c.filter = filter;
      if (c && tier) { c.tier = Math.min(tier, content.maxTier); refreshMesh(c); }
    }
    Object.assign(progress, saved.p || {});
  }
  applyUpgrades();
  history = [];
  statSnaps.length = 0;
  buildShowcase();
  tab = 'logistik';
  search = '';
  $('search').value = '';
  bookSel = null;
  tool = 'belt';
  buildDir = 0;
  $('chapter-title').textContent = content.chapter.title;
  document.title = `${content.chapter.short} – Absurd Industries`;
  lastShownSecond = -1;
  renderToolbar();
  makeGhost();
  renderGoal();
  renderTutorial();
  renderInfo();
  renderStock();
  if (!saved || !(saved.b || []).length) showIntro();
  else toast(`${content.chapter.title} – weiter geht's`);
}

function runDemo() {
  const plan = planChapter(content, N, BUILDINGS);
  if (!plan) { toast('Die Demo passt leider nicht aufs Feld.'); return; }
  if (factory.list.length && !params.has('demo') && !confirm('Die Demo reißt deine Fabrik in diesem Kapitel ab. Trotzdem starten?')) return;
  for (const c of [...factory.list]) removeBuilding(c.x, c.z, { silent: true });
  progress = newProgress();
  progress.started = true;
  progress.demo = true;
  progress.tut = TUTORIAL.length;
  applyUpgrades();
  history = [];
  for (const [kind, x, z, dir] of plan) placeBuilding(kind, x, z, dir, { silent: true });
  buildShowcase();
  renderStock();
  renderGoal();
  renderTutorial();
  scheduleSave();
  toast('Demo-Fabrik gebaut – schau zu!');
}

$('chapter-title').addEventListener('click', () => showIntro());
$('chapter-title').style.cursor = 'pointer';
$('chapter-title').title = 'Auftrag anzeigen';
bind('btn-menu', showMenu);
bind('btn-book', () => showBook());
bind('btn-shop', () => showShop());
bind('btn-stats', () => showStats());
bind('btn-help', () => showHelp());
bind('btn-mute', () => {
  sfx.setMuted(!sfx.isMuted());
  $('btn-mute').querySelector('.ic').textContent = sfx.isMuted() ? '🔇' : '🔊';
});
document.querySelectorAll('.speed').forEach(b => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
addEventListener('beforeunload', () => { save(); saveMeta(); });

// ================================================================ Loop
const clock = new THREE.Clock();
let acc = 0;
let infoTimer = 0;
let statsTimer = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (factory) {
    if (!overlayOpen || overlayKind === 'outro' || overlayKind === 'stats') {
      acc += dt * speed;
      let steps = 0;
      while (acc >= TICK && steps++ < 40) { acc -= TICK; simTick(); }
      if (steps >= 40) acc = 0;
    }
    syncItems(dt);
    animate(dt, clock.elapsedTime);
    panCamera(dt);
    renderTime();
    infoTimer += dt;
    if (infoTimer > 0.25 && hover) { infoTimer = 0; renderInfo(); }
    statsTimer += dt;
    if (statsTimer > 1 && overlayKind === 'stats') { statsTimer = 0; const sc = $('card').scrollTop; showStats(); $('card').scrollTop = sc; }
  }
  controls.update();
  renderer.render(scene, camera);
  renderShowcase();
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ================================================================ Start
const startId = params.get('chapter');
if (startId && CHAPTERS[startId]) {
  loadChapter(startId, { fresh: params.has('fresh') });
  if (params.has('demo')) { closeOverlay(); runDemo(); }
} else {
  let last = null;
  try { last = localStorage.getItem(SAVE_PREFIX + 'last'); } catch { /* egal */ }
  loadChapter(last && CHAPTERS[last] && isUnlocked(last) ? last : CAMPAIGN[0]);
  showMenu();
}
window.__game = {
  get factory() { return factory; },
  get progress() { return progress; },
  get chapter() { return chapterId; },
  loadChapter, runDemo, placeBuilding, simTick, showMenu, showBook,
  camera, controls,
  screenOf(x, z) { const v = cellPos(x, z).project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; },
};
frame();

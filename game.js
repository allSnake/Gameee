import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { ITEMS, BUILDINGS, CHAPTERS, CAMPAIGN, TICK, chapterContent } from './data.js';
import { Factory, DIRS, isCarrier, isMachine, isSource } from './sim.js';
import { planChapter } from './layout.js';
import { mat, part, makeItem, makeBuilding, makeEndProject } from './models.js';
import { sfx } from './audio.js';

// ================================================================ Szene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2430);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400);

const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 5;
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a3140, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
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
  ground = new THREE.Mesh(new THREE.BoxGeometry(N, 0.4, N), mat(0x33414f, { roughness: 0.95 }));
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  grid = new THREE.GridHelper(N, N, 0x5b6c7e, 0x445364);
  grid.position.y = 0.01;
  scene.add(ground, grid);
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
  return { delivered: {}, surplus: 0, trashed: 0, elapsed: 0, started: false, finished: false, demo: false, tut: 0 };
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
};

// ================================================================ Gebäude
function attachMesh(cell) {
  const mesh = makeBuilding(cell.kind);
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

function placeBuilding(kind, x, z, dir, { silent = false } = {}) {
  if (!factory.inBounds(x, z) || !content.buildings.includes(kind)) return null;
  const old = factory.at(x, z);
  if (old && old.kind === kind) {
    if (old.dir !== dir) { old.dir = dir; old.mesh.rotation.y = -dir * Math.PI / 2; scheduleSave(); }
    return old;
  }
  detachMesh(old);
  const cell = factory.place(kind, x, z, dir);
  attachMesh(cell);
  if (!silent) {
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
  if (!silent) { sfx.remove(); scheduleSave(); }
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

function simTick() {
  factory.tick();
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
  { text: 'Wähle links unter <b>Quellen</b> das <b>Weizenfeld</b> und setze es aufs Spielfeld.', done: () => has('weizenfeld') },
  { text: 'Wechsle zu <b>Maschinen</b> und baue eine <b>Mühle</b> ein paar Felder vor den weißen Pfeil des Weizenfelds.', done: () => has('muehle') },
  { text: 'Verbinde Feld und Mühle mit <b>Förderbändern</b> (Tab <b>Logistik</b>): Maustaste halten und ziehen. <b>R</b> dreht vor dem Bauen.', done: () => made('mehl') },
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
let tab = 'logistik';
let tool = 'belt';
let buildDir = 0;
let hover = null;
let ghost = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

const tabTools = () => content.buildings.filter(k => BUILDINGS[k].cat === tab);

function setTool(t) {
  tool = t;
  if (t !== 'erase') tab = BUILDINGS[t].cat;
  renderToolbar();
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
  ghost.visible = !!hover && !overlayOpen;
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
  return factory.inBounds(x, z) ? { x, z } : null;
}

let painting = false;
let lastPaint = null;

function paint(cell, ev) {
  if (ev.shiftKey || tool === 'erase') { removeBuilding(cell.x, cell.z); lastPaint = cell; return; }
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
  const k = ev.key.toLowerCase();
  if (k === 'escape') { overlayOpen ? closeOverlayIfAllowed() : showMenu(); return; }
  if (k === 'b' && !ev.repeat) { if (overlayKind === 'book') closeOverlay(); else if (!overlayOpen) showBook(); return; }
  if (overlayOpen || ev.repeat) return;
  const hovered = hover && factory.at(hover.x, hover.z);
  if (k === 'r') {
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

function describeKind(kind) {
  const b = BUILDINGS[kind];
  if (b.cat === 'quelle') return `<b>${b.name}</b><br>Erzeugt ${itemName(b.out)} alle ${secs(b.ticks)}.`;
  if (b.cat === 'maschine') return `<b>${b.name}</b><br>${(content.byMachine[kind] || []).map(recipeLine).join('<br>')}`;
  return `<b>${b.name}</b><br>${b.info}`;
}

function describeCell(c) {
  let html = describeKind(c.kind);
  if (isMachine(c.kind)) {
    const st = factory.status(c);
    const inv = Object.entries(c.inv).filter(([, v]) => v > 0).map(([k, v]) => `${v}× ${itemName(k)}`);
    if (st.state === 'busy') html += `<br><span class="st good">arbeitet: ${itemName(st.recipe.out)} ${Math.round(st.progress * 100)} %</span>`;
    else if (st.state === 'blocked') html += '<br><span class="st bad">Ausgang blockiert – nichts nimmt das Produkt an</span>';
    else if (st.state === 'waiting') html += `<br><span class="st bad">wartet auf: ${st.missing.map(itemName).join(', ')}</span>`;
    else html += '<br><span class="st">wartet auf Zutaten</span>';
    if (inv.length) html += `<br><span class="st">Lager: ${inv.join(', ')}</span>`;
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
  else el.innerHTML = describeKind(tool);
}

function renderToolbar() {
  infoOverride = null;
  $('tabs').innerHTML = TABS.map(([id, label]) => `<button data-tab="${id}" class="${id === tab ? 'active' : ''}">${label}</button>`).join('');
  $('tabs').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; renderToolbar(); }));
  const el = $('tools');
  el.innerHTML = '';
  tabTools().forEach((kind, i) => {
    const b = document.createElement('button');
    b.className = 'tool' + (kind === tool ? ' active' : '');
    b.innerHTML = `<span class="dot" style="background:${BUILDINGS[kind].color}"></span>${bName(kind)}` +
      (content.isNew.has(kind) ? ' <span class="new">NEU</span>' : '') + (i < 9 ? `<kbd>${i + 1}</kbd>` : '');
    b.addEventListener('click', () => setTool(kind));
    b.addEventListener('mouseenter', () => { infoOverride = kind; renderInfo(); });
    b.addEventListener('mouseleave', () => { infoOverride = null; renderInfo(); });
    el.appendChild(b);
  });
  const e = document.createElement('button');
  e.className = 'tool erase' + (tool === 'erase' ? ' active' : '');
  e.innerHTML = '<span class="dot" style="background:#ff4040"></span>Abriss<kbd>0</kbd>';
  e.addEventListener('click', () => setTool('erase'));
  el.appendChild(e);
}

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
function renderTime() {
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
function openOverlay(kind, html) {
  overlayKind = kind;
  overlayOpen = true;
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
$('overlay').addEventListener('click', ev => { if (ev.target === $('overlay') && overlayKind === 'book') closeOverlay(); });
const bind = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };

function isUnlocked(id) {
  if (unlockAll) return true;
  const idx = CAMPAIGN.indexOf(id);
  if (idx === 0) return true;
  if (idx > 0) return !!meta.completed[CAMPAIGN[idx - 1]];
  return !!meta.completed[CAMPAIGN[0]]; // Bonus: nach dem ersten Kapitel
}

function showMenu() {
  const cards = [...CAMPAIGN, ...Object.keys(CHAPTERS).filter(id => CHAPTERS[id].bonus)].map((id, i) => {
    const ch = CHAPTERS[id];
    const rec = meta.completed[id];
    const open = isUnlocked(id);
    const label = ch.bonus ? 'Bonus' : `Kapitel ${i + 1}`;
    const foot = rec ? `<span>${starHTML(rec.stars)}</span><span>${rec.best !== null ? 'Bestzeit ' + fmtTime(rec.best) : 'Demo'}</span>`
      : `<span>${open ? 'Neu' : '🔒 ' + (ch.bonus ? 'nach Kapitel 1' : 'erst vorheriges Kapitel')}</span><span></span>`;
    return `<button class="chapter${open ? '' : ' locked'}" data-ch="${id}" ${open ? '' : 'disabled'}>
      <span class="num">${label}${id === chapterId ? ' · aktuell' : ''}</span><span class="name">${ch.title.replace('Bonus: ', '')}</span>
      <span class="desc">${ch.story}</span><span class="foot">${foot}</span></button>`;
  }).join('');
  openOverlay('menu', `
    <p class="logo">ABSURD INDUSTRIES</p>
    <p class="sub">Das Sandwich-Imperium – vollautomatische Fabriken für völlig unnötige Sandwiches.</p>
    <div class="chapters">${cards}</div>
    <div class="actions" style="justify-content:space-between;align-items:center">
      <button class="linkish" id="reset-all">Gesamten Fortschritt löschen</button>
      ${chapterId ? '<button class="btn primary" id="menu-back">Weiterspielen</button>' : ''}
    </div>`);
  $('card').querySelectorAll('.chapter:not(.locked)').forEach(b => b.addEventListener('click', () => {
    closeOverlay();
    if (b.dataset.ch !== chapterId) loadChapter(b.dataset.ch);
    else if (!progress.started) showIntro();
  }));
  bind('menu-back', closeOverlay);
  bind('reset-all', () => {
    if (!confirm('Wirklich alle Spielstände und Sterne löschen?')) return;
    try { Object.keys(localStorage).filter(k => k.startsWith(SAVE_PREFIX)).forEach(k => localStorage.removeItem(k)); } catch { /* egal */ }
    meta = { completed: {} };
    chapterId = null;
    location.reload();
  });
}

function showIntro() {
  const ch = content.chapter;
  const newOnes = [...content.isNew].map(k => `<span class="chip"><span class="dot" style="background:${BUILDINGS[k].color}"></span>${bName(k)}</span>`).join('');
  openOverlay('intro', `
    <p class="sub">${ch.bonus ? 'Bonus-Kapitel' : `Kapitel ${CAMPAIGN.indexOf(chapterId) + 1} von ${CAMPAIGN.length}`}</p>
    <h2>${ch.title}</h2>
    <p>${ch.story}</p>
    <h3>Bestellung</h3>
    <div class="chips">${ch.parts.map(p => chip(p.item, `${p.need}× `)).join('')}</div>
    ${newOnes ? `<h3>Neu freigeschaltet</h3><div class="chips">${newOnes}</div>` : ''}
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
    ente: 'QUIETSCH.',
  };
  openOverlay('outro', `
    <p class="sub center">Bestellung ausgeliefert</p>
    <h2 class="center">${content.chapter.title}</h2>
    <div class="bigstars">${progress.demo ? '<span class="stars"><span class="off">★★★</span></span>' : starHTML(stars)}</div>
    <p class="center">${progress.demo ? 'Mit der Demo gebaut – keine Wertung, aber das nächste Kapitel ist frei.' : `Spielzeit ${fmtTime(seconds)}${rec?.best !== null && rec?.best !== undefined ? ` · Bestzeit ${fmtTime(rec.best)}` : ''}`}</p>
    <p class="center" style="margin-top:8px">${lines[chapterId] || ''}</p>
    ${chapterId === 'weltrekord' ? '<p class="center" style="margin-top:8px;color:var(--accent)">Du hast das Sandwich-Imperium vollendet. Probier das Bonus-Kapitel mit der Quietscheente!</p>' : ''}
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

function showBook(focus = null) {
  const parts = content.parts.map(p => `<div class="bookpart" id="book-${p.item}"><ul class="tree">${treeHTML(p.item)}</ul></div>`).join('');
  const machines = content.buildings.filter(k => BUILDINGS[k].cat === 'maschine')
    .map(k => `<div><b>${bName(k)}</b><br>${(content.byMachine[k] || []).map(recipeLine).join('<br>')}</div>`).join('');
  const sources = content.buildings.filter(k => BUILDINGS[k].cat === 'quelle')
    .map(k => `<div><b>${bName(k)}</b><br>${itemName(BUILDINGS[k].out)} alle ${secs(BUILDINGS[k].ticks)}</div>`).join('');
  openOverlay('book', `
    <h2>Rezeptbuch</h2>
    <p class="sub">So entsteht jedes Teil der Bestellung – von der Quelle bis zum fertigen Produkt. Jede Maschine nimmt ihre Zutaten von allen Seiten an und gibt nach vorn ab.</p>
    <h3>Bestellung: ${content.chapter.title}</h3>${parts}
    <h3>Maschinen</h3><div class="recipes">${machines}</div>
    <h3>Quellen</h3><div class="recipes">${sources}</div>
    <div class="actions"><button class="btn primary" id="book-close">Schließen <kbd>B</kbd></button></div>`);
  bind('book-close', closeOverlay);
  if (focus) {
    const el = $(`book-${focus}`);
    if (el) { el.classList.add('flash'); el.scrollIntoView({ block: 'center' }); }
  }
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
    for (const [kind, x, z, dir, filter] of saved.b || []) {
      const c = placeBuilding(kind, x, z, dir, { silent: true });
      if (c && filter !== undefined) c.filter = filter;
    }
    Object.assign(progress, saved.p || {});
  }
  buildShowcase();
  tab = 'logistik';
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
  if (!saved || !(saved.b || []).length) showIntro();
  else toast(`${content.chapter.title} – weiter geht's`);
}

function runDemo() {
  const plan = planChapter(content, N);
  if (!plan) { toast('Die Demo passt leider nicht aufs Feld.'); return; }
  if (factory.list.length && !params.has('demo') && !confirm('Die Demo reißt deine Fabrik in diesem Kapitel ab. Trotzdem starten?')) return;
  for (const c of [...factory.list]) removeBuilding(c.x, c.z, { silent: true });
  progress = newProgress();
  progress.started = true;
  progress.demo = true;
  progress.tut = TUTORIAL.length;
  for (const [kind, x, z, dir] of plan) placeBuilding(kind, x, z, dir, { silent: true });
  buildShowcase();
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
bind('btn-mute', () => {
  sfx.setMuted(!sfx.isMuted());
  $('btn-mute').textContent = sfx.isMuted() ? 'Ton aus' : 'Ton an';
});
document.querySelectorAll('.speed').forEach(b => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));
addEventListener('beforeunload', () => { save(); saveMeta(); });

// ================================================================ Loop
const clock = new THREE.Clock();
let acc = 0;
let infoTimer = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (factory) {
    if (!overlayOpen || overlayKind === 'outro') {
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

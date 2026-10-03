import * as THREE from 'three';
import { OrbitControls } from './vendor/three/OrbitControls.js';

// ---------------------------------------------------------------- Konfiguration
const N = 16;                 // Rastergröße
const TICK = 0.25;            // Sekunden pro Simulationsschritt
const TARGET = 8;             // Brote bis zum fertigen Sandwich
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // +x, +z, -x, -z

const TOOLS = {
  belt:  { name: 'Förderband', key: '1', color: '#4a5666' },
  farm:  { name: 'Weizenfarm', key: '2', color: '#7bb661' },
  mill:  { name: 'Mühle',      key: '3', color: '#b8b8c0' },
  oven:  { name: 'Ofen',       key: '4', color: '#d9534f' },
  sink:  { name: 'Endmontage', key: '5', color: '#ffb703' },
};
const RECIPES = {
  mill: { in: 'weizen', out: 'mehl', ticks: 4 },
  oven: { in: 'mehl',   out: 'brot', ticks: 6 },
};
const FARM_TICKS = 6;
const LAYER_COLORS = [0xe0a96d, 0xf6d55c, 0x6abf4b, 0xe04646, 0xe8a0a0, 0xf6d55c, 0x6abf4b, 0xe0a96d];

// ---------------------------------------------------------------- Szene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2430);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
camera.position.set(11, 14, 11);

const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 6;
controls.maxDistance = 40;
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a3140, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(8, 16, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(N, 0.4, N),
  new THREE.MeshStandardMaterial({ color: 0x33414f, roughness: 0.95 }));
ground.position.y = -0.2;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(N, N, 0x5b6c7e, 0x445364);
grid.position.y = 0.01;
scene.add(grid);

const cellPos = (x, z) => new THREE.Vector3(x - N / 2 + 0.5, 0, z - N / 2 + 0.5);
const inBounds = (x, z) => x >= 0 && z >= 0 && x < N && z < N;

// ---------------------------------------------------------------- Modelle
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts });
const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  cone: new THREE.ConeGeometry(0.5, 1, 4),
};

function part(g, material, sx, sy, sz, x, y, z, shadow = true) {
  const m = new THREE.Mesh(g, material);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function arrow(color = 0xffffff) {
  const a = part(geo.cone, mat(color, { emissive: color, emissiveIntensity: 0.25 }), 0.28, 0.32, 0.28, 0.3, 0.22, 0);
  a.rotation.z = -Math.PI / 2; // Spitze zeigt nach +x
  a.rotation.y = Math.PI / 4;
  return a;
}

function makeBuilding(kind, ghost = false) {
  const g = new THREE.Group();
  const m = (c, o) => mat(c, ghost ? { transparent: true, opacity: 0.55, ...o } : o);
  switch (kind) {
    case 'belt': {
      g.add(part(geo.box, m(0x3b4552), 0.94, 0.12, 0.94, 0, 0.06, 0));
      g.add(part(geo.box, m(0x5c6b7d), 0.9, 0.04, 0.5, 0, 0.14, 0, false));
      g.add(arrow(0xffd166));
      break;
    }
    case 'farm': {
      g.add(part(geo.box, m(0x6b4a2b), 0.94, 0.3, 0.94, 0, 0.15, 0));
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++)
          g.add(part(geo.cone, m(0xe9c46a), 0.14, 0.4, 0.14, i * 0.26 - 0.1, 0.5, j * 0.26, false));
      g.add(arrow(0xffffff));
      break;
    }
    case 'mill': {
      g.add(part(geo.box, m(0x9a9aa4), 0.9, 0.5, 0.9, 0, 0.25, 0));
      g.add(part(geo.cyl, m(0xd8d8de), 0.55, 0.55, 0.55, -0.05, 0.78, 0));
      const blades = part(geo.box, m(0x7a5230), 0.06, 0.9, 0.06, -0.05, 0.9, 0.3);
      blades.name = 'spin';
      g.add(blades);
      g.add(arrow(0xffffff));
      break;
    }
    case 'oven': {
      g.add(part(geo.box, m(0xb23a35), 0.92, 0.7, 0.92, 0, 0.35, 0));
      g.add(part(geo.box, m(0x22160f, { emissive: 0xff7b00, emissiveIntensity: ghost ? 0 : 0.8 }), 0.4, 0.28, 0.06, -0.1, 0.32, 0.47, false));
      g.add(part(geo.cyl, m(0x555a62), 0.2, 0.5, 0.2, -0.25, 0.95, -0.25));
      g.add(arrow(0xffffff));
      break;
    }
    case 'sink': {
      g.add(part(geo.box, m(0xf1c453), 0.96, 0.16, 0.96, 0, 0.08, 0));
      g.add(part(geo.box, m(0xd9a521), 0.8, 0.06, 0.8, 0, 0.19, 0, false));
      break;
    }
  }
  return g;
}

const itemGeo = {
  weizen: new THREE.ConeGeometry(0.14, 0.34, 6),
  mehl:   new THREE.BoxGeometry(0.3, 0.3, 0.3),
  brot:   new THREE.BoxGeometry(0.42, 0.26, 0.3),
};
const itemMat = {
  weizen: mat(0xe9c46a),
  mehl:   mat(0xf7f3e8),
  brot:   mat(0xc98a3d),
};
function makeItem(type) {
  const m = new THREE.Mesh(itemGeo[type], itemMat[type]);
  m.castShadow = true;
  return m;
}

// ---------------------------------------------------------------- Zustand
const cells = Array.from({ length: N * N }, () => null);
const at = (x, z) => (inBounds(x, z) ? cells[z * N + x] : null);

const sandwich = new THREE.Group();   // wächst auf der Endmontage
scene.add(sandwich);
let delivered = 0;
let finished = false;

const itemLayer = new THREE.Group();
scene.add(itemLayer);

function spawnItem(cell, type) {
  const mesh = makeItem(type);
  mesh.position.copy(cell.mesh.position).setY(0.4);
  itemLayer.add(mesh);
  return { type, mesh, stamp: -1 };
}

function dropItem(item) {
  if (item && item.mesh) itemLayer.remove(item.mesh);
}

function removeCell(x, z) {
  const c = at(x, z);
  if (!c) return;
  scene.remove(c.mesh);
  dropItem(c.item);
  dropItem(c.out);
  cells[z * N + x] = null;
  if (c.kind === 'sink') resetSandwich();
}

function placeCell(kind, x, z, dir) {
  if (!inBounds(x, z)) return null;
  const old = at(x, z);
  if (old && old.kind === kind) { old.dir = dir; applyDir(old); return old; }
  removeCell(x, z);
  const mesh = makeBuilding(kind);
  mesh.position.copy(cellPos(x, z));
  scene.add(mesh);
  const cell = { kind, x, z, dir, mesh, item: null, out: null, timer: 0 };
  applyDir(cell);
  cells[z * N + x] = cell;
  if (kind === 'sink') resetSandwich();
  return cell;
}

function applyDir(cell) {
  cell.mesh.rotation.y = -cell.dir * Math.PI / 2;
}

function clearAll() {
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) removeCell(x, z);
  resetSandwich();
}

// ---------------------------------------------------------------- Sandwich
function resetSandwich() {
  delivered = 0;
  finished = false;
  sandwich.clear();
  sandwich.rotation.y = 0;
  const sink = sinkCell();
  if (sink) sandwich.position.copy(sink.mesh.position);
  updateHud();
}

function sinkCell() {
  return cells.find(c => c && c.kind === 'sink');
}

function addLayer() {
  const sink = sinkCell();
  if (!sink) return;
  const i = delivered - 1;
  const isBread = i === 0 || i === TARGET - 1;
  const color = LAYER_COLORS[i % LAYER_COLORS.length];
  const h = isBread ? 0.14 : 0.07;
  const layer = part(geo.box, mat(color), isBread ? 0.72 : 0.78, h, isBread ? 0.72 : 0.78, 0, 0.26 + i * 0.1, 0);
  layer.userData = { pop: 0, baseY: h };
  sandwich.add(layer);
}

// ---------------------------------------------------------------- Simulation
function target(cell) {
  const [dx, dz] = DIRS[cell.dir];
  return at(cell.x + dx, cell.z + dz);
}

function accepts(dest, itemType, from) {
  switch (dest.kind) {
    case 'belt': {
      if (dest.item) return false;
      const [dx, dz] = DIRS[dest.dir];
      return !(dest.x + dx === from.x && dest.z + dz === from.z); // nicht gegen die Fahrtrichtung
    }
    case 'mill':
    case 'oven':
      return !dest.item && !dest.out && RECIPES[dest.kind].in === itemType;
    case 'sink':
      return itemType === 'brot' && delivered < TARGET;
    default:
      return false;
  }
}

function give(dest, item) {
  item.stamp = tickNo;
  if (dest.kind === 'sink') {
    dropItem(item);
    delivered++;
    addLayer();
    updateHud();
    if (delivered >= TARGET && !finished) {
      finished = true;
      toast('Sandwich fertig! 🥪');
    }
  } else if (dest.kind === 'belt') {
    dest.item = item;
  } else {
    dropItem(item);
    dest.item = { type: item.type, mesh: null, stamp: tickNo };
    dest.timer = 0;
  }
}

let tickNo = 0;
function tick() {
  tickNo++;

  // Maschinen produzieren
  for (const c of cells) {
    if (!c) continue;
    if (c.kind === 'farm' && !c.out) {
      if (++c.timer >= FARM_TICKS) { c.out = spawnItem(c, 'weizen'); c.timer = 0; }
    } else if ((c.kind === 'mill' || c.kind === 'oven') && c.item && !c.out) {
      const r = RECIPES[c.kind];
      if (++c.timer >= r.ticks) { c.item = null; c.out = spawnItem(c, r.out); c.timer = 0; }
    }
  }

  // Items weitertransportieren; mehrere Durchläufe, damit Schlangen sauber nachrücken
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const c of cells) {
      if (!c) continue;
      const slot = c.kind === 'belt' ? 'item' : c.kind === 'farm' || c.kind === 'mill' || c.kind === 'oven' ? 'out' : null;
      const item = slot && c[slot];
      if (!item || item.stamp === tickNo) continue;
      const dest = target(c);
      if (dest && accepts(dest, item.type, c)) {
        c[slot] = null;
        give(dest, item);
        moved = true;
      }
    }
    if (!moved) break;
  }
}

// Sichtbare Position der Items folgt den Zellen
function syncItems(dt) {
  const k = 1 - Math.exp(-dt * 18);
  for (const c of cells) {
    if (!c) continue;
    const it = c.kind === 'belt' ? c.item : c.out;
    if (it && it.mesh) it.mesh.position.lerp(c.mesh.position.clone().setY(c.kind === 'belt' ? 0.28 : 0.4), k);
  }
}

// ---------------------------------------------------------------- Eingabe
let tool = 'belt';
let buildDir = 0;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();
let hover = null;
let ghost = null;

function setTool(t) {
  tool = t;
  document.querySelectorAll('.tool').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  makeGhost();
}

function makeGhost() {
  if (ghost) scene.remove(ghost);
  ghost = null;
  if (tool === 'erase') {
    ghost = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.3, 0.96),
      new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.45 }));
  } else {
    ghost = makeBuilding(tool, true);
  }
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
  if (ev.shiftKey || tool === 'erase') { removeCell(cell.x, cell.z); return; }
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

renderer.domElement.addEventListener('pointerdown', ev => {
  if (ev.button !== 0) return;
  const cell = pickCell(ev);
  if (!cell) return;
  painting = true;
  lastPaint = null;
  paint(cell, ev);
});
renderer.domElement.addEventListener('pointermove', ev => {
  hover = pickCell(ev);
  updateGhost();
  if (painting && hover && !(lastPaint && lastPaint.x === hover.x && lastPaint.z === hover.z)) paint(hover, ev);
});
addEventListener('pointerup', () => { painting = false; lastPaint = null; });
renderer.domElement.addEventListener('contextmenu', ev => ev.preventDefault());

addEventListener('keydown', ev => {
  if (ev.key === 'r' || ev.key === 'R') {
    const c = hover && at(hover.x, hover.z);
    if (c && c.kind !== 'sink') { c.dir = (c.dir + 1) % 4; applyDir(c); }
    buildDir = (buildDir + 1) % 4;
    updateGhost();
    return;
  }
  const entry = Object.entries(TOOLS).find(([, t]) => t.key === ev.key);
  if (entry) setTool(entry[0]);
  if (ev.key === '0' || ev.key === 'x' || ev.key === 'X') setTool('erase');
});

// ---------------------------------------------------------------- HUD
const toolsEl = document.getElementById('tools');
for (const [id, t] of [...Object.entries(TOOLS), ['erase', { name: 'Abriss', key: '0', color: '#ff4040' }]]) {
  const b = document.createElement('button');
  b.className = 'tool';
  b.dataset.tool = id;
  b.innerHTML = `<span class="dot" style="background:${t.color}"></span>${t.name}<kbd>${t.key}</kbd>`;
  b.addEventListener('click', () => setTool(id));
  toolsEl.appendChild(b);
}
document.getElementById('target').textContent = TARGET;
document.getElementById('clear').addEventListener('click', clearAll);
document.getElementById('demo').addEventListener('click', loadDemo);

function updateHud() {
  document.getElementById('count').textContent = delivered;
  document.querySelector('#bar i').style.width = `${(delivered / TARGET) * 100}%`;
}

let toastTimer = 0;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function loadDemo() {
  clearAll();
  // Farm -> Band -> Mühle -> Band -> Ofen -> Band -> Montage (alles in einer Reihe, +x-Richtung)
  const z = 7;
  const line = [['farm', 2], ['belt', 3], ['belt', 4], ['mill', 5], ['belt', 6], ['belt', 7],
                ['oven', 8], ['belt', 9], ['belt', 10], ['sink', 11]];
  for (const [kind, x] of line) placeCell(kind, x, z, 0);
  // Zweite Farm, die von oben einspeist
  placeCell('farm', 3, 5, 1);
  placeCell('belt', 3, 6, 0);
  toast('Demo-Fabrik gebaut – schau zu!');
}

// ---------------------------------------------------------------- Loop
const clock = new THREE.Clock();
let acc = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  acc += dt;
  while (acc >= TICK) { acc -= TICK; tick(); }
  syncItems(dt);
  const t = clock.elapsedTime;
  for (const c of cells) {
    if (c && c.kind === 'mill') {
      const s = c.mesh.getObjectByName('spin');
      if (s) s.rotation.z = c.item ? t * 6 : s.rotation.z;
    }
  }
  for (const l of sandwich.children) {
    if (l.userData.pop < 1) {
      l.userData.pop = Math.min(1, l.userData.pop + dt * 5);
      l.scale.y = l.userData.baseY * (0.4 + 0.6 * l.userData.pop);
    }
  }
  if (finished) sandwich.rotation.y += dt * 1.5;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

setTool('belt');
updateHud();
if (new URLSearchParams(location.search).has('demo')) loadDemo();
window.__game = { cells, tick, loadDemo, get delivered() { return delivered; } };
frame();

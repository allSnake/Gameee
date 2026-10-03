import * as THREE from 'three';
import { ITEMS, BUILDINGS } from './data.js';

// Alle Modelle schauen bei Richtung 0 nach +x. Teile mit name 'spin' (userData.axis) oder 'bob'
// werden vom Spiel animiert, solange die Maschine arbeitet.

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...opts }));
  return matCache.get(key);
}

const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  cone: new THREE.ConeGeometry(0.5, 1, 14),
  sphere: new THREE.SphereGeometry(0.5, 16, 12),
};

export function part(shape, material, sx, sy, sz, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo[shape], material);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export function makeItem(type) {
  const d = ITEMS[type];
  const m = new THREE.Mesh(geo[d.shape], mat(d.color, d.t ? { transparent: true, opacity: 0.8 } : {}));
  m.scale.set(0.3 * d.s[0], 0.3 * d.s[1], 0.3 * d.s[2]);
  return m;
}

// ---------------------------------------------------------------- Baukasten
function kit(g, ghost) {
  const m = (c, o = {}) => mat(c, ghost ? { transparent: true, opacity: 0.55, ...o } : o);
  const add = (shape, c, sx, sy, sz, x, y, z, o = {}, shadow = true) => {
    const p = part(shape, m(c, o), sx, sy, sz, x, y, z, shadow);
    g.add(p);
    return p;
  };
  add.glow = (c) => ({ emissive: c, emissiveIntensity: ghost ? 0 : 0.8 });
  return add;
}

function arrow(add, x = 0.38, y = 0.2, color = 0xffffff, rotY = 0) {
  const holder = new THREE.Group();
  const a = part('cone', mat(color, { emissive: color, emissiveIntensity: 0.25 }), 0.26, 0.3, 0.26, x, y, 0, false);
  a.rotation.z = -Math.PI / 2;
  a.rotation.y = Math.PI / 4;
  holder.add(a);
  holder.rotation.y = rotY;
  return holder;
}

const named = (mesh, name, axis) => { mesh.name = name; if (axis) mesh.userData.axis = axis; return mesh; };

// ---------------------------------------------------------------- Logistik
function logisticsDecor(kind, g, add) {
  switch (kind) {
    case 'belt':
      add('box', 0x3b4552, 0.94, 0.12, 0.94, 0, 0.06, 0, {}, false);
      add('box', 0x5c6b7d, 0.9, 0.04, 0.5, 0, 0.14, 0, {}, false);
      g.add(arrow(add, 0.3, 0.22, 0xffd166));
      break;
    case 'splitter':
      add('box', 0x4a5666, 0.94, 0.14, 0.94, 0, 0.07, 0, {}, false);
      add('cyl', 0x7d8fa3, 0.5, 0.12, 0.5, 0, 0.18, 0);
      for (const r of [0, -Math.PI / 2, Math.PI / 2]) g.add(arrow(add, 0.34, 0.26, 0xffd166, r));
      break;
    case 'bruecke':
      add('box', 0x3b4552, 0.94, 0.1, 0.94, 0, 0.05, 0, {}, false);
      add('box', 0x8a5a33, 0.12, 0.5, 0.12, -0.3, 0.3, -0.36);
      add('box', 0x8a5a33, 0.12, 0.5, 0.12, -0.3, 0.3, 0.36);
      add('box', 0x8a5a33, 0.12, 0.5, 0.12, 0.3, 0.3, -0.36);
      add('box', 0x8a5a33, 0.12, 0.5, 0.12, 0.3, 0.3, 0.36);
      add('box', 0xc08552, 0.94, 0.08, 0.86, 0, 0.58, 0);
      g.add(arrow(add, 0.25, 0.68, 0xffd166));
      break;
    case 'sortierer':
      add('box', 0x2f6f7a, 0.94, 0.14, 0.94, 0, 0.07, 0, {}, false);
      add('cyl', 0x3fb6c8, 0.5, 0.14, 0.5, 0, 0.2, 0);
      g.add(arrow(add, 0.34, 0.26, 0xffd166));
      g.add(arrow(add, 0.34, 0.26, 0x3fd0ff, Math.PI / 2));
      break;
    case 'muelleimer':
      add('cyl', 0x5b5f68, 0.7, 0.6, 0.7, 0, 0.3, 0);
      add('cyl', 0x3b3f48, 0.76, 0.06, 0.76, 0, 0.63, 0);
      add('cyl', 0xd64545, 0.72, 0.08, 0.72, 0, 0.45, 0, {}, false);
      break;
    case 'sink':
      add('box', 0xf1c453, 0.96, 0.16, 0.96, 0, 0.08, 0);
      add('box', 0xd9a521, 0.8, 0.06, 0.8, 0, 0.19, 0, {}, false);
      add('cone', 0xffb703, 0.3, 0.3, 0.3, 0, 0.38, 0, add.glow(0xffb703));
      break;
  }
}

// ---------------------------------------------------------------- Quellen
function sourceDecor(kind, g, add) {
  const soil = () => add('box', 0x6b4a2b, 0.94, 0.26, 0.94, 0, 0.13, 0);
  const grass = () => add('box', 0x5c9e45, 0.94, 0.2, 0.94, 0, 0.1, 0);
  const wood = () => add('box', 0x8b5a2b, 0.94, 0.2, 0.94, 0, 0.1, 0);
  const rows = (fn) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) fn(i, j); };
  switch (kind) {
    case 'weizenfeld':
      soil(); rows((i, j) => add('cone', 0xe9c46a, 0.14, 0.4, 0.14, i * 0.24 - 0.08, 0.46, j * 0.26, {}, false));
      break;
    case 'kuhweide':
      grass();
      add('box', 0xf5f5f5, 0.55, 0.32, 0.36, -0.08, 0.4, 0);
      add('box', 0x222222, 0.2, 0.2, 0.38, -0.12, 0.48, 0, {}, false);
      add('box', 0xf5f5f5, 0.22, 0.24, 0.26, 0.28, 0.5, 0);
      add('box', 0xf3a6b8, 0.06, 0.12, 0.2, 0.4, 0.46, 0, {}, false);
      for (const [x, z] of [[-0.3, -0.12], [-0.3, 0.12], [0.12, -0.12], [0.12, 0.12]]) add('box', 0xf5f5f5, 0.07, 0.16, 0.07, x, 0.25, z, {}, false);
      break;
    case 'brunnen':
      add('box', 0x7d828c, 0.94, 0.12, 0.94, 0, 0.06, 0);
      add('cyl', 0x9aa0aa, 0.66, 0.36, 0.66, -0.06, 0.3, 0);
      add('cyl', 0x4aa3ff, 0.54, 0.04, 0.54, -0.06, 0.47, 0, { transparent: true, opacity: 0.85 }, false);
      add('box', 0x6b4423, 0.06, 0.6, 0.06, -0.06, 0.6, -0.34);
      add('box', 0x6b4423, 0.06, 0.6, 0.06, -0.06, 0.6, 0.34);
      add('cone', 0xb23a35, 0.8, 0.28, 0.9, -0.06, 1.0, 0);
      break;
    case 'zuckerruebenfeld':
      soil(); rows((i, j) => {
        add('sphere', 0xf0e2cf, 0.16, 0.14, 0.16, i * 0.27, 0.3, j * 0.27, {}, false);
        add('cone', 0x4f9a3a, 0.12, 0.22, 0.12, i * 0.27, 0.46, j * 0.27, {}, false);
      });
      break;
    case 'schweinestall':
      wood();
      add('box', 0xf3a6b8, 0.55, 0.32, 0.38, -0.08, 0.4, 0);
      add('box', 0xf3a6b8, 0.24, 0.26, 0.28, 0.26, 0.44, 0);
      add('box', 0xe58aa0, 0.08, 0.14, 0.18, 0.4, 0.42, 0, {}, false);
      add('cone', 0xe58aa0, 0.08, 0.1, 0.08, 0.24, 0.62, 0.1, {}, false);
      add('cone', 0xe58aa0, 0.08, 0.1, 0.08, 0.24, 0.62, -0.1, {}, false);
      break;
    case 'wald':
      soil();
      for (const [x, z, h] of [[-0.2, -0.2, 0.9], [0.18, -0.1, 0.7], [-0.05, 0.26, 0.8]]) {
        add('cyl', 0x6b4423, 0.12, 0.3, 0.12, x, 0.4, z);
        add('cone', 0x2f7d3a, 0.4, h, 0.4, x, 0.4 + h / 2, z);
      }
      break;
    case 'salatbeet':
      soil(); rows((i, j) => add('sphere', 0x6abf4b, 0.26, 0.2, 0.26, i * 0.28, 0.34, j * 0.28, {}, false));
      break;
    case 'gewaechshaus':
      soil();
      for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j++) add('sphere', 0xe04646, 0.18, 0.18, 0.18, i * 0.22, 0.36, j * 0.26, {}, false);
      add('box', 0xbfe9ff, 0.86, 0.45, 0.86, 0, 0.5, 0, { transparent: true, opacity: 0.32 }, false);
      break;
    case 'huehnerstall':
      grass();
      add('box', 0xb23a35, 0.46, 0.36, 0.5, -0.18, 0.38, 0);
      add('cone', 0x6b4423, 0.6, 0.3, 0.66, -0.18, 0.71, 0);
      add('sphere', 0xfafafa, 0.22, 0.2, 0.2, 0.22, 0.32, 0.12);
      add('cone', 0xd64545, 0.06, 0.08, 0.06, 0.26, 0.45, 0.12, {}, false);
      add('sphere', 0xfff4e0, 0.1, 0.13, 0.1, 0.24, 0.27, -0.18, {}, false);
      break;
    case 'rapsfeld':
      soil(); rows((i, j) => {
        add('cyl', 0x4f9a3a, 0.04, 0.3, 0.04, i * 0.26, 0.38, j * 0.26, {}, false);
        add('sphere', 0xf5d300, 0.18, 0.12, 0.18, i * 0.26, 0.55, j * 0.26, {}, false);
      });
      break;
    case 'haehnchenfarm':
      grass();
      for (const [x, z] of [[-0.22, -0.2], [0.12, 0.18], [-0.18, 0.22], [0.18, -0.2]]) {
        add('sphere', 0xfafafa, 0.2, 0.18, 0.18, x, 0.3, z);
        add('cone', 0xd64545, 0.05, 0.07, 0.05, x + 0.05, 0.42, z, {}, false);
      }
      add('box', 0xd9c49a, 0.94, 0.12, 0.06, 0, 0.3, -0.44, {}, false);
      add('box', 0xd9c49a, 0.94, 0.12, 0.06, 0, 0.3, 0.44, {}, false);
      break;
    case 'salzmine':
      add('box', 0x6f7480, 0.94, 0.3, 0.94, 0, 0.15, 0);
      add('box', 0x1d1f24, 0.1, 0.3, 0.36, -0.42, 0.42, 0);
      add('cone', 0x8b8f9a, 0.8, 0.5, 0.8, -0.12, 0.55, 0);
      for (const [x, z, s] of [[0.2, -0.22, 0.2], [0.25, 0.2, 0.16], [0.05, 0.3, 0.12]]) add('cone', 0xeeeaf6, s, s * 1.6, s, x, 0.3 + s * 0.8, z, {}, false);
      break;
    case 'apfelbaum':
      grass();
      add('cyl', 0x6b4423, 0.16, 0.6, 0.16, -0.05, 0.5, 0);
      add('sphere', 0x3f8f3a, 0.7, 0.55, 0.7, -0.05, 0.95, 0);
      for (const [x, y, z] of [[0.2, 0.9, 0.22], [-0.3, 0.85, 0.1], [0.05, 1.1, -0.28], [0.25, 1.05, -0.05]]) add('sphere', 0x8fcf3c, 0.11, 0.11, 0.11, x, y, z, {}, false);
      break;
    case 'gurkenbeet':
      soil();
      for (let i = -1; i <= 1; i++) {
        const c = add('cyl', 0x3f8f3a, 0.13, 0.5, 0.13, i * 0.25, 0.33, 0.05, {}, false);
        c.rotation.x = Math.PI / 2;
        add('sphere', 0x5aa845, 0.24, 0.1, 0.24, i * 0.25, 0.32, -0.28, {}, false);
      }
      break;
    case 'senffeld':
      soil(); rows((i, j) => {
        add('cyl', 0x4f9a3a, 0.04, 0.26, 0.04, i * 0.26, 0.36, j * 0.26, {}, false);
        add('cone', 0xe0b830, 0.14, 0.16, 0.14, i * 0.26, 0.55, j * 0.26, {}, false);
      });
      break;
    case 'kraeutergarten':
      soil(); rows((i, j) => add('cone', (i + j) % 2 ? 0x3f8f4a : 0x7a52a8, 0.16, 0.3, 0.16, i * 0.27, 0.4, j * 0.27, {}, false));
      break;
    case 'oelquelle':
      add('box', 0x2a2a33, 0.94, 0.2, 0.94, 0, 0.1, 0);
      add('cone', 0x555b66, 0.5, 1, 0.5, -0.1, 0.7, 0);
      add('cyl', 0x101014, 0.1, 0.5, 0.1, -0.1, 0.45, 0);
      add('sphere', 0x0a0a0d, 0.4, 0.1, 0.4, 0.22, 0.22, 0.2, { roughness: 0.2 }, false);
      break;
    case 'pigmentmine':
      add('box', 0x5a5f6a, 0.94, 0.2, 0.94, 0, 0.1, 0);
      add('cone', 0xff3fa4, 0.4, 0.4, 0.4, -0.18, 0.4, -0.12);
      add('cone', 0x3fc8ff, 0.34, 0.34, 0.34, 0.2, 0.37, 0.18);
      add('cone', 0xffe03f, 0.26, 0.26, 0.26, 0.2, 0.33, -0.26);
      break;
    case 'sandgrube':
      add('box', 0xcdb878, 0.94, 0.24, 0.94, 0, 0.12, 0);
      add('cone', 0xe6d29a, 0.7, 0.5, 0.7, -0.05, 0.44, 0);
      break;
    case 'gummibaum':
      soil();
      add('cyl', 0x3a3128, 0.14, 0.7, 0.14, -0.05, 0.6, 0);
      add('sphere', 0x4a5160, 0.6, 0.45, 0.6, -0.05, 1.0, 0);
      break;
  }
}

// ---------------------------------------------------------------- Maschinen
function machineDecor(kind, g, add) {
  const base = (c, h = 0.4) => add('box', c, 0.92, h, 0.92, 0, h / 2, 0);
  switch (kind) {
    case 'muehle':
      base(0x9a9aa4, 0.5);
      add('cyl', 0xd8d8de, 0.55, 0.55, 0.55, -0.05, 0.78, 0);
      named(add('box', 0x7a5230, 0.06, 0.9, 0.06, -0.05, 0.9, 0.3), 'spin', 'z');
      break;
    case 'ofen':
      base(0xb23a35, 0.7);
      add('box', 0x22160f, 0.4, 0.28, 0.06, -0.1, 0.32, 0.47, add.glow(0xff7b00), false);
      add('cyl', 0x555a62, 0.2, 0.5, 0.2, -0.25, 0.95, -0.25);
      break;
    case 'butterfass':
      add('box', 0x6b4423, 0.92, 0.12, 0.92, 0, 0.06, 0);
      add('cyl', 0xa0703c, 0.56, 0.66, 0.56, -0.05, 0.45, 0);
      add('cyl', 0x5a3a1a, 0.6, 0.05, 0.6, -0.05, 0.3, 0, {}, false);
      add('cyl', 0x5a3a1a, 0.6, 0.05, 0.6, -0.05, 0.62, 0, {}, false);
      named(add('cyl', 0xd8b98a, 0.06, 0.6, 0.06, -0.05, 0.95, 0), 'bob');
      break;
    case 'zuckerfabrik':
      base(0xe8e4f0, 0.55);
      add('box', 0xb8b4c4, 0.5, 0.2, 0.92, -0.2, 0.65, 0);
      add('cyl', 0x8b8f9a, 0.16, 0.6, 0.16, -0.28, 1.0, -0.28);
      named(add('box', 0xffffff, 0.2, 0.2, 0.2, 0.18, 0.7, 0.18), 'spin', 'y');
      break;
    case 'gaerfass': {
      add('box', 0x6b4423, 0.92, 0.12, 0.92, 0, 0.06, 0);
      const b = add('cyl', 0x7a5230, 0.62, 0.8, 0.62, -0.05, 0.45, 0);
      b.rotation.x = Math.PI / 2;
      add('cyl', 0x3a2a1a, 0.66, 0.05, 0.66, -0.05, 0.45, 0.3, {}, false).rotation.x = Math.PI / 2;
      add('cyl', 0x3a2a1a, 0.66, 0.05, 0.66, -0.05, 0.45, -0.3, {}, false).rotation.x = Math.PI / 2;
      named(add('sphere', 0xf3e7c0, 0.12, 0.12, 0.12, -0.05, 0.85, 0), 'bob');
      break;
    }
    case 'knetmaschine':
      base(0xa9aeb8, 0.35);
      add('cyl', 0xdfe3ea, 0.6, 0.3, 0.6, -0.05, 0.5, 0, { metalness: 0.5 });
      add('sphere', 0xf2dfb0, 0.42, 0.22, 0.42, -0.05, 0.64, 0, {}, false);
      add('box', 0x6e7380, 0.1, 0.6, 0.1, -0.38, 0.65, 0);
      named(add('box', 0x6e7380, 0.5, 0.06, 0.08, -0.05, 0.85, 0), 'spin', 'y');
      break;
    case 'schneider':
      base(0x7f93a6, 0.4);
      add('box', 0xdfe7ee, 0.7, 0.04, 0.5, 0, 0.42, 0, {}, false);
      named(add('box', 0xeef3f8, 0.06, 0.34, 0.6, -0.05, 0.62, 0, { metalness: 0.6 }), 'bob');
      add('box', 0x4a5866, 0.06, 0.6, 0.06, -0.05, 0.7, 0.36);
      add('box', 0x4a5866, 0.06, 0.6, 0.06, -0.05, 0.7, -0.36);
      break;
    case 'kaeserei':
      base(0xd9a521, 0.45);
      add('cyl', 0xf6d55c, 0.5, 0.2, 0.5, -0.12, 0.55, -0.15);
      add('cyl', 0xf6d55c, 0.4, 0.2, 0.4, -0.1, 0.75, -0.15);
      named(add('cyl', 0xf6d55c, 0.34, 0.16, 0.34, 0.05, 0.55, 0.25), 'spin', 'y');
      break;
    case 'metzgerei':
      base(0xe9eef2, 0.6);
      for (let i = 0; i < 4; i++) add('box', i % 2 ? 0xffffff : 0xd64545, 0.24, 0.06, 1.0, -0.36 + i * 0.24, 0.68, 0, {}, false);
      named(add('box', 0xcfd6dd, 0.06, 0.22, 0.3, 0.2, 0.85, 0, { metalness: 0.7 }), 'bob');
      add('box', 0x6b4423, 0.06, 0.16, 0.06, 0.2, 1.02, 0);
      break;
    case 'raeucherei':
      base(0x5a4030, 0.6);
      add('cone', 0x3a2a1a, 0.95, 0.4, 0.95, 0, 0.8, 0);
      add('box', 0x2a2018, 0.3, 0.3, 0.06, 0, 0.25, 0.47, add.glow(0xff7b00), false);
      named(add('sphere', 0xb8b8c0, 0.22, 0.22, 0.22, -0.15, 1.1, -0.1, { transparent: true, opacity: 0.7 }, false), 'bob');
      break;
    case 'waschanlage':
      add('box', 0x3f6f9a, 0.92, 0.12, 0.92, 0, 0.06, 0);
      add('box', 0x5fa8d3, 0.8, 0.4, 0.7, -0.04, 0.32, 0);
      add('box', 0x4aa3ff, 0.7, 0.04, 0.6, -0.04, 0.5, 0, { transparent: true, opacity: 0.8 }, false);
      add('box', 0x9aa0aa, 0.06, 0.5, 0.06, -0.38, 0.75, 0);
      named(add('cyl', 0xcfd6dd, 0.18, 0.06, 0.18, -0.2, 0.98, 0, { metalness: 0.6 }), 'spin', 'y');
      break;
    case 'oelpresse':
      base(0x6f8a3a, 0.4);
      named(add('cyl', 0xb8c27a, 0.3, 0.6, 0.3, -0.15, 0.7, 0, { metalness: 0.4 }), 'spin', 'y');
      add('cyl', 0xf2c94c, 0.3, 0.4, 0.3, 0.2, 0.6, 0.2, { transparent: true, opacity: 0.85 });
      break;
    case 'mixer':
      add('box', 0x6e7380, 0.92, 0.25, 0.92, 0, 0.12, 0);
      add('cyl', 0xaeb4c2, 0.7, 0.6, 0.7, 0, 0.55, 0, { metalness: 0.5 });
      add('cyl', 0x3b4048, 0.74, 0.08, 0.74, 0, 0.88, 0);
      named(add('box', 0xffd166, 0.5, 0.06, 0.08, 0, 0.95, 0, {}, false), 'spin', 'y');
      break;
    case 'grill':
      add('box', 0x2d2d33, 0.92, 0.4, 0.92, 0, 0.2, 0);
      add('box', 0x220a00, 0.8, 0.04, 0.8, 0, 0.42, 0, add.glow(0xff5a00), false);
      for (let i = -2; i <= 2; i++) add('box', 0x9aa0aa, 0.04, 0.03, 0.8, i * 0.15, 0.46, 0, {}, false);
      named(add('sphere', 0x2d2d33, 0.8, 0.4, 0.8, -0.05, 0.6, 0), 'bob');
      break;
    case 'saftpresse':
      base(0xd9741c, 0.4);
      add('cone', 0xf2a65a, 0.6, 0.4, 0.6, -0.1, 0.65, 0).rotation.x = Math.PI;
      named(add('cyl', 0x9aa0aa, 0.1, 0.5, 0.1, -0.1, 0.95, 0), 'bob');
      add('cyl', 0xf5c542, 0.26, 0.36, 0.26, 0.25, 0.58, 0.25, { transparent: true, opacity: 0.85 });
      break;
    case 'einmachstation':
      add('box', 0x6b4423, 0.92, 0.3, 0.92, 0, 0.15, 0);
      add('box', 0x8b5a2b, 0.9, 0.06, 0.5, 0, 0.6, -0.2);
      for (let i = -1; i <= 1; i++) {
        add('cyl', 0xcfeff5, 0.22, 0.32, 0.22, i * 0.28, 0.46, 0.2, { transparent: true, opacity: 0.5 }, false);
        add('cyl', 0x7aa83a, 0.14, 0.24, 0.14, i * 0.28, 0.44, 0.2, {}, false);
        add('cyl', 0xd64545, 0.24, 0.05, 0.24, i * 0.28, 0.64, 0.2, {}, false);
      }
      named(add('cyl', 0xcfeff5, 0.2, 0.3, 0.2, 0, 0.78, -0.2, { transparent: true, opacity: 0.5 }), 'bob');
      break;
    case 'schnitzerei': {
      add('box', 0xb07a45, 0.92, 0.4, 0.92, 0, 0.2, 0);
      const log = add('cyl', 0x8b5a2b, 0.22, 0.6, 0.22, -0.1, 0.52, 0.18);
      log.rotation.z = Math.PI / 2;
      const saw = named(add('cyl', 0xcfd6dd, 0.5, 0.03, 0.5, 0.1, 0.55, -0.15, { metalness: 0.7 }), 'spin', 'y');
      saw.rotation.x = Math.PI / 2;
      break;
    }
    case 'kochtopf':
      add('box', 0x3b3f48, 0.92, 0.35, 0.92, 0, 0.17, 0);
      add('cyl', 0x220a00, 0.7, 0.04, 0.7, 0, 0.37, 0, add.glow(0xff3300), false);
      add('cyl', 0xc0392b, 0.66, 0.42, 0.66, 0, 0.6, 0);
      add('cyl', 0xd6281f, 0.6, 0.02, 0.6, 0, 0.82, 0, {}, false);
      named(add('box', 0xd8b98a, 0.06, 0.6, 0.06, 0.12, 0.95, 0.1), 'spin', 'y');
      break;
    case 'papierfabrik':
      base(0x7f8c9a, 0.7);
      add('cyl', 0x5b6573, 0.2, 0.6, 0.2, -0.28, 1.0, -0.28);
      for (const x of [0.02, 0.28]) {
        const r = named(add('cyl', 0xdfe3ea, 0.22, 0.8, 0.22, x, 0.84, 0, { metalness: 0.4 }), 'spin', 'y');
        r.rotation.x = Math.PI / 2;
      }
      add('box', 0xfafafa, 0.5, 0.02, 0.8, 0.3, 0.72, 0, {}, false);
      break;
    case 'faltmaschine':
      base(0xb89a6a, 0.4);
      add('box', 0x8b6b3a, 0.8, 0.06, 0.8, 0, 0.43, 0, {}, false);
      named(add('box', 0xf2e6c9, 0.4, 0.3, 0.4, 0, 0.62, 0), 'bob');
      break;
    case 'raffinerie':
      add('box', 0x444a55, 0.92, 0.3, 0.92, 0, 0.15, 0);
      add('cyl', 0x8b919d, 0.3, 1.3, 0.3, -0.22, 0.85, -0.2, { metalness: 0.5 });
      add('cyl', 0x8b919d, 0.24, 1.0, 0.24, 0.1, 0.7, -0.22, { metalness: 0.5 });
      add('cyl', 0x6f7580, 0.34, 0.6, 0.34, -0.1, 0.6, 0.25);
      add('sphere', 0x331100, 0.12, 0.2, 0.12, -0.22, 1.55, -0.2, add.glow(0xff7b00), false);
      break;
    case 'formpresse':
      base(0xd9741c, 0.4);
      add('box', 0xffa94d, 0.5, 0.06, 0.5, 0, 0.42, 0, {}, false);
      add('box', 0x7a4210, 0.16, 0.7, 0.16, -0.3, 0.7, 0);
      add('box', 0x7a4210, 0.8, 0.14, 0.2, 0, 1.0, 0);
      named(add('box', 0xffd1a1, 0.4, 0.16, 0.4, 0, 0.72, 0), 'bob');
      break;
  }
}

export function makeBuilding(kind, ghost = false) {
  const g = new THREE.Group();
  const add = kit(g, ghost);
  const cat = BUILDINGS[kind].cat;
  if (cat === 'logistik') logisticsDecor(kind, g, add);
  else if (cat === 'quelle') { sourceDecor(kind, g, add); g.add(arrow(add)); }
  else { machineDecor(kind, g, add); g.add(arrow(add, 0.42)); }
  return g;
}

// ---------------------------------------------------------------- Endprojekte
// Schichten sind von Anfang an als Geist sichtbar und werden fest, sobald das Teil komplett ist.
const LAYERS = {
  bread:    (L) => { L.box(0.86, 0.22, 0.86, 0xc98a3d, 0.11); L.box(0.78, 0.02, 0.78, 0xe9c08a, 0.225); return 0.235; },
  toast:    (L) => { L.box(0.82, 0.14, 0.82, 0xb97a3d, 0.07); L.box(0.74, 0.146, 0.74, 0xf0d39c, 0.07); return 0.15; },
  spread:   (L, c) => { L.box(0.78, 0.03, 0.78, c, 0.015); return 0.03; },
  cheese:   (L) => { L.box(0.72, 0.05, 0.72, 0xf6d55c, 0.025, Math.PI / 4); return 0.05; },
  leaf:     (L) => { [0, 0.35, -0.35].forEach((r, i) => L.box(0.9, 0.025, 0.86, [0x6abf4b, 0x8fdc6a, 0x5aa845][i], 0.015 + i * 0.015, r)); return 0.06; },
  tomato:   (L) => { for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) L.cyl(0.36, 0.06, 0xe04646, 0.03, x, z); return 0.06; },
  bacon:    (L) => { for (const z of [-0.26, 0, 0.26]) { L.box(0.96, 0.035, 0.18, 0xc0504a, 0.02, 0, 0, z); L.box(0.96, 0.037, 0.05, 0xf3c6b8, 0.02, 0, 0, z); } return 0.045; },
  chicken:  (L) => { L.box(0.76, 0.1, 0.72, 0xb5763a, 0.05); for (let i = -2; i <= 2; i++) L.box(0.04, 0.102, 0.72, 0x5a3a1a, 0.05, 0, i * 0.14, 0); return 0.1; },
  pickle:   (L) => { for (const [x, z] of [[-0.25, -0.2], [0, -0.25], [0.25, -0.15], [-0.2, 0.2], [0.05, 0.15], [0.28, 0.25]]) L.cyl(0.18, 0.04, 0x7aa83a, 0.02, x, z); return 0.04; },
  sauce:    (L, c) => { L.cyl(0.72, 0.035, c, 0.0175); return 0.035; },
  sprinkle: (L) => { for (let i = 0; i < 18; i++) { const a = i * 2.4, r = 0.08 + (i % 6) * 0.055; L.box(0.05, 0.03, 0.05, i % 3 ? 0xd9822b : 0x3f8f4a, 0.015, a, Math.cos(a) * r, Math.sin(a) * r); } return 0.03; },
};

const SHOWCASES = {
  butterbrot: [['bread', 'brot'], ['spread', 'butter', 0xffe27a]],
  kaesetoast: [['toast', 'toastscheibe'], ['spread', 'butter', 0xffe27a], ['cheese', 'kaese'], ['cheese', 'kaese'], ['toast', 'toastscheibe']],
  blt: [['toast', 'toastscheibe'], ['sauce', 'mayo', 0xfff8dc], ['leaf', 'salat'], ['tomato', 'tomatenscheibe'], ['bacon', 'speck'], ['bacon', 'speck'], ['toast', 'toastscheibe']],
  club: [['toast', 'toastscheibe'], ['sauce', 'mayo', 0xfff8dc], ['leaf', 'salat'], ['chicken', 'grillhaehnchen'], ['toast', 'toastscheibe'],
    ['bacon', 'speck'], ['tomato', 'tomatenscheibe'], ['pickle', 'essiggurke'], ['toast', 'toastscheibe'], ['pick', 'zahnstocher']],
  weltrekord: [['toast', 'toastscheibe'], ['spread', 'butter', 0xffe27a], ['cheese', 'kaese'], ['leaf', 'salat'], ['bacon', 'speck'], ['tomato', 'tomatenscheibe'],
    ['toast', 'toastscheibe'], ['sauce', 'mayo', 0xfff8dc], ['chicken', 'grillhaehnchen'], ['pickle', 'essiggurke'], ['sauce', 'senf', 0xf2c230], ['toast', 'toastscheibe'],
    ['sauce', 'ketchup', 0xd6281f], ['cheese', 'kaese'], ['bacon', 'speck'], ['leaf', 'salat'], ['sprinkle', 'gewuerz'], ['toast', 'toastscheibe'],
    ['pick', 'zahnstocher'], ['box', 'sandwichbox']],
};

function layerMaterial(color, list) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, transparent: true, opacity: 0.12, depthWrite: false });
  list.push(m);
  return m;
}

function makeSandwich(spec) {
  const root = new THREE.Group();
  const layers = [];
  let y = 0;
  const extras = [];
  for (const [type, item, color] of spec) {
    if (type === 'pick' || type === 'box') { extras.push([type, item]); continue; }
    const g = new THREE.Group();
    const mats = [];
    const L = {
      box: (w, h, d, c, yc, rot = 0, x = 0, z = 0) => {
        const p = part('box', layerMaterial(c, mats), w, h, d, x, yc, z, false);
        p.rotation.y = rot;
        g.add(p);
      },
      cyl: (d, h, c, yc, x = 0, z = 0) => g.add(part('cyl', layerMaterial(c, mats), d, h, d, x, yc, z, false)),
    };
    const h = LAYERS[type](L, color);
    g.position.y = y;
    y += h + 0.005;
    root.add(g);
    layers.push({ item, g, mats, pop: 1 });
  }
  for (const [type, item] of extras) {
    const g = new THREE.Group();
    const mats = [];
    if (type === 'pick') {
      g.add(part('cyl', layerMaterial(0xe8d4a8, mats), 0.035, y + 0.25, 0.035, 0.1, (y + 0.25) / 2, 0.1, false));
      g.add(part('cone', layerMaterial(0xd64545, mats), 0.14, 0.16, 0.14, 0.1, y + 0.3, 0.1, false));
    } else {
      g.add(part('box', layerMaterial(0xf2e6c9, mats), 1.08, y + 0.2, 1.08, 0, (y + 0.2) / 2, 0, false));
      mats.forEach(m => { m.userData.boxed = true; });
    }
    root.add(g);
    layers.push({ item, g, mats, pop: 1 });
  }
  return { root, layers, height: y + (extras.length ? 0.35 : 0) };
}

function makeDuck() {
  const root = new THREE.Group();
  const layers = [];
  const add = (item, build) => {
    const g = new THREE.Group();
    const mats = [];
    build(g, (c) => layerMaterial(c, mats));
    root.add(g);
    layers.push({ item, g, mats, pop: 1 });
  };
  let bodyMats = null;
  add('koerper', (g, m) => {
    const bm = m(0xe8e8ec);
    bodyMats = bm;
    g.add(part('sphere', bm, 1.0, 0.75, 0.75, 0, 0.5, 0, false));
    const tail = part('cone', bm, 0.3, 0.4, 0.3, -0.5, 0.7, 0, false);
    tail.rotation.z = Math.PI / 2 + 0.5;
    g.add(tail);
  });
  let headMat = null;
  add('kopf', (g, m) => { headMat = m(0xe8e8ec); g.add(part('sphere', headMat, 0.5, 0.5, 0.5, 0.32, 1.0, 0, false)); });
  add('schnabel', (g, m) => g.add(part('box', m(0xff8c1a), 0.3, 0.1, 0.3, 0.6, 0.96, 0, false)));
  add('augen', (g, m) => { for (const z of [-0.12, 0.12]) g.add(part('sphere', m(0x15151a), 0.08, 0.08, 0.08, 0.5, 1.08, z, false)); });
  add('quietscher', (g, m) => g.add(part('cyl', m(0xb0b6c2), 0.16, 0.12, 0.16, 0, 0.06, 0, false)));
  add('farbe', () => {});
  add('lack', () => {});
  add('papier', (g, m) => {
    const w = m(0xffffff);
    w.userData.boxed = true;
    g.add(part('box', w, 1.25, 1.45, 1.0, 0, 0.72, 0, false));
  });
  return {
    root, layers, height: 1.3,
    paint(done) {
      for (const bm of [bodyMats, headMat]) {
        bm.color.setHex(done.has('farbe') ? 0xffd23f : 0xe8e8ec);
        bm.roughness = done.has('lack') ? 0.12 : 0.8;
        bm.emissive.setHex(done.has('lack') ? 0x332200 : 0x000000);
      }
    },
  };
}

// Liefert { group, update(doneSet, justDone?), tick(dt) }
export function makeEndProject(chapterId) {
  const s = chapterId === 'ente' ? makeDuck() : makeSandwich(SHOWCASES[chapterId]);
  const group = new THREE.Group();
  group.add(s.root);
  const scale = Math.min(2.6, 3.4 / Math.max(s.height, 0.6));
  group.scale.setScalar(scale);
  return {
    group,
    height: Math.max(s.height, 0.3) * scale + 0.4,
    update(done, justDone = null) {
      for (const l of s.layers) {
        const on = done.has(l.item);
        for (const m of l.mats) {
          m.opacity = on ? (m.userData.boxed ? 0.38 : 1) : (m.userData.boxed ? 0.05 : 0.12);
          m.depthWrite = on && !m.userData.boxed;
        }
        if (on && l.item === justDone) l.pop = 0;
      }
      if (s.paint) s.paint(done);
    },
    tick(dt) {
      for (const l of s.layers) {
        if (l.pop < 1) {
          l.pop = Math.min(1, l.pop + dt * 3);
          const k = 1 + Math.sin(l.pop * Math.PI) * 0.25;
          l.g.scale.set(k, 1, k);
        }
      }
    },
  };
}

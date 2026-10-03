import * as THREE from 'three';
import { ITEMS, SOURCES, MACHINES } from './data.js';

// Alle Modelle schauen bei Richtung 0 nach +x. Teile mit name 'spin' oder 'bob' werden vom Spiel animiert.

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

function arrow(x = 0.3, y = 0.22, color = 0xffffff) {
  const a = part('cone', mat(color, { emissive: color, emissiveIntensity: 0.25 }), 0.28, 0.32, 0.28, x, y, 0, false);
  a.rotation.z = -Math.PI / 2;
  a.rotation.y = Math.PI / 4;
  return a;
}


export function makeItem(type) {
  const d = ITEMS[type];
  const m = new THREE.Mesh(geo[d.shape], mat(d.color, type === 'glas' || type === 'lack' ? { transparent: true, opacity: 0.8 } : {}));
  m.scale.set(0.3 * d.s[0], 0.3 * d.s[1], 0.3 * d.s[2]);
  m.castShadow = true;
  return m;
}

// ---------------------------------------------------------------- Quellen
function sourceDecor(id, g, m) {
  const soil = () => g.add(part('box', m(0x6b4a2b), 0.94, 0.26, 0.94, 0, 0.13, 0));
  switch (id) {
    case 'weizenfeld':
      soil();
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++)
        g.add(part('cone', m(0xe9c46a), 0.14, 0.4, 0.14, i * 0.24 - 0.08, 0.46, j * 0.26, false));
      break;
    case 'kuhstall':
      g.add(part('box', m(0x8b5a2b), 0.94, 0.2, 0.94, 0, 0.1, 0));
      g.add(part('box', m(0xf5f5f5), 0.55, 0.32, 0.36, -0.08, 0.42, 0));
      g.add(part('box', m(0x222222), 0.2, 0.2, 0.38, -0.12, 0.5, 0, false));
      g.add(part('box', m(0xf5f5f5), 0.22, 0.24, 0.26, 0.28, 0.5, 0));
      g.add(part('box', m(0xf3a6b8), 0.06, 0.12, 0.2, 0.4, 0.46, 0, false));
      break;
    case 'salatbeet':
      soil();
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++)
        g.add(part('sphere', m(0x6abf4b), 0.26, 0.2, 0.26, i * 0.28, 0.34, j * 0.28, false));
      break;
    case 'gewaechshaus':
      soil();
      for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j++)
        g.add(part('sphere', m(0xe04646), 0.18, 0.18, 0.18, i * 0.22, 0.36, j * 0.26, false));
      g.add(part('box', m(0xbfe9ff, { transparent: true, opacity: 0.32 }), 0.86, 0.45, 0.86, 0, 0.5, 0, false));
      break;
    case 'schweinestall':
      g.add(part('box', m(0x8b5a2b), 0.94, 0.2, 0.94, 0, 0.1, 0));
      g.add(part('box', m(0xf3a6b8), 0.55, 0.32, 0.38, -0.08, 0.4, 0));
      g.add(part('box', m(0xf3a6b8), 0.24, 0.26, 0.28, 0.26, 0.44, 0));
      g.add(part('box', m(0xe58aa0), 0.08, 0.14, 0.18, 0.4, 0.42, 0, false));
      break;
    case 'kraeutergarten':
      soil();
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++)
        g.add(part('cone', m((i + j) % 2 ? 0x3f8f4a : 0x7a52a8), 0.16, 0.3, 0.16, i * 0.27, 0.4, j * 0.27, false));
      break;
    case 'wald':
      soil();
      for (const [x, z, h] of [[-0.2, -0.2, 0.9], [0.18, -0.1, 0.7], [-0.05, 0.26, 0.8]]) {
        g.add(part('cyl', m(0x6b4423), 0.12, 0.3, 0.12, x, 0.4, z));
        g.add(part('cone', m(0x2f7d3a), 0.4, h, 0.4, x, 0.4 + h / 2, z));
      }
      break;
    case 'oelquelle':
      g.add(part('box', m(0x2a2a33), 0.94, 0.2, 0.94, 0, 0.1, 0));
      g.add(part('cone', m(0x555b66), 0.5, 1, 0.5, -0.1, 0.7, 0));
      g.add(part('cyl', m(0x101014), 0.1, 0.5, 0.1, -0.1, 0.45, 0));
      g.add(part('sphere', m(0x0a0a0d, { roughness: 0.2 }), 0.4, 0.1, 0.4, 0.22, 0.22, 0.2, false));
      break;
    case 'pigmentmine':
      g.add(part('box', m(0x5a5f6a), 0.94, 0.2, 0.94, 0, 0.1, 0));
      g.add(part('cone', m(0xff3fa4), 0.4, 0.4, 0.4, -0.18, 0.4, -0.12));
      g.add(part('cone', m(0x3fc8ff), 0.34, 0.34, 0.34, 0.2, 0.37, 0.18));
      g.add(part('cone', m(0xffe03f), 0.26, 0.26, 0.26, 0.2, 0.33, -0.26));
      break;
    case 'sandgrube':
      g.add(part('box', m(0xcdb878), 0.94, 0.24, 0.94, 0, 0.12, 0));
      g.add(part('cone', m(0xe6d29a), 0.7, 0.5, 0.7, -0.05, 0.44, 0));
      break;
    case 'gummibaum':
      soil();
      g.add(part('cyl', m(0x3a3128), 0.14, 0.7, 0.14, -0.05, 0.6, 0));
      g.add(part('sphere', m(0x4a5160), 0.6, 0.45, 0.6, -0.05, 1.0, 0));
      break;
  }
}

// ---------------------------------------------------------------- Maschinen
function machineDecor(id, g, m, ghost) {
  const glow = ghost ? 0 : 0.8;
  switch (id) {
    case 'muehle': {
      g.add(part('box', m(0x9a9aa4), 0.9, 0.5, 0.9, 0, 0.25, 0));
      g.add(part('cyl', m(0xd8d8de), 0.55, 0.55, 0.55, -0.05, 0.78, 0));
      const b = part('box', m(0x7a5230), 0.06, 0.9, 0.06, -0.05, 0.9, 0.3);
      b.name = 'spin';
      g.add(b);
      break;
    }
    case 'ofen':
      g.add(part('box', m(0xb23a35), 0.92, 0.7, 0.92, 0, 0.35, 0));
      g.add(part('box', m(0x22160f, { emissive: 0xff7b00, emissiveIntensity: glow }), 0.4, 0.28, 0.06, -0.1, 0.32, 0.47, false));
      g.add(part('cyl', m(0x555a62), 0.2, 0.5, 0.2, -0.25, 0.95, -0.25));
      break;
    case 'schneider': {
      g.add(part('box', m(0x7f93a6), 0.92, 0.4, 0.92, 0, 0.2, 0));
      g.add(part('box', m(0xdfe7ee), 0.7, 0.04, 0.5, 0, 0.42, 0, false));
      const b = part('box', m(0xeef3f8, { metalness: 0.6 }), 0.06, 0.34, 0.6, -0.05, 0.62, 0);
      b.name = 'bob';
      g.add(b);
      g.add(part('box', m(0x4a5866), 0.06, 0.6, 0.06, -0.05, 0.7, 0.36));
      g.add(part('box', m(0x4a5866), 0.06, 0.6, 0.06, -0.05, 0.7, -0.36));
      break;
    }
    case 'kaeserei':
      g.add(part('box', m(0xd9a521), 0.92, 0.45, 0.92, 0, 0.22, 0));
      g.add(part('cyl', m(0xf6d55c), 0.5, 0.2, 0.5, -0.12, 0.55, -0.15));
      g.add(part('cyl', m(0xf6d55c), 0.4, 0.2, 0.4, -0.1, 0.75, -0.15));
      g.add(part('cyl', m(0xf6d55c), 0.34, 0.16, 0.34, 0.05, 0.55, 0.25));
      break;
    case 'presse': {
      g.add(part('box', m(0x3f5a82), 0.92, 0.35, 0.92, 0, 0.18, 0));
      g.add(part('box', m(0x2c3f5c), 0.1, 0.9, 0.1, -0.38, 0.6, -0.38));
      g.add(part('box', m(0x2c3f5c), 0.1, 0.9, 0.1, -0.38, 0.6, 0.38));
      g.add(part('box', m(0x2c3f5c), 0.1, 0.9, 0.1, 0.38, 0.6, -0.38));
      g.add(part('box', m(0x2c3f5c), 0.1, 0.9, 0.1, 0.38, 0.6, 0.38));
      const p = part('box', m(0xaab4c2, { metalness: 0.6 }), 0.6, 0.18, 0.6, 0, 0.8, 0);
      p.name = 'bob';
      g.add(p);
      break;
    }
    case 'mixer': {
      g.add(part('box', m(0x6e7380), 0.92, 0.25, 0.92, 0, 0.12, 0));
      g.add(part('cyl', m(0xaeb4c2, { metalness: 0.5 }), 0.7, 0.6, 0.7, 0, 0.55, 0));
      g.add(part('cyl', m(0x3b4048), 0.74, 0.08, 0.74, 0, 0.88, 0));
      const s = part('box', m(0xffd166), 0.5, 0.06, 0.08, 0, 0.95, 0, false);
      s.name = 'spin';
      s.userData.axis = 'y';
      g.add(s);
      break;
    }
    case 'raffinerie':
      g.add(part('box', m(0x444a55), 0.92, 0.3, 0.92, 0, 0.15, 0));
      g.add(part('cyl', m(0x8b919d, { metalness: 0.5 }), 0.3, 1.3, 0.3, -0.22, 0.85, -0.2));
      g.add(part('cyl', m(0x8b919d, { metalness: 0.5 }), 0.24, 1.0, 0.24, 0.1, 0.7, -0.22));
      g.add(part('cyl', m(0x6f7580), 0.34, 0.6, 0.34, -0.1, 0.6, 0.25));
      g.add(part('sphere', m(0x331100, { emissive: 0xff7b00, emissiveIntensity: glow }), 0.12, 0.2, 0.12, -0.22, 1.55, -0.2, false));
      break;
    case 'formpresse': {
      g.add(part('box', m(0xd9741c), 0.92, 0.4, 0.92, 0, 0.2, 0));
      g.add(part('box', m(0xffa94d), 0.5, 0.06, 0.5, 0, 0.42, 0, false));
      g.add(part('box', m(0x7a4210), 0.16, 0.7, 0.16, -0.3, 0.7, 0));
      g.add(part('box', m(0x7a4210), 0.8, 0.14, 0.2, 0, 1.0, 0));
      const p = part('box', m(0xffd1a1), 0.4, 0.16, 0.4, 0, 0.72, 0);
      p.name = 'bob';
      g.add(p);
      break;
    }
  }
}

export function makeBuilding(kind, ghost = false) {
  const g = new THREE.Group();
  const m = (c, o = {}) => mat(c, ghost ? { transparent: true, opacity: 0.55, ...o } : o);
  if (kind === 'belt') {
    g.add(part('box', m(0x3b4552), 0.94, 0.12, 0.94, 0, 0.06, 0));
    g.add(part('box', m(0x5c6b7d), 0.9, 0.04, 0.5, 0, 0.14, 0, false));
    g.add(arrow(0.3, 0.22, 0xffd166));
  } else if (kind === 'splitter') {
    g.add(part('box', m(0x4a5666), 0.94, 0.14, 0.94, 0, 0.07, 0));
    g.add(part('cyl', m(0x7d8fa3), 0.5, 0.12, 0.5, 0, 0.18, 0));
    for (let i = 0; i < 3; i++) {
      const a = arrow(0.34, 0.26, 0xffd166);
      const holder = new THREE.Group();
      holder.add(a);
      holder.rotation.y = [0, -Math.PI / 2, Math.PI / 2][i];
      g.add(holder);
    }
  } else if (kind === 'sink') {
    g.add(part('box', m(0xf1c453), 0.96, 0.16, 0.96, 0, 0.08, 0));
    g.add(part('box', m(0xd9a521), 0.8, 0.06, 0.8, 0, 0.19, 0, false));
  } else if (SOURCES[kind]) {
    sourceDecor(kind, g, m);
    g.add(arrow(0.38, 0.2));
  } else if (MACHINES[kind]) {
    machineDecor(kind, g, m, ghost);
    g.add(arrow(0.4, 0.2));
  }
  return g;
}

// ---------------------------------------------------------------- Endprojekte
// Liefert eine Gruppe und setPartsDone(Set), die das Modell passend zum Fortschritt aufbaut.
export function makeEndProject(chapterId) {
  return chapterId === 'ente' ? makeDuck() : makeSandwich();
}

function makeSandwich() {
  const root = new THREE.Group();
  const stack = new THREE.Group();
  root.add(stack);
  const wrapper = part('box', mat(0xffffff, { transparent: true, opacity: 0.28, roughness: 0.2 }), 0.98, 1, 0.98, 0, 0, 0, false);
  wrapper.visible = false;
  root.add(wrapper);
  const layers = [
    ['brot',           0xd9a45a, 0.74, 0.14],
    ['kaese',          0xf6d55c, 0.8,  0.06],
    ['salat',          0x7fd35a, 0.84, 0.05],
    ['tomatenscheibe', 0xe85048, 0.7,  0.07],
    ['wurst',          0xb85a52, 0.76, 0.06],
    ['sosse',          0xd23f2c, 0.6,  0.04],
    ['gewuerz',        0xd9822b, 0.5,  0.03],
  ];
  return {
    group: root,
    update(done) {
      stack.clear();
      let y = 0;
      const add = (color, w, h) => {
        stack.add(part('box', mat(color), w, h, w, 0, y + h / 2, 0));
        y += h;
      };
      for (const [item, color, w, h] of layers) if (done.has(item)) add(color, w, h);
      if (done.has('brot')) add(0xd9a45a, 0.74, 0.18);
      wrapper.visible = done.has('papier');
      wrapper.scale.y = Math.max(y, 0.2) + 0.04;
      wrapper.position.y = (Math.max(y, 0.2) + 0.04) / 2;
    },
  };
}

function makeDuck() {
  const root = new THREE.Group();
  const bodyMat = mat(0xe8e8ec, { roughness: 0.85 });
  const body = part('sphere', bodyMat, 1.0, 0.75, 0.75, 0, 0.5, 0);
  const tail = part('cone', bodyMat, 0.3, 0.4, 0.3, -0.5, 0.7, 0);
  tail.rotation.z = Math.PI / 2 + 0.5;
  const head = part('sphere', bodyMat, 0.5, 0.5, 0.5, 0.32, 1.0, 0);
  const beak = part('box', mat(0xff8c1a), 0.3, 0.1, 0.3, 0.6, 0.96, 0);
  const eyes = new THREE.Group();
  for (const z of [-0.12, 0.12]) eyes.add(part('sphere', mat(0x15151a), 0.08, 0.08, 0.08, 0.5, 1.08, z, false));
  const squeak = part('cyl', mat(0xb0b6c2, { metalness: 0.6 }), 0.16, 0.12, 0.16, 0, 0.06, 0);
  const wrapper = part('box', mat(0xffffff, { transparent: true, opacity: 0.28, roughness: 0.2 }), 1.2, 1.4, 0.95, 0, 0.7, 0, false);
  root.add(body, tail, head, beak, eyes, squeak, wrapper);
  return {
    group: root,
    update(done) {
      body.visible = done.has('koerper');
      tail.visible = done.has('koerper');
      head.visible = done.has('kopf');
      beak.visible = done.has('schnabel') && done.has('kopf');
      eyes.visible = done.has('augen') && done.has('kopf');
      squeak.visible = done.has('quietscher');
      wrapper.visible = done.has('papier');
      const painted = done.has('farbe');
      bodyMat.color.setHex(painted ? 0xffd23f : 0xe8e8ec);
      bodyMat.roughness = done.has('lack') ? 0.15 : 0.85;
      bodyMat.metalness = done.has('lack') ? 0.15 : 0;
      bodyMat.emissive.setHex(done.has('lack') ? 0x332200 : 0x000000);
    },
  };
}

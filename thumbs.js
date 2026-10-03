// Kleine 3D-Vorschaubilder von Gebäuden und Items für Bauleiste, Rezeptbuch und Menü (einmal gerendert, dann gecacht).
import * as THREE from 'three';
import { makeBuilding, makeItem } from './models.js';

const SIZE = 112;
const cache = new Map();
let renderer = null;
let scene = null;
let camera = null;

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8090a0, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(3, 6, 4);
  scene.add(sun);
  camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
}

const box = new THREE.Box3();
const sphere = new THREE.Sphere();
const viewDir = new THREE.Vector3(1.0, 0.85, 1.15).normalize();

// type: 'b' = Gebäude, 'i' = Item. Liefert eine Data-URL (oder '' ohne WebGL).
export function thumb(kind, type = 'b') {
  const key = type + kind;
  if (cache.has(key)) return cache.get(key);
  let url = '';
  try {
    if (!renderer) init();
    const obj = type === 'i' ? makeItem(kind) : makeBuilding(kind);
    scene.add(obj);
    box.setFromObject(obj).getBoundingSphere(sphere);
    const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.02;
    camera.position.copy(sphere.center).addScaledVector(viewDir, dist);
    camera.lookAt(sphere.center);
    renderer.render(scene, camera);
    url = renderer.domElement.toDataURL('image/png');
    scene.remove(obj);
  } catch { /* ohne WebGL gibt es eben keine Bilder */ }
  cache.set(key, url);
  return url;
}

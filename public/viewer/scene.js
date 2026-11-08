import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createKit } from './kit.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const SITES = { pathom: () => import('./sites/pathom.js'), prathon: () => import('./sites/prathon.js'), phailom: () => import('./sites/phailom.js') };
const siteKey = SITES[params.get('site')] ? params.get('site') : 'pathom';
const viewport = $('#viewport');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (params.get('text') === 'lg' || params.get('text') === 'xl') document.documentElement.dataset.text = params.get('text');
if (params.get('theme') === 'dark') document.documentElement.dataset.theme = 'dark';

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 2, alpha: true, powerPreference: 'high-performance' });
} catch {
  $('#loading').innerHTML = '<strong>อุปกรณ์นี้ยังเปิดมุมมอง 3D ไม่ได้</strong><span>ลองเปิดด้วย Chrome, Edge หรือ Safari ที่รองรับ WebGL</span>';
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 600 ? 1.5 : 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false; // the scene is static: redraw shadows only when the sun moves
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
viewport.append(renderer.domElement);
if (params.has('stats')) window.__renderer = renderer;
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', 'ลากเพื่อหมุน ใช้ล้อเมาส์หรือสองนิ้วเพื่อซูม ปุ่มลูกศรบนแป้นพิมพ์ก็ใช้หมุนได้');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#e8ecdf', .0016);
const camera = new THREE.PerspectiveCamera(40, 1, 1, 2400);
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: .065, minDistance: 40, maxDistance: 1000, maxPolarAngle: Math.PI / 2.03, minPolarAngle: .12, enablePan: false, autoRotate: !reducedMotion, autoRotateSpeed: .32 });
const hemi = new THREE.HemisphereLight('#f7f6e9', '#a2a58c', 2.5); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff2d3', 3.8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow, { normalBias: .2, bias: -.0004 });
scene.add(sun);
const fill = new THREE.DirectionalLight('#dae8eb', 1.2); fill.position.set(110, 65, -100); scene.add(fill);
const model = new THREE.Group(); scene.add(model);

const kit = createKit(renderer, model);
const site = (await SITES[siteKey]()).build(kit);
mergeStatic(model);

// Merge every static mesh that shares a material into one draw call (hundreds of calls -> a few dozen).
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), groups = new Map(), old = [];
  root.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
    if (!groups.has(key)) groups.set(key, { material: o.material, cast: o.castShadow, receive: o.receiveShadow, parts: [] });
    const m = inv.clone().multiply(o.matrixWorld);
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(m);
    if (m.determinant() < 0) { // mirrored parts: flip winding so faces stay outward
      for (const a of Object.values(g.attributes)) for (let i = 0; i < a.count; i += 3) for (let k = 0; k < a.itemSize; k++) { const t = a.array[(i + 1) * a.itemSize + k]; a.array[(i + 1) * a.itemSize + k] = a.array[(i + 2) * a.itemSize + k]; a.array[(i + 2) * a.itemSize + k] = t; }
    }
    groups.get(key).parts.push(g); old.push(o);
  });
  for (const o of old) { o.parent.remove(o); o.geometry.dispose(); }
  for (const { material, cast, receive, parts } of groups.values()) {
    const total = parts.reduce((n, g) => n + g.attributes.position.count, 0);
    const out = new THREE.BufferGeometry();
    for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2]]) {
      const arr = new Float32Array(total * size); let off = 0;
      for (const g of parts) { const a = g.attributes[name]; if (a) arr.set(a.array, off); off += g.attributes.position.count * size; }
      out.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    parts.forEach(g => g.dispose());
    out.computeBoundingSphere();
    const mesh = new THREE.Mesh(out, material); mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.matrixAutoUpdate = false; root.add(mesh);
  }
}
document.title = `${site.title} · 3D · นครทริป`;
$('#experience').setAttribute('aria-label', `สถานที่จำลอง${site.title}สามมิติ`);

// Fit the shadow frustum to the site.
const bounds = new THREE.Box3().setFromObject(model);
const size = bounds.getSize(new THREE.Vector3());
const span = Math.max(size.x, size.z) * .62;
Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 600 });
sun.shadow.camera.updateProjectionMatrix();

// Soft contact shadow.
const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 256;
const sctx = shadowCanvas.getContext('2d'); const sg = sctx.createRadialGradient(128, 128, 10, 128, 128, 128);
sg.addColorStop(0, '#34402155'); sg.addColorStop(.7, '#34402135'); sg.addColorStop(1, '#34402100'); sctx.fillStyle = sg; sctx.fillRect(0, 0, 256, 256);
const contact = new THREE.Mesh(new THREE.PlaneGeometry(site.shadowSize, site.shadowSize), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
contact.rotation.x = -Math.PI / 2; contact.position.y = site.groundY; scene.add(contact);

// Hotspots, generated per site.
const anchors = {}, descriptions = {};
const hotspotWrap = $('#hotspots');
site.hotspots.forEach((h, i) => {
  anchors[h.key] = new THREE.Vector3(...h.pos);
  descriptions[h.key] = [h.title, h.text];
  const b = document.createElement('button');
  b.dataset.part = h.key; b.type = 'button';
  b.setAttribute('aria-label', `${i + 1}. ${h.title}`);
  b.innerHTML = `<b>${i + 1}</b><span>${h.label}</span>`;
  hotspotWrap.append(b);
});
// Text list of the same points for screen readers and keyboard users.
const list = $('#pointList');
if (list) site.hotspots.forEach((h, i) => { const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.textContent = `${i + 1}. ${h.label}`; b.addEventListener('click', () => document.querySelector(`#hotspots [data-part="${h.key}"]`).click()); li.append(b); list.append(li); });

const initialView = params.get('mode') === 'map' ? 'aerial' : 'front';
let currentView = initialView, transition = null, disposed = false, dirty = true;
const viewDirections = { front: new THREE.Vector3(.28, .33, 1), aerial: new THREE.Vector3(.02, 1, .025), closeup: new THREE.Vector3(.65, .23, 1) };
const fitPoints = [];
for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) fitPoints.push(new THREE.Vector3(x, y, z));
function viewState(key) {
  const target = key === 'closeup' ? site.closeup.target.clone() : bounds.getCenter(new THREE.Vector3());
  const direction = viewDirections[key].clone().normalize();
  if (key === 'closeup') return { target, position: target.clone().addScaledVector(direction, Math.max(site.closeup.distance, site.closeup.distance * .88 / camera.aspect)) };
  const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
  const up = new THREE.Vector3().crossVectors(direction, right).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tanH = tanV * camera.aspect;
  let distance = 0;
  for (const corner of fitPoints) {
    const offset = corner.clone().sub(target);
    distance = Math.max(distance, offset.dot(direction) + Math.abs(offset.dot(right)) / tanH, offset.dot(direction) + Math.abs(offset.dot(up)) / tanV);
  }
  return { target, position: target.clone().addScaledVector(direction, distance * 1.05) };
}
function setView(key, animate = true) {
  currentView = key;
  const v = viewState(key);
  if (animate && !reducedMotion) transition = { from: camera.position.clone(), to: v.position, fromTarget: controls.target.clone(), toTarget: v.target, start: performance.now() };
  else { camera.position.copy(v.position); controls.target.copy(v.target); transition = null; controls.update(); }
  $('#viewLabel').textContent = key === 'aerial' ? site.labels.aerial : site.labels.front;
  document.querySelectorAll('[data-view]').forEach(b => { const on = b.dataset.view === key; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
}
function setRotation(enabled) {
  controls.autoRotate = enabled;
  $('#rotateBtn').setAttribute('aria-pressed', String(enabled));
  $('#rotateIcon').textContent = enabled ? 'Ⅱ' : '▷';
  $('#rotateText').textContent = enabled ? 'หยุดหมุน' : 'หมุนอัตโนมัติ';
}
function closePart() { $('#partPanel').hidden = true; document.querySelectorAll('[data-part]').forEach(el => el.classList.remove('active')); }
for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => { setRotation(false); setView(b.dataset.view); closePart(); });
$('#rotateBtn').addEventListener('click', () => setRotation(!controls.autoRotate));
controls.addEventListener('start', () => { transition = null; setRotation(false); });
$('#resetBtn').addEventListener('click', () => { setRotation(false); setView(initialView); closePart(); });
function zoom(factor) {
  transition = null; setRotation(false);
  const offset = camera.position.clone().sub(controls.target);
  camera.position.copy(controls.target).add(offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance)));
  controls.update();
}
$('#zoomIn').addEventListener('click', () => zoom(.83));
$('#zoomOut').addEventListener('click', () => zoom(1.2));

const lighting = {
  day: { sky: '#e8ecdf', sun: '#fff2d3', power: 3.8, hemi: 2.5, fill: 1.2, exposure: 1.25, pos: [-95, 160, 85] },
  sunset: { sky: '#efe0cd', sun: '#ffba6d', power: 4.8, hemi: 1.4, fill: .8, exposure: 1.2, pos: [-135, 65, 80] },
  night: { sky: '#1d292d', sun: '#b2c9e6', power: .65, hemi: .8, fill: .55, exposure: 1.35, pos: [-85, 170, 15] },
};
const uplights = site.uplights.map(u => { const l = new THREE.SpotLight(u.color, 0, 260, Math.PI / 4, .9, 1); l.position.set(...u.pos); l.target.position.set(...u.target); scene.add(l, l.target); l.userData.power = u.power; return l; });
function setLight(key) {
  const v = lighting[key]; document.body.classList.toggle('night', key === 'night');
  scene.fog.color.set(v.sky); sun.color.set(v.sun); sun.intensity = v.power; sun.position.set(...v.pos); hemi.intensity = v.hemi; fill.intensity = v.fill; renderer.toneMappingExposure = v.exposure;
  uplights.forEach(l => { l.intensity = l.userData.power; l.visible = key === 'night'; });
  site.warmLamps.forEach(l => { l.intensity = 45; l.visible = key === 'night'; });
  renderer.shadowMap.needsUpdate = true; dirty = true;
  viewport.style.background = key === 'sunset' ? 'radial-gradient(ellipse,#efd7b944,transparent 70%)' : 'transparent';
  document.querySelectorAll('[data-light]').forEach(b => { const on = b.dataset.light === key; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
}
document.querySelectorAll('[data-light]').forEach(b => b.addEventListener('click', () => setLight(b.dataset.light)));
setLight('day');

function focusPoint(key) {
  const target = anchors[key]; if (!target) return;
  setRotation(false);
  const direction = camera.position.clone().sub(controls.target).normalize();
  transition = { from: camera.position.clone(), to: target.clone().addScaledVector(direction, Math.max(70, 80 / camera.aspect)), fromTarget: controls.target.clone(), toTarget: target.clone(), start: performance.now() };
}
for (const b of document.querySelectorAll('#hotspots [data-part]')) b.addEventListener('click', () => {
  const key = b.dataset.part; focusPoint(key);
  $('#partTitle').textContent = descriptions[key][0]; $('#partText').textContent = descriptions[key][1]; $('#partPanel').hidden = false;
  document.querySelectorAll('#hotspots [data-part]').forEach(el => el.classList.toggle('active', el === b));
});
$('#closePart').addEventListener('click', closePart);

let lastWidth = 0, lastHeight = 0;
function resize() {
  if (disposed) return;
  const r = viewport.getBoundingClientRect(); if (!r.width || !r.height) return;
  camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); renderer.setSize(r.width, r.height);
  if (Math.abs(lastWidth - r.width) > 2 || Math.abs(lastHeight - r.height) > 2) { setView(currentView, false); lastWidth = r.width; lastHeight = r.height; }
}
const resizeObserver = new ResizeObserver(() => { resize(); dirty = true; }); resizeObserver.observe(viewport); resize(); setRotation(!reducedMotion && initialView !== 'aerial');
const initialFocus = params.get('focus'); if (initialFocus && anchors[initialFocus]) setTimeout(() => document.querySelector(`#hotspots [data-part="${initialFocus}"]`)?.click(), 180);
renderer.domElement.addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', ' '].includes(e.key)) return;
  e.preventDefault(); transition = null; setRotation(false);
  const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') spherical.theta += (e.key === 'ArrowLeft' ? -1 : 1) * .12;
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') spherical.phi = THREE.MathUtils.clamp(spherical.phi + (e.key === 'ArrowUp' ? -.08 : .08), controls.minPolarAngle, controls.maxPolarAngle);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
  if (e.key === '+') zoom(.85); if (e.key === '-') zoom(1.18); if (e.key === ' ') setRotation(true);
});

let animationFrame = 0, last = performance.now();
function dispose() {
  if (disposed) return; disposed = true; cancelAnimationFrame(animationFrame); resizeObserver.disconnect(); controls.dispose();
  const textures = new Set(), materials = new Set(), geometries = new Set();
  scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) { for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { materials.add(m); for (const value of Object.values(m)) if (value && value.isTexture) textures.add(value); } } });
  textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
}
const hotspotButtons = [...document.querySelectorAll('#hotspots [data-part]')];
const projected = new THREE.Vector3(), lastCam = new THREE.Matrix4();
function animate(now) {
  if (disposed) return; animationFrame = requestAnimationFrame(animate);
  if (document.hidden) { last = now; return; }
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (transition) { const t = Math.min((now - transition.start) / 850, 1), ease = t * t * (3 - 2 * t); camera.position.lerpVectors(transition.from, transition.to, ease); controls.target.lerpVectors(transition.fromTarget, transition.toTarget, ease); if (t === 1) transition = null; }
  controls.update(dt); camera.updateMatrixWorld();
  // Only draw when something actually moved: saves battery and keeps phones cool.
  if (!dirty && lastCam.equals(camera.matrixWorld)) return;
  dirty = false; lastCam.copy(camera.matrixWorld);
  hotspotWrap.classList.toggle('compact', camera.position.distanceTo(controls.target) > site.closeup.distance * 1.35 || viewport.clientWidth < 420 && camera.position.distanceTo(controls.target) > site.closeup.distance);
  $('#compassNeedle').style.transform = `rotate(${-Math.atan2(camera.position.x, camera.position.z) * 180 / Math.PI}deg)`;
  for (const button of hotspotButtons) {
    const point = projected.copy(anchors[button.dataset.part]).project(camera);
    button.style.left = `${(point.x + 1) * viewport.clientWidth / 2}px`; button.style.top = `${(1 - point.y) * viewport.clientHeight / 2}px`;
    button.style.display = Math.abs(point.x) < .95 && Math.abs(point.y) < .95 && point.z < 1 ? 'flex' : 'none';
  }
  renderer.render(scene, camera);
}
window.addEventListener('pagehide', () => dispose());
renderer.render(scene, camera); $('#loading').remove(); animationFrame = requestAnimationFrame(animate);

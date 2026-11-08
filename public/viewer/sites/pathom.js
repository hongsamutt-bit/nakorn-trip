// Phra Pathom Chedi — artistic reconstruction (units ≈ metres, total height ≈ 120 m).
import * as THREE from 'three';

export function build(kit) {
  const { model, random, reseed, tileTexture, mesh, cylinder, box, lathe, torus, lineTube, sphere, thaiRoof, tree } = kit;
  reseed(137);
  const ceramic = tileTexture(); ceramic.repeat.set(7, 4);
  const roofTex = tileTexture('roof'); roofTex.repeat.set(10, 1);
  const pavement = tileTexture('floor'); pavement.repeat.set(20, 20);
  const gold = new THREE.MeshStandardMaterial({ map: ceramic, bumpMap: ceramic, bumpScale: .075, roughness: .42, metalness: .22, color: '#f3d396' });
  const trim = new THREE.MeshStandardMaterial({ color: '#c08d42', roughness: .38, metalness: .45 });
  const darkGold = new THREE.MeshStandardMaterial({ color: '#94602c', roughness: .57, metalness: .17 });
  const gilded = new THREE.MeshStandardMaterial({ color: '#e0b45a', roughness: .24, metalness: .7 });
  const stone = new THREE.MeshStandardMaterial({ color: '#dad8c5', roughness: .88 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: '#b7b7a1', roughness: .9 });
  const cream = new THREE.MeshStandardMaterial({ color: '#e9e3c9', roughness: .8 });
  const redRoof = new THREE.MeshStandardMaterial({ map: roofTex, bumpMap: roofTex, bumpScale: .09, roughness: .69, color: '#ddaa7a', side: THREE.DoubleSide });
  const roofEdge = new THREE.MeshStandardMaterial({ color: '#b6985d', metalness: .25, roughness: .5 });
  const door = new THREE.MeshStandardMaterial({ color: '#322b20', roughness: .9 });
  const floorMat = new THREE.MeshStandardMaterial({ map: pavement, roughness: .9, color: '#e1dfce', bumpMap: pavement, bumpScale: .025 });
  const robe = new THREE.MeshStandardMaterial({ color: '#e6b04f', roughness: .3, metalness: .75 });
  const roofMats = { roof: redRoof, edge: roofEdge, gilded };

  // Landscaped plinth.
  cylinder(84, 83, 1.6, -1.25, stoneDark);
  cylinder(83.3, 84, .6, -.2, stone);
  cylinder(81.8, 81.8, .2, .16, floorMat);
  torus(83.6, .16, -.15, cream);
  const grassMat = new THREE.MeshStandardMaterial({ color: '#7f8b5b', roughness: 1 });
  const annulus = (inner, outer, y, mat) => lathe([[inner, y], [outer, y]], mat, model, 192, false);
  annulus(72, 79, .31, grassMat);
  annulus(67, 68, .34, stoneDark);
  for (let i = 0; i < 4; i++) {
    const path = new THREE.Group(); path.rotation.y = i * Math.PI / 2; model.add(path);
    box(12, .1, 32, 0, .4, 68, floorMat, path);
    for (let j = 0; j < 7; j++) box(12, .025, .07, 0, .47, 54 + j * 4, stoneDark, path);
  }

  // Circular terraces, garland mouldings (มาลัยเถา) and the bell (องค์ระฆัง).
  cylinder(44, 46, 1.1, .9, stoneDark);
  cylinder(43.6, 44, 1.2, 2, cream);
  cylinder(42.4, 43.6, .8, 3, floorMat);
  cylinder(35.8, 36.6, .8, 3.7, darkGold);
  lathe([[36.3, 4], [36.3, 4.6], [35.8, 4.9], [35.8, 5.6], [35, 6], [35, 6.8], [34.5, 7.1], [34.5, 8], [33.4, 8.3], [33.4, 9], [32.6, 9.4], [32.6, 10.4], [31.5, 10.8], [31.5, 12], [30.6, 12.4], [30.3, 13.7], [29.6, 14], [29.6, 15.4], [28.8, 16]], gold);
  for (const [r, y] of [[36.2, 4.6], [35.7, 5.6], [34.5, 8], [33.4, 9], [32.6, 10.3], [31.4, 11.7], [30.5, 13.5], [29.6, 15.3]]) torus(r, .19, y, trim);
  const bellPoints = [[28.8, 15.7], [29.1, 16.2], [29, 16.8], [28.4, 17.5], [27.8, 18.4], [27.3, 19.2], [26.9, 20], [26.7, 21], [26.4, 22], [25.9, 24], [25.3, 26], [24.5, 28], [23.7, 30], [22.7, 32], [21.6, 34], [20.4, 36], [19.2, 38], [17.9, 40], [16.6, 42], [15.3, 44], [14.1, 46], [13, 48], [12, 50], [11.2, 52], [10.6, 54], [10.3, 56], [10.3, 57.2], [10.8, 57.8], [10.8, 58.8], [10.2, 59.5]];
  lathe(bellPoints, gold);
  torus(28.4, .33, 17.4, darkGold);
  torus(10.8, .22, 58.8, trim);
  for (let i = 1; i < bellPoints.length - 2; i++) if (i % 2 === 0) torus(bellPoints[i][0] + .025, .035, bellPoints[i][1], darkGold, model, 192);
  // Hanging garland swags around the shoulder of the bell.
  for (let i = 0; i < 32; i++) {
    const a0 = i / 32 * Math.PI * 2, a1 = (i + 1) / 32 * Math.PI * 2, am = (a0 + a1) / 2;
    const r = 28.55, rm = 28.3;
    lineTube([[Math.sin(a0) * r, 17.6, Math.cos(a0) * r], [Math.sin(am) * rm, 16.9, Math.cos(am) * rm], [Math.sin(a1) * r, 17.6, Math.cos(a1) * r]], .09, trim);
  }

  // Harmika (บัลลังก์).
  const crown = new THREE.Group(); model.add(crown);
  box(18.4, 1.1, 18.4, 0, 60.1, 0, trim, crown, true);
  box(16.8, 3.1, 16.8, 0, 62.1, 0, gold, crown, true);
  box(18, .8, 18, 0, 63.9, 0, trim, crown, true);
  box(15.7, .7, 15.7, 0, 64.65, 0, darkGold, crown, true);
  box(16.7, .7, 16.7, 0, 65.3, 0, trim, crown, true);
  for (let i = 0; i < 4; i++) {
    const side = new THREE.Group(); side.rotation.y = i * Math.PI / 2; crown.add(side);
    for (let j = -3; j <= 3; j++) box(.16, 2.6, .2, j * 2.15, 62.2, 8.5, trim, side);
  }

  // เสาหาน: a ring of slender columns carrying the ringed spire.
  cylinder(7.9, 8.2, .8, 66.05, gold);
  cylinder(5.6, 5.6, 3.6, 68.2, darkGold, model, 48);
  const colGeo = new THREE.CylinderGeometry(.32, .36, 3.6, 10);
  const cols = new THREE.InstancedMesh(colGeo, gilded, 16);
  const d = new THREE.Object3D();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; d.position.set(Math.sin(a) * 7.1, 68.2, Math.cos(a) * 7.1); d.updateMatrix(); cols.setMatrixAt(i, d.matrix); }
  cols.castShadow = true; model.add(cols);
  cylinder(8.1, 7.6, .7, 70.35, trim);

  // ปล้องไฉน: 24 tapering rings.
  const ringBase = 71, ringStep = 1.3;
  for (let i = 0; i < 24; i++) {
    const y = ringBase + i * ringStep;
    const radius = 8.3 * Math.pow(1 - i / 29, 1.18);
    lathe([[radius * .89, y - .3], [radius, y], [radius, y + .3], [radius * .9, y + .55], [radius * .84, y + 1]], gold, model, 128);
    torus(radius, .12, y + .3, trim, model, 128);
  }
  const plee = ringBase + 24 * ringStep - .4; // ≈ 101.8
  // ปลียอด + มงกุฎ + นภศูล.
  lathe([[1.4, plee], [1.25, plee + 1.6], [1.38, plee + 2.6], [1.12, plee + 3.2], [.9, plee + 4.6], [.82, plee + 6.4], [.95, plee + 7], [.72, plee + 7.6]], gilded, model, 96);
  for (let i = 0; i < 6; i++) torus(1 - i * .05, .07, plee + 3.4 + i * .65, gilded, model, 64);
  // Crown: flared bands with four petals.
  const cy = plee + 7.6;
  lathe([[.72, cy], [1.1, cy + .35], [1.15, cy + .7], [.85, cy + 1], [.95, cy + 1.3], [.62, cy + 1.9], [.5, cy + 2.6], [.3, cy + 3.6], [.12, cy + 4.6], [0, cy + 5.2]], gilded, model, 64);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const leaf = mesh(new THREE.ConeGeometry(.22, 1.1, 6), gilded, model, true);
    leaf.position.set(Math.sin(a) * 1, cy + 1.6, Math.cos(a) * 1); leaf.rotation.set(Math.cos(a) * .35, 0, -Math.sin(a) * .35);
  }
  lineTube([[0, cy + 5, 0], [0, cy + 7.2, 0]], .06, gilded);
  for (const s of [-1, 1]) lineTube([[0, cy + 5.6, 0], [s * .45, cy + 6.1, 0], [s * .5, cy + 6.8, 0]], .045, gilded);
  sphere(.28, 0, cy + 5.1, 0, new THREE.MeshStandardMaterial({ color: '#fff8e4', emissive: '#6b5a2c', roughness: .1, metalness: .2 }));
  const topY = cy + 7.2;

  // Four niches around the bell.
  for (let i = 0; i < 4; i++) {
    const niche = new THREE.Group(); niche.rotation.y = i * Math.PI / 2; model.add(niche);
    box(5.5, 7.5, 2.8, 0, 18.3, 27.3, darkGold, niche, true);
    box(4.1, 6.2, .2, 0, 18.5, 28.8, door, niche);
    box(4.8, .35, .7, 0, 22, 28.9, trim, niche);
    for (const x of [-2.4, 2.4]) box(.4, 6.9, .5, x, 18.3, 29, trim, niche);
    lineTube([[-3, 22, 28.6], [-2.5, 23, 28.6], [0, 27, 28.1], [2.5, 23, 28.6], [3, 22, 28.6]], .16, trim, niche);
    seatedBuddha(niche, 0, 15.2, 29.1, .9);
  }

  // Circular cloister.
  cylinder(58, 59, .7, .75, stoneDark);
  cylinder(57.5, 58, .5, 1.35, floorMat);
  annulus(46.6, 57.5, 1.62, cream);
  lathe([[55.8, 1.5], [55.8, 5.4], [56.25, 5.6], [56.25, 6], [55.6, 6], [55.6, 6.3]], cream, model, 192, false);
  const pillars = new THREE.InstancedMesh(new THREE.BoxGeometry(.6, 5.8, .6), cream, 176);
  let p = 0;
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * Math.PI * 2;
    if (Math.abs(Math.sin(a * 2)) < .18) continue;
    for (const r of [47.8, 54.9]) { d.position.set(Math.sin(a) * r, 4.35, Math.cos(a) * r); d.rotation.y = a; d.updateMatrix(); pillars.setMatrixAt(p++, d.matrix); }
  }
  pillars.count = p; pillars.receiveShadow = true; model.add(pillars);
  const balusters = new THREE.InstancedMesh(new THREE.CylinderGeometry(.14, .2, 1.2, 8), cream, 360);
  for (let i = 0; i < 360; i++) { const a = i / 360 * Math.PI * 2; d.position.set(Math.sin(a) * 46.9, 2.5, Math.cos(a) * 46.9); d.rotation.set(0, 0, 0); d.updateMatrix(); balusters.setMatrixAt(i, d.matrix); }
  model.add(balusters);
  lathe([[46.5, 3.15], [47.2, 3.15], [47.2, 3.4], [46.5, 3.4]], cream, model, 192, false);
  lathe([[45.8, 7.1], [47.6, 7.8], [50.3, 10.1], [51.2, 10.1], [54.4, 7.5], [57.5, 6.9], [57.7, 6.7]], redRoof, model, 256);
  torus(50.75, .19, 10.15, roofEdge); torus(45.8, .16, 7.12, roofEdge); torus(57.5, .17, 6.9, roofEdge);
  const battens = new THREE.InstancedMesh(new THREE.BoxGeometry(.045, .08, 6.8), roofEdge, 192);
  for (let i = 0; i < 192; i++) { const a = i / 192 * Math.PI * 2; d.position.set(Math.sin(a) * 54, 8.5, Math.cos(a) * 54); d.rotation.set(0, a, 0); d.rotateX(.43); d.updateMatrix(); battens.setMatrixAt(i, d.matrix); }
  model.add(battens);

  // Bell towers (หอระฆัง) on the upper terrace.
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2 + Math.PI / 24;
    if (Math.abs(Math.sin(a * 2)) < .3) continue;
    const t = new THREE.Group(); t.position.set(Math.sin(a) * 40, 3.4, Math.cos(a) * 40); t.rotation.y = a; model.add(t);
    box(2.2, .5, 2.2, 0, .25, 0, cream, t);
    for (const [x, z] of [[-.8, -.8], [.8, -.8], [-.8, .8], [.8, .8]]) box(.22, 2.6, .22, x, 1.8, z, cream, t);
    box(2.3, .3, 2.3, 0, 3.2, 0, roofEdge, t);
    const roof = mesh(new THREE.ConeGeometry(1.75, 1.6, 4), redRoof, t, true); roof.position.y = 4.1; roof.rotation.y = Math.PI / 4;
    lineTube([[0, 4.8, 0], [0, 5.6, 0]], .06, gilded, t);
    const bell = mesh(new THREE.CylinderGeometry(.28, .45, .7, 16), trim, t); bell.position.y = 2.6;
  }

  // Standing Buddha (stylised Phra Ruang Rojanarit, abhaya mudra).
  function standingBuddha(parent, x, y, z, s) {
    const b = new THREE.Group(); b.position.set(x, y, z); b.scale.setScalar(s); parent.add(b);
    // Lotus pedestal.
    lathe([[0, 0], [1.6, 0], [1.6, .35], [1.35, .45], [1.75, .9], [1.2, 1.05], [0, 1.05]], gilded, b, 48);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const pt = mesh(new THREE.SphereGeometry(.32, 10, 8), gilded, b); pt.scale.set(1, 1.3, .6); pt.position.set(Math.sin(a) * 1.45, .7, Math.cos(a) * 1.45); pt.rotation.y = a; }
    // Robe: flared hem, body, chest.
    lathe([[0, 1.05], [.95, 1.05], [.98, 1.4], [.8, 2.4], [.68, 3.6], [.7, 4.4], [.82, 5.2], [.86, 5.7], [.62, 6.05], [.3, 6.2], [0, 6.2]], robe, b, 48);
    // Robe pleat falling from the left arm.
    box(.18, 3.6, .55, -.82, 3.4, .1, robe, b);
    // Neck and head with ushnisha + flame (ketumala).
    cylinder(.24, .28, .4, 6.35, robe, b, 16);
    const head = sphere(.55, 0, 6.95, 0, robe, b, 24); head.scale.set(.92, 1.12, .95);
    for (let i = 0; i < 26; i++) { const a = random() * Math.PI * 2, e = random() * 1.2; const c = sphere(.08, Math.cos(a) * Math.cos(e) * .5, 7.1 + Math.sin(e) * .55, Math.sin(a) * Math.cos(e) * .5, robe, b, 6); c.scale.setScalar(1); }
    sphere(.3, 0, 7.6, 0, robe, b, 16);
    const flame = mesh(new THREE.ConeGeometry(.14, .75, 12), gilded, b); flame.position.y = 8.1;
    for (const sx of [-1, 1]) { const ear = box(.08, .55, .18, sx * .5, 6.85, 0, robe, b); ear.rotation.z = sx * .08; }
    // Arms: right raised (abhaya), left hanging.
    lineTube([[.78, 5.6, 0], [1.05, 4.7, .2], [1.15, 4.3, .65], [1.12, 5, .95]], .17, robe, b, true);
    box(.42, .62, .14, 1.12, 5.35, 1.02, robe, b);
    lineTube([[-.78, 5.6, 0], [-.92, 4.4, .05], [-.9, 3.2, .1]], .17, robe, b, true);
    box(.32, .55, .16, -.9, 2.85, .12, robe, b);
    // Halo.
    const halo = mesh(new THREE.TorusGeometry(.95, .04, 6, 48), gilded, b); halo.position.set(0, 7.1, -.5);
    return b;
  }
  function seatedBuddha(parent, x, y, z, s) {
    const b = new THREE.Group(); b.position.set(x, y, z); b.scale.setScalar(s); parent.add(b);
    box(2.4, .5, 1.2, 0, .25, 0, gilded, b);
    const lap = mesh(new THREE.CylinderGeometry(1, 1.05, .6, 24), robe, b); lap.position.y = .8; lap.scale.z = .55;
    lathe([[0, 1], [.62, 1], [.66, 1.6], [.55, 2.35], [.25, 2.55], [0, 2.55]], robe, b, 24);
    const head = sphere(.32, 0, 2.95, 0, robe, b, 16); head.scale.y = 1.1;
    const top = mesh(new THREE.ConeGeometry(.1, .45, 8), gilded, b); top.position.y = 3.45;
    return b;
  }

  const warmLamps = [];
  function pavilion(a, major = false) {
    const g = new THREE.Group(); g.rotation.y = a; model.add(g);
    const hall = new THREE.Group(); hall.position.z = 53.2; g.add(hall);
    const w = major ? 15 : 12, dd = major ? 20 : 16;
    box(w + 3, 1, dd + 3, 0, 1.5, 0, stone, hall);
    box(w, 7.7, dd, 0, 5.6, 0, cream, hall, true);
    box(w - 1.6, 6.7, .08, 0, 5.4, dd / 2 + .05, door, hall);
    for (const x of [-w / 2 + .7, w / 2 - .7]) box(1, 8.3, 1, x, 5.5, dd / 2 + .4, cream, hall, true);
    box(w, .7, 1, 0, 9.2, dd / 2 + .5, roofEdge, hall);
    // Pointed gilded door frame (ซุ้มประตู).
    lineTube([[-w / 2 + 1.4, 8.8, dd / 2 + .3], [-w / 4, 10.4, dd / 2 + .3], [0, 12.2, dd / 2 + .3], [w / 4, 10.4, dd / 2 + .3], [w / 2 - 1.4, 8.8, dd / 2 + .3]], .14, gilded, hall);
    if (major) {
      // The north vihara frames a tall standing Buddha on a stepped plinth.
      box(4.6, 1.2, 3.4, 0, 2.6, dd / 2 + 2.4, stone, hall, true);
      box(3.8, .4, 2.8, 0, 3.4, dd / 2 + 2.4, gilded, hall);
      standingBuddha(hall, 0, 3.6, dd / 2 + 2.4, 1.15);
    }
    thaiRoof(hall, w + 3, dd + 3, 9.5, 4.2, roofMats);
    thaiRoof(hall, w + .8, dd * .68, 12.6, 3.4, roofMats);
    if (major) thaiRoof(hall, w - 2, dd * .37, 15.3, 2.6, roofMats);
    for (let i = 0; i < 9; i++) box(w - 2, .24, 1.1, 0, .36 + i * .18, dd / 2 + 9.2 - i * 1.05, stone, hall);
    for (const x of [-w / 2, w / 2]) {
      lineTube([[x, .8, dd / 2 + 10], [x, 1.3, dd / 2 + 6], [x, 2.7, dd / 2 + 1]], .24, cream, hall);
      const lamp = new THREE.PointLight('#ffd18b', 0, 28, 2); lamp.position.set(x, 7, dd / 2 + 1); hall.add(lamp); warmLamps.push(lamp);
    }
  }
  pavilion(0, true); pavilion(Math.PI / 2); pavilion(Math.PI); pavilion(-Math.PI / 2);

  // Trees and lamp posts.
  const foliage = [new THREE.MeshStandardMaterial({ color: '#65784d', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#859263', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#768453', roughness: 1 })];
  const bark = new THREE.MeshStandardMaterial({ color: '#746249', roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + .11;
    if (Math.abs(Math.sin(a * 2)) < .29) continue;
    const r = 74 + random() * 3;
    const t = tree(model, Math.sin(a) * r, Math.cos(a) * r, foliage, bark);
    t.position.y = .5;
    cylinder(3.3, 3.5, .35, .05, stone, t, 48);
  }
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2 + .15, r = 63.7;
    if (Math.abs(Math.sin(a * 2)) < .2) continue;
    const post = new THREE.Group(); post.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); model.add(post);
    cylinder(.19, .28, 3.2, 2.1, stoneDark, post, 12);
    box(.9, .65, .9, 0, 3.9, 0, cream, post);
    cylinder(.14, .8, .6, 4.5, darkGold, post, 4).rotation.y = Math.PI / 4;
  }

  return {
    title: 'พระปฐมเจดีย์',
    labels: { front: 'สำรวจองค์พระปฐมเจดีย์', aerial: 'ผังบริเวณองค์พระปฐมเจดีย์' },
    closeup: { target: new THREE.Vector3(0, 64, 0), distance: 165 },
    groundY: -2.12, shadowSize: 205,
    warmLamps,
    uplights: [{ color: '#ffba66', power: 2600, pos: [35, 13, 55], target: [0, 60, 0] }, { color: '#ffd195', power: 2000, pos: [-40, 8, -40], target: [0, 55, 0] }],
    hotspots: [
      { key: 'entry', label: 'ทางขึ้น', pos: [-9, 2, 75], title: 'ทางขึ้น · ด้านทิศเหนือ', text: 'แนวทางเริ่มเดินชมโดยประมาณ ใกล้วิหารพระร่วงโรจนฤทธิ์ โปรดตรวจสอบทางเข้าที่เปิดจริงและป้ายของวัด' },
      { key: 'buddha', label: 'พระร่วงฯ', pos: [6, 13, 66], title: 'พระร่วงโรจนฤทธิ์', text: 'พระพุทธรูปยืนปางประทานอภัย ประดิษฐานที่วิหารทิศเหนือ สมัยรัชกาลที่ 6 ในแบบจำลองแสดงเป็นรูปทรงเชิงศิลป์' },
      { key: 'pray', label: 'จุดไหว้', pos: [15, 35, 10], title: 'จุดไหว้ · องค์พระเจดีย์', text: 'องค์พระเจดีย์เป็นจุดศูนย์กลางการสักการะ ด้านเหนือมีวิหารพระร่วงโรจนฤทธิ์ และรอบบริเวณมีพระพุทธรูปสำคัญ' },
      { key: 'chant', label: 'สวดมนต์', pos: [-24, 6, 40], title: 'จุดสวดมนต์', text: 'เลือกพื้นที่สงบและไม่กีดขวางทางเดิน บทสวดสำหรับอ่านเพิ่มเติมอยู่ในหน้ารายละเอียดสถานที่' },
      { key: 'history', label: 'ยอดมงกุฎ', pos: [0, topY - 8, 0], title: 'ยอดพระเจดีย์', text: 'เหนือองค์ระฆังคือบัลลังก์ เสาหาน ปล้องไฉน ปลียอด และยอดมงกุฎ รวมความสูงราว 120 เมตร องค์ปัจจุบันสร้างครอบองค์เดิมในสมัยรัชกาลที่ 4–5' },
      { key: 'exit', label: 'ทางออก', pos: [0, 8, -68], title: 'ทางออก · แนวเดินกลับ', text: 'แนวทางออกในแบบจำลองเป็นเพียงจุดสังเกต ไม่ใช่ทางหนีไฟหรือแผนผังสำรวจ โปรดทำตามป้ายและคำแนะนำของเจ้าหน้าที่' },
    ],
  };
}

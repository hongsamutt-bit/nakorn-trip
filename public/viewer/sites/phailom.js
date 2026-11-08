// Wat Phai Lom, Nakhon Pathom — artistic reconstruction from visitor photos.
// Ornate gold-gabled ubosot with yaksha-guarded gate, the Phra Phuttha Metta
// Prathan Phon vihara, a spired mondop, shrine gallery and a domed sala.
// Layout is approximate. Units ≈ metres.
import * as THREE from 'three';

export function build(kit) {
  const { model, random, reseed, tileTexture, mesh, cylinder, box, wbox, lathe, lineTube, sphere, thaiRoof, tree } = kit;
  reseed(9090);

  // ---------- Textures ----------
  function canvasTex(size, draw, repeat = [1, 1]) {
    const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); return t;
  }
  // Gold mirror mosaic in a diamond lattice (as on the vihara columns).
  const mosaicTex = canvasTex(256, (x, s) => {
    x.fillStyle = '#9c6b1c'; x.fillRect(0, 0, s, s);
    const n = 16, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const l = 48 + random() * 22;
      x.fillStyle = `hsl(${40 + random() * 8},${70 + random() * 15}%,${l}%)`; x.fillRect(i * w + 1, j * w + 1, w - 2, w - 2);
      if (random() < .12) { x.fillStyle = '#fff6d0aa'; x.fillRect(i * w + 2, j * w + 2, w - 5, 2); }
    }
    x.strokeStyle = '#6b4510aa'; x.lineWidth = 2;
    for (let k = -s; k < s * 2; k += s / 4) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + s, s); x.stroke(); x.beginPath(); x.moveTo(k, s); x.lineTo(k + s, 0); x.stroke(); }
  });
  // Carved gilded gable (หน้าบัน) with blue glass inlay.
  const gableTex = canvasTex(512, (x, s) => {
    x.fillStyle = '#7a5216'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const px = random() * s, py = random() * s, r = 6 + random() * 18;
      x.strokeStyle = `hsl(${40 + random() * 10},80%,${50 + random() * 20}%)`; x.lineWidth = 2 + random() * 3;
      x.beginPath(); x.arc(px, py, r, random() * 6, random() * 6 + 2.5); x.stroke();
    }
    for (let i = 0; i < 70; i++) { x.fillStyle = random() < .6 ? '#2f6fb0cc' : '#2a9a7acc'; x.beginPath(); x.arc(random() * s, random() * s * .7, 3 + random() * 6, 0, 7); x.fill(); }
    // Central Garuda-like medallion.
    const g = x.createRadialGradient(s / 2, s * .55, 10, s / 2, s * .55, s * .22);
    g.addColorStop(0, '#ffe7a0'); g.addColorStop(1, '#c08a2a00'); x.fillStyle = g; x.beginPath(); x.arc(s / 2, s * .55, s * .22, 0, 7); x.fill();
  });
  const pave = canvasTex(512, (x, s) => {
    x.fillStyle = '#9fae8c'; x.fillRect(0, 0, s, s);
    const n = 8, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = `hsl(${78 + random() * 10},${22 + random() * 8}%,${74 + random() * 8}%)`; x.fillRect(i * w + 2, j * w + 2, w - 4, w - 4); }
  }, [40, 40]);
  const roofTex = tileTexture('roof'); roofTex.repeat.set(8, 1);

  // ---------- Materials ----------
  const goldWall = new THREE.MeshStandardMaterial({ map: mosaicTex, roughness: .28, metalness: .75, color: '#ffe2a0' });
  const gilded = new THREE.MeshStandardMaterial({ color: '#e0ad4c', roughness: .25, metalness: .75 });
  const gableMat = new THREE.MeshStandardMaterial({ map: gableTex, roughness: .35, metalness: .6, side: THREE.DoubleSide });
  const redRoof = new THREE.MeshStandardMaterial({ map: roofTex, bumpMap: roofTex, bumpScale: .06, roughness: .55, color: '#c7614a', side: THREE.DoubleSide });
  const roofEdge = new THREE.MeshStandardMaterial({ color: '#d7a940', metalness: .55, roughness: .35 });
  const red = new THREE.MeshStandardMaterial({ color: '#b3261e', roughness: .5 });
  const white = new THREE.MeshStandardMaterial({ color: '#f1efe7', roughness: .75 });
  const cream = new THREE.MeshStandardMaterial({ color: '#efe3c4', roughness: .8 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: .9 });
  const glass = new THREE.MeshStandardMaterial({ color: '#4b6670', roughness: .1, metalness: .4 });
  const court = new THREE.MeshStandardMaterial({ map: pave, roughness: .9 });
  const grass = new THREE.MeshStandardMaterial({ color: '#6f8d4a', roughness: 1 });
  const hedge = new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 1 });
  const metalRoof = new THREE.MeshStandardMaterial({ color: '#59605e', roughness: .45, metalness: .6, side: THREE.DoubleSide });
  const steel = new THREE.MeshStandardMaterial({ color: '#9aa1a1', roughness: .4, metalness: .7 });
  const brickRed = new THREE.MeshStandardMaterial({ color: '#9a4a33', roughness: .9 });
  const roofMats = { roof: redRoof, edge: roofEdge, gilded };

  // ---------- Ground ----------
  box(150, .6, 130, 0, -.3, 0, grass);
  const plaza = mesh(new THREE.BoxGeometry(128, .3, 108), court, model); plaza.position.y = .05;
  // Green-and-white kerbs along the lawns, as in the photos.
  for (let i = -6; i < 6; i++) { box(4, .3, .35, -20 + i * 4 + 2, .3, 30.5, i % 2 ? white : new THREE.MeshStandardMaterial({ color: '#2f7d4e' })); }

  // ---------- Ubosot (อุโบสถ) ----------
  const ub = new THREE.Group(); ub.position.set(-22, .2, -6); model.add(ub);
  const W = 15, D = 30;
  // Raised plinth with white balustrade.
  box(W + 8, 1.6, D + 8, 0, .8, 0, white, ub, true);
  const balGeo = new THREE.CylinderGeometry(.12, .16, .9, 6);
  const bals = new THREE.InstancedMesh(balGeo, white, 400); const dm = new THREE.Object3D(); let bi = 0;
  for (const [ax, len, fixed, axis] of [[0, W + 8, (D + 8) / 2, 'x'], [0, W + 8, -(D + 8) / 2, 'x'], [0, D + 8, (W + 8) / 2, 'z'], [0, D + 8, -(W + 8) / 2, 'z']]) {
    for (let t = -len / 2 + .5; t <= len / 2 - .5; t += .55) {
      if (axis === 'x' && fixed > 0 && Math.abs(t) < 3.2) continue; // front stair
      dm.position.set(axis === 'x' ? t : fixed, 2.05, axis === 'x' ? fixed : t); dm.updateMatrix(); bals.setMatrixAt(bi++, dm.matrix);
    }
    const rail = box(axis === 'x' ? len : .3, .18, axis === 'x' ? .3 : len, axis === 'x' ? ax : fixed, 2.55, axis === 'x' ? fixed : ax, white, ub);
    if (axis === 'x' && fixed > 0) { rail.scale.x = .99; }
  }
  bals.count = bi; model.add(bals); bals.position.copy(ub.position);
  for (let i = 0; i < 6; i++) box(6, .26, 1, 0, .2 + i * .26, (D + 8) / 2 + 3.2 - i * .55, white, ub);
  // Walls: gold-mosaic body with arched window niches between red-gold pilasters.
  wbox(W, 8.5, D, 0, 5.85, 0, goldWall, ub, true, 3);
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) {
    const z = -D / 2 + 2.5 + i * (D - 5) / 6;
    box(.25, 3.6, 1.8, sx * (W / 2 + .05), 6, z, red, ub);
    lineTube([[sx * (W / 2 + .2), 7.8, z - 1.1], [sx * (W / 2 + .2), 8.9, z - .5], [sx * (W / 2 + .2), 9.6, z], [sx * (W / 2 + .2), 8.9, z + .5], [sx * (W / 2 + .2), 7.8, z + 1.1]], .1, gilded, ub);
  }
  // Peristyle columns on both long sides.
  const colGeo = new THREE.CylinderGeometry(.45, .5, 9, 12);
  for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) {
    const c = mesh(colGeo, goldWall, ub, true); c.position.set(sx * (W / 2 + 2.2), 6.1, -D / 2 + 1 + i * (D - 2) / 7);
    box(1.3, .5, 1.3, c.position.x, 10.8, c.position.z, gilded, ub);
  }
  // Front porch: 4 gilded columns and a pointed gold doorway.
  for (const x of [-5.2, -2, 2, 5.2]) { const c = mesh(colGeo, gilded, ub, true); c.position.set(x, 6.1, D / 2 + 3.2); }
  box(4.2, 6, .3, 0, 4.6, D / 2 + .2, dark, ub);
  const arch = new THREE.Shape(); arch.moveTo(-2.6, 0); arch.lineTo(-2.6, 6); arch.quadraticCurveTo(-2.4, 8.4, 0, 9.6); arch.quadraticCurveTo(2.4, 8.4, 2.6, 6); arch.lineTo(2.6, 0); arch.lineTo(2.1, 0); arch.lineTo(2.1, 6); arch.quadraticCurveTo(1.9, 7.9, 0, 8.9); arch.quadraticCurveTo(-1.9, 7.9, -2.1, 6); arch.lineTo(-2.1, 0); arch.closePath();
  const archM = mesh(new THREE.ExtrudeGeometry(arch, { depth: .4, bevelEnabled: false }), gilded, ub, true); archM.position.set(0, 1.6, D / 2 + .1);
  // Tiered roofs (3 overlapping gables, front porch roof lower).
  thaiRoof(ub, W + 7, D + 2, 10.9, 6.2, roofMats);
  thaiRoof(ub, W + 3, D - 6, 14.2, 5.4, roofMats);
  thaiRoof(ub, W - 1.5, D - 14, 17.4, 4.6, roofMats);
  // Porch roof + ornate gilded gable panel.
  const porch = new THREE.Group(); porch.position.z = D / 2 + 3; ub.add(porch);
  thaiRoof(porch, W + 1, 7, 10.9, 6.6, roofMats);
  const gs = new THREE.Shape(); gs.moveTo(-(W + 1) * .39, 0); gs.lineTo(0, 6.3); gs.lineTo((W + 1) * .39, 0); gs.closePath();
  const gp = mesh(new THREE.ShapeGeometry(gs), gableMat, porch); gp.position.set(0, 11, 3.55);
  const uv = gp.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 6.2) / 12.4, uv.getY(i) / 6.3);
  box(W, 1.6, .5, 0, 10.2, 3.5, gilded, porch);

  // ---------- Gate (ซุ้มประตู) with yaksha guardians ----------
  const gate = new THREE.Group(); gate.position.set(-22, .2, 30); model.add(gate);
  for (const x of [-3.4, 3.4]) wbox(1.6, 8, 1.6, x, 4, 0, red, gate, true, 2);
  box(8.4, 1.2, 1.9, 0, 8.4, 0, gilded, gate, true);
  lineTube([[-2.6, 7.8, 1], [-1.5, 8.6, 1], [0, 9.2, 1], [1.5, 8.6, 1], [2.6, 7.8, 1]], .12, gilded, gate);
  thaiRoof(gate, 8.2, 3.2, 9, 4.6, roofMats);
  thaiRoof(gate, 6, 2.2, 11.4, 3.6, roofMats);
  // Wrought gate leaves.
  for (const x of [-1.7, 1.7]) { box(3.2, 4.2, .12, x, 2.3, 0, new THREE.MeshStandardMaterial({ color: '#4b7e84', roughness: .4, metalness: .5 }), gate); }
  function yaksha(parent, x, z, skin, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
    box(2.2, 1.6, 2.2, 0, .8, 0, white, g, true);
    // Legs, armoured body, head with tall crown, club.
    for (const sx of [-.45, .45]) { const leg = mesh(new THREE.CylinderGeometry(.35, .3, 2.6, 10), skin, g, true); leg.position.set(sx, 2.9, 0); }
    const skirt = mesh(new THREE.CylinderGeometry(.75, 1, 1.4, 12), gilded, g, true); skirt.position.y = 4.4;
    const torso = mesh(new THREE.CylinderGeometry(.85, .7, 2.2, 12), gilded, g, true); torso.position.y = 6;
    sphere(.6, 0, 7.6, 0, skin, g, 16);
    for (const sx of [-.24, .24]) sphere(.11, sx, 7.75, .52, new THREE.MeshStandardMaterial({ color: '#fff' }), g, 8);
    const crown = mesh(new THREE.ConeGeometry(.5, 2, 12), gilded, g, true); crown.position.y = 8.9;
    for (const sx of [-1, 1]) lineTube([[sx * .85, 6.8, 0], [sx * 1.2, 5.8, .3], [sx * .7, 5, .7]], .22, skin, g, true);
    const club = mesh(new THREE.CylinderGeometry(.18, .26, 4.2, 10), gilded, g, true); club.position.set(0, 3.6, 1);
    return g;
  }
  yaksha(gate, -6.6, .4, new THREE.MeshStandardMaterial({ color: '#c99342', roughness: .4, metalness: .4 }), 0);
  yaksha(gate, 6.6, .4, new THREE.MeshStandardMaterial({ color: '#3d9a55', roughness: .45 }), 0);

  // ---------- Vihara Phra Phuttha Metta Prathan Phon ----------
  const vi = new THREE.Group(); vi.position.set(26, .2, 4); model.add(vi);
  box(20, .8, 22, 0, .4, 0, white, vi, true);
  wbox(16, 7, 16, 0, 4.3, -2, goldWall, vi, true, 3);
  // Open front portico on gold-mosaic square pillars.
  for (const x of [-7.5, -2.5, 2.5, 7.5]) wbox(1.1, 6.6, 1.1, x, 4.1, 8.5, goldWall, vi, true, 2);
  box(18, 1, 1.2, 0, 7.8, 8.5, red, vi, true);
  box(15, .6, .2, 0, 7.8, 9.15, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .6 }), vi);
  thaiRoof(vi, 20, 24, 8.3, 3.4, roofMats);
  thaiRoof(vi, 15, 14, 10.9, 4.4, roofMats);
  const gs2 = new THREE.Shape(); gs2.moveTo(-5.8, 0); gs2.lineTo(0, 4.2); gs2.lineTo(5.8, 0); gs2.closePath();
  const gp2 = mesh(new THREE.ShapeGeometry(gs2), gableMat, vi); gp2.position.set(0, 11, 7.05);
  const uv2 = gp2.geometry.attributes.uv; for (let i = 0; i < uv2.count; i++) uv2.setXY(i, (uv2.getX(i) + 5.8) / 11.6, uv2.getY(i) / 4.2);
  // Bonsai tree in front and gold standing figure under the portico.
  const bonsai = new THREE.Group(); bonsai.position.set(-2, .8, 11.5); vi.add(bonsai);
  box(2.4, 1.2, 1.6, 0, .6, 0, new THREE.MeshStandardMaterial({ color: '#2f6a46' }), bonsai, true);
  cylinder(.25, .35, 2.6, 2.4, new THREE.MeshStandardMaterial({ color: '#6c5841' }), bonsai, 8);
  const crownTree = mesh(new THREE.SphereGeometry(2.6, 16, 10), hedge, bonsai, true); crownTree.scale.set(1.3, .45, 1.1); crownTree.position.y = 4;
  const goldMonk = new THREE.Group(); goldMonk.position.set(3, .8, 6.5); vi.add(goldMonk);
  lathe([[0, 0], [.55, 0], [.5, 1.6], [.45, 2.2], [.2, 2.4], [0, 2.4]], gilded, goldMonk, 24);
  sphere(.25, 0, 2.6, 0, gilded, goldMonk, 12);

  // ---------- Mondop with tall spire (behind, between halls) ----------
  const mo = new THREE.Group(); mo.position.set(6, .2, -22); model.add(mo);
  wbox(16, 10, 16, 0, 5, 0, goldWall, mo, true, 3);
  for (const s of [0, 1, 2, 3]) {
    const side = new THREE.Group(); side.rotation.y = s * Math.PI / 2; mo.add(side);
    thaiRoof(side, 12, 4, 10, 4, roofMats); side.children.forEach(c => { c.position.z += 7; });
    box(3, 4.8, .2, 0, 2.6, 8.05, s === 0 ? glass : dark, side);
  }
  box(17, 1.2, 17, 0, 10.6, 0, red, mo, true);
  // Stacked tiers rising into a slender gilded spire.
  let yy = 11.2;
  for (let i = 0; i < 6; i++) { const s = 10 - i * 1.4; wbox(s, 1.6, s, 0, yy + .8, 0, i % 2 ? gilded : white, mo, true, 2); yy += 1.6; }
  lathe([[2.4, yy], [2.1, yy + 1.5], [1.4, yy + 3], [1, yy + 5], [.6, yy + 7.5], [.3, yy + 10], [0, yy + 12]], gilded, mo, 12);
  const spireTop = yy + 12;

  // ---------- Shrine gallery (ระเบียงพระ/จุดขออโหสิกรรม) ----------
  const gal = new THREE.Group(); gal.position.set(46, .2, -18); model.add(gal);
  box(8, .6, 30, 0, .3, 0, cream, gal, true);
  wbox(.6, 5, 30, -3.7, 3.1, 0, goldWall, gal, true, 3);
  const vault = mesh(new THREE.CylinderGeometry(4.2, 4.2, 30, 24, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), metalRoof, gal, true);
  vault.position.y = 5.4;
  for (let i = 0; i < 8; i++) {
    const z = -12 + i * 3.4;
    box(1.4, 1, 1, -2.6, 1.1, z, red, gal);
    const fig = new THREE.Group(); fig.position.set(-2.6, 1.6, z); gal.add(fig);
    const colors = ['#f2d16b', '#e88f9a', '#5aa86b', '#7aa6e0'];
    lathe([[0, 0], [.4, 0], [.35, 1], [.15, 1.3], [0, 1.3]], new THREE.MeshStandardMaterial({ color: colors[i % 4], roughness: .4, metalness: .3 }), fig, 16);
    sphere(.18, 0, 1.45, 0, gilded, fig, 10);
  }
  for (const z of [-15, 15]) for (const x of [-3.8, 3.8]) box(.25, 5.4, .25, x, 2.9, z, steel, gal);

  // ---------- Angulimala statue ----------
  const an = new THREE.Group(); an.position.set(32, .2, 22); model.add(an);
  box(4, 1.2, 4, 0, .6, 0, white, an, true);
  box(3.4, .3, 3.4, 0, 1.35, 0, gilded, an);
  const bronze = new THREE.MeshStandardMaterial({ color: '#3b3330', roughness: .45, metalness: .55 });
  const pants = new THREE.MeshStandardMaterial({ color: '#b8352a', roughness: .6 });
  for (const sx of [-.3, .3]) { const leg = mesh(new THREE.CylinderGeometry(.24, .2, 1.8, 10), bronze, an, true); leg.position.set(sx, 2.4, 0); }
  const hip = mesh(new THREE.CylinderGeometry(.55, .62, 1.1, 12), pants, an, true); hip.position.y = 3.5;
  const chest = mesh(new THREE.CylinderGeometry(.62, .5, 1.6, 12), bronze, an, true); chest.position.y = 4.8;
  sphere(.38, 0, 5.95, 0, bronze, an, 16);
  const hair = mesh(new THREE.CylinderGeometry(.42, .5, 1.2, 12, 1, true), bronze, an); hair.position.set(0, 5.6, -.1);
  // Finger garland (the "anguli-mala").
  const garland = mesh(new THREE.TorusGeometry(.62, .06, 6, 24), new THREE.MeshStandardMaterial({ color: '#e8dcc0' }), an); garland.position.set(0, 5.1, .1); garland.rotation.x = 1.25;
  for (const sx of [-1, 1]) lineTube([[sx * .62, 5.4, 0], [sx * .85, 4.6, .15], [sx * .7, 3.8, .35]], .16, bronze, an, true);

  // ---------- Sala of Luang Pho Pool ----------
  const sala = new THREE.Group(); sala.position.set(-10, .2, -40); model.add(sala);
  box(24, .8, 14, 0, .4, 0, white, sala, true);
  wbox(22, 6, 12, 0, 3.8, 0, cream, sala, true, 4);
  for (let i = 0; i < 6; i++) box(2.2, 3, .2, -9 + i * 3.6, 3.6, 6.05, glass, sala);
  thaiRoof(sala, 24, 14, 6.8, 4.2, roofMats);

  // ---------- Domed sala / Guan Yin hall ----------
  const dome = new THREE.Group(); dome.position.set(28, .2, -44); model.add(dome);
  box(30, .6, 18, 0, .3, 0, white, dome);
  const roof = mesh(new THREE.CylinderGeometry(9.5, 9.5, 30, 32, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), metalRoof, dome, true);
  roof.scale.y = .62; roof.position.y = 5.2;
  for (const x of [-14, -7, 0, 7, 14]) for (const z of [-8.5, 8.5]) box(.35, 5, .35, x, 2.8, z, steel, dome);
  const guanyin = new THREE.Group(); guanyin.position.set(0, .6, -4); dome.add(guanyin);
  lathe([[0, 0], [1, 0], [.8, 2.4], [.55, 3.4], [.25, 3.7], [0, 3.7]], white, guanyin, 24);
  sphere(.35, 0, 4.05, 0, white, guanyin, 14);
  for (let i = 0; i < 14; i++) { const a = -1.2 + i / 13 * 2.4; lineTube([[0, 2.8, 0], [Math.sin(a) * 1.4, 2.8 + Math.cos(a) * 1.2, .2]], .06, gilded, guanyin); }
  // Stone lions at the front.
  for (const x of [-12, 12]) {
    const l = new THREE.Group(); l.position.set(x, .6, 10); dome.add(l);
    box(1.6, 1.2, 1.6, 0, .6, 0, white, l);
    const body = sphere(.7, 0, 1.8, 0, white, l, 12); body.scale.set(.9, 1.1, 1.2);
    sphere(.55, 0, 2.8, .3, white, l, 12);
  }

  // ---------- Boon Coffee (brick-front café) ----------
  const cafe = new THREE.Group(); cafe.position.set(48, .2, 30); cafe.rotation.y = -Math.PI / 2; model.add(cafe);
  box(14, .5, 8, 0, .25, 0, cream, cafe);
  wbox(14, 4, 8, 0, 2.5, 0, white, cafe, true);
  box(14, 4, .25, 0, 2.5, 4.05, brickRed, cafe);
  for (const x of [-4.5, 0, 4.5]) box(3.6, 2.8, .1, x, 2.2, 4.2, glass, cafe);
  box(16, .25, 10, 0, 4.7, .8, metalRoof, cafe, true);
  for (let i = 0; i < 4; i++) { const pot = mesh(new THREE.SphereGeometry(.6, 10, 8), hedge, cafe); pot.position.set(-6 + i * 4, 1.2, 5.2); }

  // ---------- Topiary, trees and dome carport ----------
  function topiary(x, z, s = 1) {
    const g = new THREE.Group(); g.position.set(x, .2, z); g.scale.setScalar(s); model.add(g);
    cylinder(.18, .26, 2.4, 1.2, new THREE.MeshStandardMaterial({ color: '#6c5841' }), g, 8);
    for (const [y, r] of [[1.4, 1.1], [2.5, .9], [3.4, .65]]) { const b = mesh(new THREE.SphereGeometry(r, 12, 8), hedge, g, true); b.position.y = y; b.scale.y = .6; }
  }
  for (const [x, z] of [[-33, 26], [-11, 26], [-36, 14], [-8, 14], [-36, -20], [-8, -22], [14, 20], [38, 14], [14, -6]]) topiary(x, z, 1 + random() * .3);
  const foliage = [new THREE.MeshStandardMaterial({ color: '#557a3e', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#76924f', roughness: 1 })];
  const bark = new THREE.MeshStandardMaterial({ color: '#6c5841', roughness: 1 });
  // Bamboo clumps around the edge — the temple's namesake.
  const bambooMat = new THREE.MeshStandardMaterial({ color: '#8aa14c', roughness: .7 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#6f9a3c', roughness: 1 });
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * Math.PI * 2;
    const x = Math.sin(a) * 68, z = Math.cos(a) * 58;
    if (z > 40 && Math.abs(x) < 20) continue; // keep the entrance open
    const g = new THREE.Group(); g.position.set(x, 0, z); model.add(g);
    for (let k = 0; k < 7; k++) {
      const ox = (random() - .5) * 3, oz = (random() - .5) * 3, h = 9 + random() * 6;
      lineTube([[ox, 0, oz], [ox * 1.4, h * .6, oz * 1.4], [ox * 2.2 + (random() - .5) * 2, h, oz * 2.2]], .12, bambooMat, g);
      const tuft = mesh(new THREE.IcosahedronGeometry(1.4 + random(), 0), leaf, g, true); tuft.position.set(ox * 2.2, h, oz * 2.2); tuft.scale.y = .5;
    }
  }
  for (const [x, z] of [[-56, 36], [56, -38], [-56, -36], [62, 6]]) tree(model, x, z, foliage, bark, 1.4);
  // Dome carport canopy in front of the ubosot (as in the photo).
  const cp = mesh(new THREE.CylinderGeometry(4.5, 4.5, 9, 24, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), metalRoof, model, true);
  cp.position.set(-6, 2.6, 20); cp.scale.y = .5;
  for (const x of [-10, -2]) for (const z of [16, 24]) box(.15, 2.6, .15, x, 1.3, z, steel);
  // Info sign boards (blue / green / red) in front of the ubosot.
  [['#2b4fa0', -14], ['#5ab091', -9], ['#c23b4a', -3.5]].forEach(([c, x]) => {
    box(4.4, 2.2, .15, x, 2.4, 34, new THREE.MeshStandardMaterial({ color: c, roughness: .5 }));
    for (const sx of [-2.1, 2.1]) box(.12, 3.5, .12, x + sx, 1.75, 34, dark);
  });

  // Warm lamps at night.
  const warmLamps = [];
  for (const [x, z] of [[-22, 26], [26, 18], [6, -10], [-10, -30]]) { const l = new THREE.PointLight('#ffd18b', 0, 30, 2); l.position.set(x, 6, z); model.add(l); warmLamps.push(l); }

  return {
    title: 'วัดไผ่ล้อม',
    labels: { front: 'สำรวจวัดไผ่ล้อม', aerial: 'ผังบริเวณวัดไผ่ล้อม (โดยประมาณ)' },
    closeup: { target: new THREE.Vector3(-14, 10, 10), distance: 85 },
    groundY: -.65, shadowSize: 180,
    warmLamps,
    uplights: [{ color: '#ffc27a', power: 1500, pos: [-22, 3, 46], target: [-22, 14, 0] }, { color: '#ffd9a8', power: 1200, pos: [40, 3, 30], target: [26, 8, 4] }],
    hotspots: [
      { key: 'entry', label: 'ทางเข้า', pos: [-6, 2, 48], title: 'ทางเข้าจากซอยวัดไผ่ล้อม', text: 'เลี้ยวจากถนนเพชรเกษมเข้าซอยวัดไผ่ล้อม ทางเข้าอยู่ทางขวาราว 300 เมตร ลานกว้างหน้าอุโบสถใช้เป็นจุดจอดรถ ตำแหน่งในแบบจำลองเป็นการประมาณ' },
      { key: 'gate', label: 'ซุ้มยักษ์', pos: [-22, 11, 31], title: 'ซุ้มประตูและยักษ์ทวารบาล', text: 'ซุ้มประตูหน้าอุโบสถมียักษ์ยืนเฝ้าทั้งสองข้าง ตามคติว่าทวารบาลคอยปกป้องเขตพุทธาวาส' },
      { key: 'ubosot', label: 'อุโบสถ', pos: [-22, 16, 4], title: 'อุโบสถ', text: 'อุโบสถหลังคาซ้อนชั้น หน้าบันแกะสลักปิดทองประดับกระจก เริ่มสร้างราว พ.ศ. 2490 ในสมัยหลวงพ่อพูล ใช้เวลาราว 3 ปี' },
      { key: 'vihara', label: 'วิหาร', pos: [26, 10, 12], title: 'วิหารพระพุทธเมตตาประทานพร', text: 'วิหารเสาประดับกระจกสีทอง ด้านหน้ามีมุขโถงเปิดโล่ง เป็นจุดไหว้พระและขอพรที่ผู้คนแวะมาเป็นประจำ' },
      { key: 'angulimala', label: 'พระองคุลิมาล', pos: [32, 6.5, 22], title: 'พระองคุลิมาลเถระ', text: 'รูปเคารพพระองคุลิมาล พร้อมป้ายคาถาบูชา ผู้คนนิยมสวดขอให้คลาดแคล้วจากภัย และตามความเชื่อทั่วไปมักสวดขอให้คลอดบุตรง่าย ตำแหน่งในแบบจำลองเป็นการประมาณ' },
      { key: 'ahosi', label: 'ขออโหสิกรรม', pos: [44, 5, -18], title: 'ระเบียงพระและจุดขออโหสิกรรม', text: 'ระเบียงยาวหลังคาโค้งเรียงรายด้วยพระพุทธรูปและรูปเคารพหลายองค์ มีป้ายบทสวดอธิษฐานขออโหสิกรรม' },
      { key: 'museum', label: 'ทวารวดี', pos: [6, 18, -14], title: 'นิทรรศการเมืองโบราณทวารวดี', text: 'ภายในวัดมีป้ายนิทรรศการเรื่องจารึกและเหรียญสมัยทวารวดี เช่น จารึกคาถาเยธัมมา และเหรียญ “ศรีทวารวดีศวรปุณยะ” ตำแหน่งอาคารในแบบจำลองเป็นการประมาณ' },
      { key: 'lppool', label: 'หลวงพ่อพูล', pos: [-10, 7, -33], title: 'ศาลาหลวงพ่อพูล อตฺตรกฺโข', text: 'หลวงพ่อพูลเป็นอดีตเจ้าอาวาสผู้พัฒนาวัด ผู้ศรัทธามากราบสักการะสังขารของท่านซึ่งเก็บรักษาไว้ในโลงแก้ว' },
      { key: 'guanyin', label: 'กวนอิม', pos: [28, 8, -40], title: 'โถงพระแม่กวนอิมพันมือ', text: 'โถงหลังคาโค้งขนาดใหญ่ ประดิษฐานพระอวโลกิเตศวรกวนอิมพันมือ มีสิงโตหินเฝ้าด้านหน้า' },
      { key: 'cafe', label: 'ร้านกาแฟ', pos: [46, 5, 30], title: 'ร้านกาแฟในวัด', text: 'ร้านกาแฟหน้าก่ออิฐ ให้นั่งพักหลังไหว้พระ เวลาเปิดอาจไม่ตรงกับเวลาวัด' },
    ],
    topY: spireTop,
  };
}

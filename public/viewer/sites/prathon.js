// Phra Prathon Chedi — artistic reconstruction from reference photos.
// Square, stepped Dvaravati brick base (≈60 m a side) crowned by a white
// Rattanakosin-era prang, total height ≈ 50 m. Units ≈ metres.
import * as THREE from 'three';

export function build(kit) {
  const { model, random, reseed, tileTexture, brickTexture, plasterTexture, mesh, cylinder, box, wbox, lathe, lineTube, sphere, thaiRoof, tree } = kit;
  reseed(4242);
  const brickTex = brickTexture();
  const plasterTex = plasterTexture();
  const pave = tileTexture('floor'); pave.repeat.set(26, 26);
  const roofTex = tileTexture('roof'); roofTex.repeat.set(8, 1);

  const brick = new THREE.MeshStandardMaterial({ map: brickTex, bumpMap: brickTex, bumpScale: .35, roughness: .95, color: '#d9b19c' });
  const brickDark = new THREE.MeshStandardMaterial({ map: brickTex, bumpMap: brickTex, bumpScale: .3, roughness: 1, color: '#b08a78' });
  const plaster = new THREE.MeshStandardMaterial({ map: plasterTex, bumpMap: plasterTex, bumpScale: .05, roughness: .85, color: '#ffffff' });
  const plasterSide = plaster.clone(); plasterSide.side = THREE.DoubleSide;
  const concrete = new THREE.MeshStandardMaterial({ map: pave, roughness: .95, color: '#c9c4b6' });
  const grass = new THREE.MeshStandardMaterial({ color: '#7d8a55', roughness: 1 });
  const steel = new THREE.MeshStandardMaterial({ color: '#c9cdcf', roughness: .35, metalness: .8 });
  const rust = new THREE.MeshStandardMaterial({ color: '#7b3a26', roughness: .6, metalness: .45 });
  const saffron = new THREE.MeshStandardMaterial({ color: '#f08a1c', roughness: .7, side: THREE.DoubleSide });
  const yellowCloth = new THREE.MeshStandardMaterial({ color: '#e8c22c', roughness: .75, side: THREE.DoubleSide, transparent: true, opacity: .92 });
  const gilded = new THREE.MeshStandardMaterial({ color: '#e2b558', roughness: .25, metalness: .72 });
  const cream = new THREE.MeshStandardMaterial({ color: '#f1e7cf', roughness: .8 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2621', roughness: .9 });
  const nicheMat = new THREE.MeshStandardMaterial({ color: '#5a3324', roughness: 1 });
  const redRoof = new THREE.MeshStandardMaterial({ map: roofTex, bumpMap: roofTex, bumpScale: .08, roughness: .6, color: '#e08a5c', side: THREE.DoubleSide });
  const roofEdge = new THREE.MeshStandardMaterial({ color: '#c9a24f', metalness: .4, roughness: .4 });
  const greenTile = new THREE.MeshStandardMaterial({ color: '#3f7a5e', roughness: .5 });
  const roofMats = { roof: redRoof, edge: roofEdge, gilded };

  // Courtyard.
  box(170, .6, 170, 0, -.3, 0, grass);
  const court = mesh(new THREE.BoxGeometry(124, .3, 124), concrete, model); court.position.y = .05;
  for (let i = -6; i <= 6; i++) { box(124, .02, .08, 0, .21, i * 10, dark, model).material = new THREE.MeshStandardMaterial({ color: '#9e998c' }); }

  // ---------- Dvaravati brick base ----------
  // Each tier: main mass, plinth + cornice mouldings, pilasters and a central projection on every face.
  function tier(size, y0, h, opts = {}) {
    const { pil = 4.2, proj = .32, projDepth = 1.4, mat = brick } = opts;
    const yc = y0 + h / 2;
    wbox(size, h, size, 0, yc, 0, mat);
    // Mouldings (สัดส่วนฐานเขียง/บัวคว่ำ simplified as banded ledges).
    wbox(size + .9, .55, size + .9, 0, y0 + .28, 0, brickDark, model, false);
    wbox(size + .5, .3, size + .5, 0, y0 + h * .55, 0, brickDark, model, false);
    wbox(size + 1.1, .5, size + 1.1, 0, y0 + h - .25, 0, brick, model, false);
    for (let f = 0; f < 4; f++) {
      const side = new THREE.Group(); side.rotation.y = f * Math.PI / 2; model.add(side);
      const n = Math.floor(size / pil);
      for (let i = 1; i < n; i++) {
        const x = -size / 2 + i * size / n;
        if (Math.abs(x) < size * proj / 2 + 1) continue;
        wbox(1, h - .9, .45, x, yc, size / 2 + .2, brickDark, side, false);
      }
      // Central projection (มุขยื่น) with a blind niche.
      const pw = size * proj;
      wbox(pw, h, projDepth, 0, yc, size / 2 + projDepth / 2, brick, side);
      wbox(pw + .6, .5, projDepth + .5, 0, y0 + h - .25, size / 2 + projDepth / 2, brick, side, false);
      box(pw * .3, h * .5, .2, 0, y0 + h * .42, size / 2 + projDepth - .08, nicheMat, side);
    }
    // Weathering: broken brick courses and rubble along the upper edges.
    for (let i = 0; i < size * .45; i++) {
      const f = Math.floor(random() * 4), t = (random() - .5) * size;
      const w = .8 + random() * 2.2, hh = .25 + random() * .6;
      const [x, z] = [[t, size / 2 - .6], [size / 2 - .6, t], [t, -size / 2 + .6], [-size / 2 + .6, t]][f];
      const m = wbox(w, hh, 1.2, x, y0 + h + hh / 2 - .05, z, brick, model, false);
      if (f % 2) m.rotation.y = Math.PI / 2;
    }
  }
  tier(66, 0, 1.4, { pil: 6, proj: .2, projDepth: .8, mat: brickDark });
  tier(60, 1.4, 6.4);
  tier(52, 7.8, 4.8);
  tier(44, 12.6, 4.4);
  tier(34, 17, 10, { pil: 3.4, proj: .36, projDepth: 1.8 });
  // Chamfered, crumbled corners on the lower tiers.
  for (const [s, y0, h] of [[60, 1.4, 6.4], [52, 7.8, 4.8], [44, 12.6, 4.4]]) {
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const c = wbox(4.2, h * .7, 4.2, sx * (s / 2 + .2), y0 + h * .35, sz * (s / 2 + .2), brickDark, model, false);
      c.rotation.y = Math.PI / 4;
    }
  }
  // A few tufts of grass and small shrubs growing on the ledges.
  const tuftMat = new THREE.MeshStandardMaterial({ color: '#6f7d3f', roughness: 1 });
  for (let i = 0; i < 46; i++) {
    const [s, y] = [[60, 7.8], [52, 12.6], [44, 17]][i % 3];
    const t = (random() - .5) * s, f = Math.floor(random() * 4);
    const [x, z] = [[t, s / 2 - 1.2], [s / 2 - 1.2, t], [t, -s / 2 + 1.2], [-s / 2 + 1.2, t]][f];
    const m = mesh(new THREE.IcosahedronGeometry(.45 + random() * .5, 0), tuftMat, model); m.position.set(x, y + .3, z); m.scale.y = .55;
  }
  // Yellow protective cloth wrapped around the upper block (as seen on site).
  const clothBand = mesh(new THREE.CylinderGeometry(24.75, 24.75, 1.8, 4, 1, true), yellowCloth, model);
  clothBand.rotation.y = Math.PI / 4; clothBand.position.y = 18.6;

  // ---------- Top terrace with white balustrade ----------
  const ty = 27;
  wbox(35.2, .7, 35.2, 0, ty + .35, 0, plaster, model, true, 6);
  const postGeo = new THREE.BoxGeometry(.42, 1.35, .42), capGeo = new THREE.BoxGeometry(.6, .22, .6), balGeo = new THREE.CylinderGeometry(.07, .1, .8, 6);
  const posts = new THREE.InstancedMesh(postGeo, plaster, 80), caps = new THREE.InstancedMesh(capGeo, plaster, 80), bals = new THREE.InstancedMesh(balGeo, plaster, 520);
  const dm = new THREE.Object3D(); let pi = 0, bi = 0;
  const half = 17.2;
  for (let f = 0; f < 4; f++) {
    for (let i = 0; i <= 14; i++) {
      const t = -half + i * (2 * half / 14);
      const [x, z] = [[t, half], [half, t], [t, -half], [-half, t]][f];
      if (f === 0 && Math.abs(t + 4) < 1.6) continue; // opening for the stair
      dm.position.set(x, ty + 1.37, z); dm.rotation.set(0, 0, 0); dm.updateMatrix(); posts.setMatrixAt(pi, dm.matrix);
      dm.position.y = ty + 2.1; dm.updateMatrix(); caps.setMatrixAt(pi++, dm.matrix);
      if (i < 14) for (let k = 1; k < 6; k++) {
        const tt = t + k * (2 * half / 14) / 6;
        if (f === 0 && Math.abs(tt + 4) < 1.6) continue;
        const [bx, bz] = [[tt, half], [half, tt], [tt, -half], [-half, tt]][f];
        dm.position.set(bx, ty + 1.15, bz); dm.updateMatrix(); bals.setMatrixAt(bi++, dm.matrix);
      }
    }
    const side = new THREE.Group(); side.rotation.y = f * Math.PI / 2; model.add(side);
    box(2 * half, .18, .36, 0, ty + 1.9, half, plaster, side);
    box(2 * half, .14, .36, 0, ty + .76, half, plaster, side);
  }
  posts.count = caps.count = pi; bals.count = bi;
  for (const im of [posts, caps, bals]) { im.castShadow = true; im.receiveShadow = true; model.add(im); }

  // ---------- White prang ----------
  // Redented square (ย่อมุม) built from three overlapping masses.
  function redent(size, h, y, mat, step = size * .12, parent = model) {
    const g = new THREE.Group(); g.position.y = y; parent.add(g);
    wbox(size, h, size - 2 * step, 0, h / 2, 0, mat, g, true, 6);
    wbox(size - 2 * step, h - .02, size, 0, h / 2 - .01, 0, mat, g, true, 6);
    wbox(size - step, h - .04, size - step, 0, h / 2 - .02, 0, mat, g, true, 6);
    return g;
  }
  // Leaf-shaped กลีบขนุน petals.
  const petalShape = new THREE.Shape();
  petalShape.moveTo(-.5, 0); petalShape.quadraticCurveTo(-.55, .55, 0, 1); petalShape.quadraticCurveTo(.55, .55, .5, 0); petalShape.closePath();
  const petalGeo = new THREE.ExtrudeGeometry(petalShape, { depth: .12, bevelEnabled: true, bevelSize: .04, bevelThickness: .04, bevelSegments: 1, curveSegments: 8 });
  function petalRing(size, y, h, w = h * .55) {
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const corner = i % 2 === 1;
      const r = corner ? size * .5 * Math.SQRT2 * .86 : size * .5 + .05;
      const g = new THREE.Group(); g.position.set(Math.sin(a) * r, y, Math.cos(a) * r); g.rotation.y = a; model.add(g);
      const pm = mesh(petalGeo, plasterSide, g, true); pm.scale.set(w * (corner ? 1.05 : .9), h, 1); pm.rotation.x = -.18;
    }
  }
  const py = ty + .7;
  // Bases (ฐานเขียง + ฐานสิงห์ simplified to stacked redented mouldings).
  redent(17, 1.1, py, plaster);
  redent(15.4, .5, py + 1.1, plaster);
  redent(14, 1.2, py + 1.6, plaster);
  redent(15, .45, py + 2.8, plaster);
  redent(13.2, .9, py + 3.25, plaster);
  redent(12.2, .4, py + 4.15, plaster);
  // Body (เรือนธาตุ) with a dark doorway facing the stair.
  const by = py + 4.55, bh = 5.6;
  redent(10.4, bh, by, plaster, 1.1);
  for (let f = 0; f < 4; f++) {
    const side = new THREE.Group(); side.rotation.y = f * Math.PI / 2; model.add(side);
    wbox(3.6, bh + .2, 1, 0, by + bh / 2, 5.4, plaster, side, true, 6);
    box(f === 0 ? 1.9 : 1.6, f === 0 ? 3.4 : 2.8, .2, 0, by + (f === 0 ? 1.7 : 1.9), 5.95, dark, side);
    // Pointed arch over the door.
    lineTube([[-1.4, by + 3.6, 5.95], [-.7, by + 4.3, 5.95], [0, by + 5.3, 5.95], [.7, by + 4.3, 5.95], [1.4, by + 3.6, 5.95]], .14, plaster, side);
  }
  // Saffron cloth wrapped around the body (ห่มผ้า).
  const wrap = mesh(new THREE.CylinderGeometry(8.45, 8.45, 1.25, 4, 1, true), saffron, model); wrap.rotation.y = Math.PI / 4; wrap.position.y = by + bh - 1.1;
  const wrap2 = mesh(new THREE.CylinderGeometry(9.55, 9.6, .7, 4, 1, true), saffron, model); wrap2.rotation.y = Math.PI / 4; wrap2.position.y = py + 3.5;
  // Tiered superstructure (ชั้นซ้อน) with petals.
  let y = by + bh;
  redent(11.2, .45, y, plaster); y += .45;
  const tiers = 7;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const s = 9.4 * (1 - t * .68);
    const h = 2 - t * .7;
    redent(s, h * .72, y, plaster, s * .14);
    redent(s * 1.06, h * .14, y + h * .72, plaster, s * .14);
    petalRing(s * .98, y + h * .25, h * 1.35, s * .26);
    y += h * .86;
  }
  // Pinnacle + trident (นภศูล).
  lathe([[2.6, y], [2.4, y + .5], [1.8, y + 1.1], [1.5, y + 1.6], [1.2, y + 1.9], [.9, y + 2.5], [.5, y + 3.1], [.22, y + 3.5], [0, y + 3.7]], plaster, model, 8);
  y += 3.6;
  const tri = new THREE.MeshStandardMaterial({ color: '#5a5550', metalness: .7, roughness: .4 });
  lineTube([[0, y - .2, 0], [0, y + 3, 0]], .07, tri);
  for (const s of [-1, 1]) lineTube([[0, y + 1.4, 0], [s * .6, y + 1.8, 0], [s * .7, y + 2.7, 0]], .05, tri);
  for (const s of [-1, 1]) lineTube([[0, y + 1.6, 0], [0, y + 2.1, s * .55], [0, y + 2.8, s * .6]], .04, tri);
  const topY = y + 3;

  // ---------- Front steel stair ----------
  const stair = new THREE.Group(); stair.position.x = -4; model.add(stair);
  const steps = 60, z0 = 39, z1 = 17.3, rise = ty + .7;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    box(2.3, .1, .5, 0, t * rise + .45, z0 - t * (z0 - z1), rust, stair);
  }
  const ang = Math.atan2(rise, z0 - z1), len = Math.hypot(rise, z0 - z1);
  for (const sx of [-1.25, 1.25]) {
    const s = box(.14, .5, len, sx, rise / 2 + .2, (z0 + z1) / 2, rust, stair, true); s.rotation.x = ang;
    lineTube([[sx, 1.3, z0], [sx, rise / 2 + 1.1, (z0 + z1) / 2], [sx, rise + 1.1, z1]], .05, rust, stair);
    for (let k = 0; k <= 10; k++) { const t = k / 10; box(.06, 1, .06, sx, t * rise + .9, z0 - t * (z0 - z1), rust, stair); }
  }
  // Support legs down to each tier.
  for (const [zz, yy] of [[33, 1.4], [29, 7.8], [25, 12.6], [21, 17]]) {
    const yAt = (z0 - zz) / (z0 - z1) * rise;
    for (const sx of [-1.1, 1.1]) box(.16, yAt - yy, .16, sx, (yAt + yy) / 2, zz, rust, stair);
  }

  // ---------- Steel fence around the base ----------
  const fenceR = 38;
  for (let f = 0; f < 4; f++) {
    const side = new THREE.Group(); side.rotation.y = f * Math.PI / 2; model.add(side);
    const segs = [[-fenceR, f === 0 ? -6.5 : fenceR]];
    if (f === 0) segs.push([-1.5, fenceR]);
    for (const [a, b] of segs) {
      for (const yy of [.75, 1.25]) lineTube([[a, yy, fenceR], [b, yy, fenceR]], .035, steel, side);
      for (let x = a; x <= b + .01; x += 2.5) box(.08, 1.3, .08, x, .85, fenceR, steel, side);
    }
  }

  // ---------- Front shrines ----------
  // White miniature prang (ถะ) in front of the chedi.
  const mini = new THREE.Group(); mini.position.set(7, .2, 46); mini.scale.setScalar(.9); model.add(mini);
  box(4, 1.6, 4, 0, .8, 0, plaster, mini, true);
  box(3.4, .4, 3.4, 0, 1.8, 0, plaster, mini);
  redent(2.8, 2.6, 2, plaster, .35, mini);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, r = 1.8;
    const g = new THREE.Group(); g.position.set(Math.sin(a) * r, 4.4, Math.cos(a) * r); g.rotation.y = a; mini.add(g);
    const pm = mesh(petalGeo, plasterSide, g, true); pm.scale.set(.7, 1.6, 1); pm.rotation.x = -.2;
  }
  const spire = mesh(new THREE.CylinderGeometry(.5, 1.2, 4.6, 8), plaster, mini, true); spire.position.y = 6.9;
  const tipM = mesh(new THREE.ConeGeometry(.5, 1.1, 8), plaster, mini, true); tipM.position.y = 9.75;

  // Golden chedi wrapped in yellow cloth — a reminder of the golden thanan.
  const goldChedi = new THREE.Group(); goldChedi.position.set(-9, .2, 47); model.add(goldChedi);
  box(3, 1, 3, 0, .5, 0, plaster, goldChedi, true);
  lathe([[1.15, 1], [1.2, 2.6], [1.05, 3.4], [.9, 4.4], [.55, 5.3], [.2, 5.9], [0, 6.1]], gilded, goldChedi, 32);
  const gCloth = mesh(new THREE.CylinderGeometry(1.24, 1.2, .9, 32, 1, true), yellowCloth, goldChedi); gCloth.position.y = 3;
  // Golden thanan (measuring bowl) on a small offering table.
  box(2.2, .9, 1.2, 0, .65, 2.6, cream, goldChedi);
  lathe([[0, 1.1], [.45, 1.1], [.55, 1.35], [.62, 1.65], [.58, 1.75], [0, 1.75]], gilded, goldChedi, 24);
  goldChedi.children.at(-1).position.z = 2.6;
  // Information plaques.
  for (const x of [-18, 18]) { box(3.2, 1.8, .15, x, 1.4, 41, dark, model, true); box(.12, 1, .12, x - 1.2, .5, 41, steel); box(.12, 1, .12, x + 1.2, .5, 41, steel); }

  // ---------- Shrine of Granny Hom (ศาลคุณยายหอม) with duck offerings ----------
  const shrine = new THREE.Group(); shrine.position.set(-48, .2, 22); shrine.rotation.y = Math.PI / 2; model.add(shrine);
  box(11, .8, 9, 0, .4, 0, cream, shrine, true);
  box(9, 4.6, 6.5, 0, 3.1, -.6, cream, shrine, true);
  box(7, 3.6, .1, 0, 2.9, 2.66, new THREE.MeshStandardMaterial({ color: '#3b2b22', roughness: .9 }), shrine);
  for (const x of [-4.2, 4.2]) box(.6, 4.8, .6, x, 3.2, 2.9, cream, shrine, true);
  thaiRoof(shrine, 10.5, 8.6, 5.4, 2.8, { roof: new THREE.MeshStandardMaterial({ color: '#c6563a', roughness: .55, side: THREE.DoubleSide }), edge: roofEdge, gilded });
  // Granny Hom seated, cradling the infant prince.
  const hom = new THREE.Group(); hom.position.set(0, .8, 1.6); shrine.add(hom);
  box(2.6, 1, 1.6, 0, .5, 0, new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: .9 }), hom);
  lathe([[0, 1], [.8, 1], [.85, 1.5], [.6, 2.6], [.3, 2.85], [0, 2.85]], gilded, hom, 24);
  const homHead = sphere(.36, 0, 3.2, 0, gilded, hom, 16); homHead.scale.y = 1.08;
  const redCloth = new THREE.MeshStandardMaterial({ color: '#c42b25', roughness: .7 });
  const lapCloth = sphere(.6, .2, 1.55, .55, redCloth, hom, 16); lapCloth.scale.set(1.3, .6, .8);
  sphere(.2, .45, 2.2, .45, gilded, hom, 12);
  // Ducks: ceramic white ducks and yellow toy ducks offered by visitors.
  const duckWhite = new THREE.MeshStandardMaterial({ color: '#f7f5ef', roughness: .35 });
  const duckYellow = new THREE.MeshStandardMaterial({ color: '#ffd23a', roughness: .35 });
  const beak = new THREE.MeshStandardMaterial({ color: '#ef8a1f', roughness: .5 });
  const scarf = new THREE.MeshStandardMaterial({ color: '#2f8a4e', roughness: .6 });
  function duck(parent, x, z, ry, s, yellow) {
    const g = new THREE.Group(); g.position.set(x, .8, z); g.rotation.y = ry; g.scale.setScalar(s); parent.add(g);
    const body = sphere(.5, 0, .45, 0, yellow ? duckYellow : duckWhite, g, 14); body.scale.set(1, .8, 1.3);
    const head = sphere(.3, 0, 1.05, .35, yellow ? duckYellow : duckWhite, g, 12);
    if (!yellow) { const neck = mesh(new THREE.CylinderGeometry(.16, .22, .5, 10), duckWhite, g); neck.position.set(0, .75, .3); torusNeck(g); }
    const bk = mesh(new THREE.ConeGeometry(.11, .34, 8), beak, g); bk.rotation.x = Math.PI / 2; bk.position.set(0, 1.0, .72);
    for (const sx of [-1, 1]) sphere(.04, sx * .14, 1.12, .58, dark, g, 6);
    return head;
  }
  function torusNeck(g) { const t = mesh(new THREE.TorusGeometry(.2, .05, 6, 16), scarf, g); t.rotation.x = Math.PI / 2; t.position.set(0, .8, .3); }
  for (let i = 0; i < 34; i++) {
    const row = i < 14 ? 0 : i < 26 ? 1 : 2;
    const n = [14, 12, 8][row], k = row === 0 ? i : row === 1 ? i - 14 : i - 26;
    const x = (k - (n - 1) / 2) * .8 + (random() - .5) * .2;
    const z = 4.2 - row * .05 + (row === 2 ? 1.2 : row * .6);
    duck(shrine, x, z + (random() - .5) * .3, (random() - .5) * .8, .55 + random() * .25, random() < .35);
  }

  // ---------- Vihara of Luang Pho (วิหาร) ----------
  const vihara = new THREE.Group(); vihara.position.set(50, .2, -5); model.add(vihara);
  box(14, 1, 22, 0, .5, 0, cream, vihara, true);
  box(11.5, 7, 19, 0, 4.5, 0, cream, vihara, true);
  for (let i = -3; i <= 3; i++) { box(.1, 2.6, 1.2, 5.8, 4.6, i * 2.6, new THREE.MeshStandardMaterial({ color: '#c0392b' }), vihara); box(.1, 2.6, 1.2, -5.8, 4.6, i * 2.6, new THREE.MeshStandardMaterial({ color: '#c0392b' }), vihara); }
  box(4, 5, .15, 0, 3.5, 9.55, new THREE.MeshStandardMaterial({ color: '#b5332a', roughness: .5 }), vihara);
  lineTube([[-2.5, 6.3, 9.6], [-1.2, 7.4, 9.6], [0, 9, 9.6], [1.2, 7.4, 9.6], [2.5, 6.3, 9.6]], .14, gilded, vihara);
  for (const x of [-5.6, 5.6]) box(.8, 7.4, .8, x, 4.7, 9.6, cream, vihara, true);
  thaiRoof(vihara, 14, 23, 8, 4.6, roofMats);
  thaiRoof(vihara, 11, 15, 11.2, 3.6, { roof: greenTile, edge: roofEdge, gilded });
  for (let i = 0; i < 6; i++) box(6, .22, .9, 0, .2 + i * .15, 11.6 + 2.5 - i * .9, cream, vihara);

  // Trees around the precinct.
  const foliage = [new THREE.MeshStandardMaterial({ color: '#5d7a45', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#7f9256', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#4f6a3c', roughness: 1 })];
  const bark = new THREE.MeshStandardMaterial({ color: '#6c5841', roughness: 1 });
  for (let i = 0; i < 30; i++) {
    const a = i / 30 * Math.PI * 2 + .2, r = 66 + random() * 10;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (Math.abs(x) > 82 || Math.abs(z) > 82) continue;
    tree(model, x, z, foliage, bark, 1.1 + random() * .5);
  }
  // Palm trees like those beside the chedi.
  const palm = new THREE.MeshStandardMaterial({ color: '#4d7a3a', roughness: .9, side: THREE.DoubleSide });
  for (const [x, z] of [[44, -34], [-40, -36], [54, 34]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); model.add(g);
    lineTube([[0, 0, 0], [.4, 6, .2], [.2, 12, .5]], .32, bark, g, true);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      lineTube([[.2, 12, .5], [.2 + Math.sin(a) * 2.2, 12.6, .5 + Math.cos(a) * 2.2], [.2 + Math.sin(a) * 3.8, 11.2, .5 + Math.cos(a) * 3.8]], .22, palm, g);
    }
  }
  // Low lamp posts along the approach.
  const warmLamps = [];
  for (const x of [-12, 12]) for (const z of [56, 66]) {
    const g = new THREE.Group(); g.position.set(x, .2, z); model.add(g);
    cylinder(.12, .18, 3.4, 1.7, dark, g, 10);
    sphere(.35, 0, 3.6, 0, new THREE.MeshStandardMaterial({ color: '#fff1d2', emissive: '#ffcf8a', emissiveIntensity: .4 }), g, 12);
    const l = new THREE.PointLight('#ffd18b', 0, 30, 2); l.position.set(0, 3.8, 0); g.add(l); warmLamps.push(l);
  }

  return {
    title: 'พระประโทณเจดีย์',
    labels: { front: 'สำรวจพระประโทณเจดีย์', aerial: 'ผังบริเวณวัดพระประโทณเจดีย์' },
    closeup: { target: new THREE.Vector3(0, 30, 0), distance: 95 },
    groundY: -.65, shadowSize: 190,
    warmLamps,
    uplights: [{ color: '#ffbe78', power: 1800, pos: [30, 4, 60], target: [0, 30, 0] }, { color: '#ffd9a8', power: 1300, pos: [-45, 4, -45], target: [0, 25, 0] }],
    hotspots: [
      { key: 'entry', label: 'บันไดขึ้น', pos: [-4, 14, 30], title: 'บันไดเหล็กด้านหน้า', text: 'บันไดเหล็กพาดขึ้นสู่ลานด้านบนองค์เจดีย์ การขึ้นชมขึ้นอยู่กับประกาศของวัด โปรดตรวจสอบป้ายหน้างานและระวังความชัน' },
      { key: 'dvaravati', label: 'ฐานทวารวดี', pos: [24, 9, 24], title: 'ฐานอิฐสมัยทวารวดี', text: 'ฐานสี่เหลี่ยมก่ออิฐซ้อนชั้น มีเสาประดับและมุขยื่นทุกด้าน กรมศิลปากรบูรณะให้กลับสู่รูปแบบทวารวดีในปี 2542 (ค.ศ. 1999)' },
      { key: 'history', label: 'ยอดปรางค์', pos: [0, topY - 10, 0], title: 'ปรางค์บนยอดเจดีย์', text: 'ปรางค์สีขาวบนยอดสร้างเพิ่มในสมัยรัชกาลที่ 4 ห่มผ้าสีส้มโดยผู้ศรัทธาที่มาขอพรแล้วสมหวัง' },
      { key: 'thanan', label: 'ทะนานทอง', pos: [-9, 5, 47], title: 'ตำนานทะนานทอง', text: 'ชื่อ “ประโทณ” มาจาก “โทณะ” แปลว่าทะนาน ตำนานเล่าว่าพราหมณ์ใช้ทะนานทองตวงแบ่งพระบรมสารีริกธาตุ และเจดีย์นี้สร้างเพื่อบรรจุทะนานทองนั้น' },
      { key: 'yaihom', label: 'ศาลยายหอม', pos: [-45, 5, 22], title: 'ศาลคุณยายหอม', text: 'ผู้ศรัทธานำตุ๊กตาเป็ดมาถวาย เพราะตำนานเล่าว่ายายหอมเลี้ยงเป็ดและเป็นผู้เลี้ยงดูพระยาพานในวัยเด็ก' },
      { key: 'pray', label: 'จุดไหว้', pos: [0, 4, 44], title: 'จุดไหว้และขอพร', text: 'ผู้มาเยือนนิยมขอพรเรื่องโชคลาภ สุขภาพ และความเป็นสิริมงคลของครอบครัว เมื่อสมหวังมักนำผ้ามาห่มองค์เจดีย์' },
      { key: 'vihara', label: 'วิหาร', pos: [50, 8, 6], title: 'วิหารหลวงพ่อ', text: 'ภายในวิหารประดิษฐานพระพุทธรูปองค์ใหญ่ห่มจีวรสีส้ม พร้อมพระพุทธรูปและรูปเคารพหลายองค์ ในแบบจำลองแสดงเฉพาะภายนอก' },
    ],
  };
}

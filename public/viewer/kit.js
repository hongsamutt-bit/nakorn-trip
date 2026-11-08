// Shared geometry/material helpers for every temple scene.
import * as THREE from 'three';

export function createKit(renderer, model) {
  let seed = 137;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const reseed = s => { seed = s; };
  const aniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
  // Low-poly budget: every round shape is capped so phones stay smooth.
  const TEX = 512;
  const seg = (n, max) => Math.max(3, Math.min(n, max));

  function finishTexture(c) {
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = aniso;
    return tex;
  }

  // Glazed tiles (gold), roof tiles (roof) and paving (floor).
  function tileTexture(kind = 'gold') {
    const c = document.createElement('canvas'); c.width = c.height = TEX;
    const x = c.getContext('2d'); x.scale(TEX / 1024, TEX / 1024);
    const roof = kind === 'roof', floor = kind === 'floor';
    x.fillStyle = floor ? '#b8b5a6' : roof ? '#643e23' : '#7b542a'; x.fillRect(0, 0, 1024, 1024);
    const tw = floor ? 128 : roof ? 32 : 64, th = floor ? 128 : roof ? 64 : 32;
    for (let row = 0; row < 1024 / th + 1; row++) {
      for (let col = -1; col < 1024 / tw + 1; col++) {
        const px = col * tw + (row % 2 ? tw / 2 : 0), py = row * th;
        const hue = floor ? 44 : roof ? 18 + random() * 7 : 31 + random() * 6;
        const lightness = floor ? 70 + random() * 14 : roof ? 29 + random() * 16 : 40 + random() * 13;
        x.fillStyle = `hsl(${hue},${floor ? 13 : roof ? 48 : 61}%,${lightness}%)`;
        x.fillRect(px + 1, py + 1, tw - 2, th - 2);
        x.fillStyle = '#ffffff13'; x.fillRect(px + 2, py + 2, tw - 4, 1);
        x.fillStyle = '#00000014'; x.fillRect(px + 2, py + th - 3, tw - 4, 1);
        if (!floor) {
          const grad = x.createLinearGradient(px, py, px + tw, py + th);
          grad.addColorStop(0, '#fff4b115'); grad.addColorStop(.45, '#ffffff00'); grad.addColorStop(1, '#39210018');
          x.fillStyle = grad; x.fillRect(px + 2, py + 2, tw - 4, th - 4);
        }
      }
    }
    for (let i = 0; i < 18000; i++) {
      x.fillStyle = random() > .5 ? '#fff5d510' : '#231d1509';
      x.fillRect(random() * 1024, random() * 1024, 1 + random() * 2, 1);
    }
    return finishTexture(c);
  }

  // Weathered Dvaravati brick: long thin bricks, dark mortar, soot and lichen stains.
  function brickTexture() {
    const c = document.createElement('canvas'); c.width = c.height = TEX;
    const x = c.getContext('2d'); x.scale(TEX / 1024, TEX / 1024);
    x.fillStyle = '#5a2f1d'; x.fillRect(0, 0, 1024, 1024);
    const bw = 64, bh = 20;
    for (let row = 0; row < 1024 / bh; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < 1024 / bw + 1; col++) {
        const px = col * bw + off + (random() - .5) * 3, py = row * bh;
        const l = 34 + random() * 20, h = 12 + random() * 12, s = 48 + random() * 18;
        x.fillStyle = `hsl(${h},${s}%,${l}%)`;
        x.fillRect(px + 2, py + 2, bw - 3 - random() * 3, bh - 3);
        if (random() < .18) { x.fillStyle = '#2a14081f'; x.fillRect(px + 2, py + 2, bw - 4, bh - 4); }
        if (random() < .1) { x.fillStyle = '#f2b38a22'; x.fillRect(px + 4, py + 3, bw - 12, 3); }
      }
    }
    // Rain streaks and soot.
    for (let i = 0; i < 90; i++) {
      const sx = random() * 1024, w = 6 + random() * 30, len = 120 + random() * 500;
      const g = x.createLinearGradient(sx, 0, sx, len);
      g.addColorStop(0, '#1d120c30'); g.addColorStop(1, '#1d120c00');
      x.fillStyle = g; x.fillRect(sx, random() * 400, w, len);
    }
    for (let i = 0; i < 140; i++) {
      x.fillStyle = random() > .5 ? '#5d6a3a22' : '#2c241618';
      x.beginPath(); x.arc(random() * 1024, random() * 1024, 4 + random() * 22, 0, Math.PI * 2); x.fill();
    }
    for (let i = 0; i < 16000; i++) {
      x.fillStyle = random() > .5 ? '#ffd8b80d' : '#1b0e0812';
      x.fillRect(random() * 1024, random() * 1024, 1 + random() * 2, 1);
    }
    return finishTexture(c);
  }

  // Lime plaster with grime gathering under every ledge.
  function plasterTexture() {
    const c = document.createElement('canvas'); c.width = c.height = TEX / 2;
    const x = c.getContext('2d'); x.scale(TEX / 1024, TEX / 1024);
    x.fillStyle = '#efede6'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) {
      x.fillStyle = random() > .55 ? '#9a978d14' : '#ffffff22';
      x.beginPath(); x.arc(random() * 512, random() * 512, 3 + random() * 26, 0, Math.PI * 2); x.fill();
    }
    for (let i = 0; i < 40; i++) {
      const sx = random() * 512, len = 40 + random() * 220;
      const g = x.createLinearGradient(sx, 0, sx, len); g.addColorStop(0, '#4e4b4322'); g.addColorStop(1, '#4e4b4300');
      x.fillStyle = g; x.fillRect(sx, random() * 300, 2 + random() * 8, len);
    }
    for (let i = 0; i < 9000; i++) { x.fillStyle = random() > .5 ? '#0000000a' : '#ffffff12'; x.fillRect(random() * 512, random() * 512, 1, 1); }
    return finishTexture(c);
  }

  // Box UVs scaled to world size so bricks stay the same size on every face.
  function worldUV(geo, w, h, d, s) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const face = Math.floor(i / 4);
      const [su, sv] = face < 2 ? [d, h] : face < 4 ? [w, d] : [w, h];
      uv.setXY(i, uv.getX(i) * su / s, uv.getY(i) * sv / s);
    }
    uv.needsUpdate = true;
    return geo;
  }

  function mesh(geometry, material, parent = model, cast = false) {
    const m = new THREE.Mesh(geometry, material); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
  }
  function cylinder(r1, r2, height, y, material, parent = model, radial = 28) {
    const m = mesh(new THREE.CylinderGeometry(r1, r2, height, seg(radial, 28)), material, parent); m.position.y = y; return m;
  }
  function box(w, h, d, x, y, z, material, parent = model, cast = false) {
    const m = mesh(new THREE.BoxGeometry(w, h, d), material, parent, cast); m.position.set(x, y, z); return m;
  }
  // Box whose texture keeps real-world scale (s metres per texture tile).
  function wbox(w, h, d, x, y, z, material, parent = model, cast = true, s = 4) {
    const m = mesh(worldUV(new THREE.BoxGeometry(w, h, d), w, h, d, s), material, parent, cast); m.position.set(x, y, z); return m;
  }
  function lathe(points, material, parent = model, segments = 36, cast = true) {
    return mesh(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(...p)), seg(segments, 36)), material, parent, cast);
  }
  function torus(radius, tube, y, material, parent = model, segments = 36) {
    const m = mesh(new THREE.TorusGeometry(radius, tube, 4, seg(segments, 36)), material, parent); m.rotation.x = Math.PI / 2; m.position.y = y; return m;
  }
  function lineTube(points, radius, material, parent = model, cast = false) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 8, radius, 4, false), material, parent, cast);
  }
  function sphere(r, x, y, z, material, parent = model, n = 10) {
    const m = mesh(new THREE.SphereGeometry(r, seg(n, 10), seg(n * .6 | 0, 6)), material, parent, true); m.position.set(x, y, z); return m;
  }

  // Thai gable roof with chofa, bai raka and hang hong ornaments.
  function thaiRoof(parent, w, d, y, h, mats) {
    const { roof, edge, gilded } = mats;
    const profile = [[-w / 2, 0], [-w * .38, h * .12], [-w * .19, h * .57], [0, h], [w * .19, h * .57], [w * .38, h * .12], [w / 2, 0]];
    const verts = [], uv = [];
    for (let i = 0; i < profile.length - 1; i++) {
      const [x1, y1] = profile[i], [x2, y2] = profile[i + 1];
      verts.push(x1, y + y1, -d / 2, x2, y + y2, -d / 2, x1, y + y1, d / 2, x2, y + y2, -d / 2, x2, y + y2, d / 2, x1, y + y1, d / 2);
      uv.push(i / 6, 0, (i + 1) / 6, 0, i / 6, 1, (i + 1) / 6, 0, (i + 1) / 6, 1, i / 6, 1);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals(); mesh(geo, roof, parent, true);
    const gableMat = edge.clone(); gableMat.side = THREE.DoubleSide;
    for (const z of [-d / 2, d / 2]) {
      lineTube(profile.map(([px, py]) => [px, y + py + .08, z]), .12, edge, parent);
      for (const sign of [-1, 1]) lineTube([[sign * w * .48, y + .05, z], [sign * w * .53, y + .45, z], [sign * w * .54, y + 1.45, z], [sign * w * .51, y + 2.1, z]], .1, gilded, parent);
      lineTube([[0, y + h - .2, z], [0, y + h + 1, z], [0, y + h + 2.2, z - .25], [0, y + h + 3.2, z - .75]], .16, gilded, parent);
      const s = new THREE.Shape(); s.moveTo(-w * .39, 0); s.lineTo(0, h - .25); s.lineTo(w * .39, 0); s.closePath();
      const gable = mesh(new THREE.ShapeGeometry(s), gableMat, parent); gable.position.set(0, y + .05, z);
      for (let j = -3; j <= 3; j++) lineTube([[j * w * .075, y + .4, z + .04], [j * w * .04, y + h * .6 - Math.abs(j) * .28, z + .04], [0, y + h - .5, z + .04]], .045, gilded, parent);
    }
    lineTube([[0, y + h, -d / 2], [0, y + h + .15, 0], [0, y + h, d / 2]], .15, edge, parent);
  }

  // Small seated/standing tree used to frame both precincts.
  function tree(parent, x, z, foliage, bark, scale = 1) {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(scale); parent.add(t);
    const h = 3 + random() * 2;
    cylinder(.3, .5, h, h / 2, bark, t, 8);
    for (let j = 0; j < 3; j++) {
      const m = mesh(new THREE.IcosahedronGeometry(2 + random() * .8, 0), foliage[j % foliage.length], t, true);
      m.position.set((random() - .5) * 2.7, h + j * .6, (random() - .5) * 2.7); m.scale.y = .85;
    }
    return t;
  }

  return { THREE, model, random, reseed, tileTexture, brickTexture, plasterTexture, worldUV, mesh, cylinder, box, wbox, lathe, torus, lineTube, sphere, thaiRoof, tree };
}

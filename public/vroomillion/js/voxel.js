// 3D voxel cars for the garage turntable, built from each car's own pixel art: a block is solid where
// both the side view and the rear view are painted (the shape you'd get carving the side profile, then
// the rear profile, out of one block). Each visible face takes its colour from the view that sees it.

const pixels = (cv) => {
  // sample at the sprite's logical size (hi-res sprites are drawn at 2x)
  const res = cv.res || 1;
  const w = Math.max(1, Math.round(cv.width / res)), h = Math.max(1, Math.round(cv.height / res));
  const t = document.createElement("canvas");
  t.width = w; t.height = h;
  const g = t.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(cv, 0, 0, w, h);
  return { w, h, d: g.getImageData(0, 0, w, h).data };
};

// face normals: +x front, -x back, +y up, +z / -z the two sides
const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]];

export function voxelModel(side, rear) {
  const S = pixels(side), R = pixels(rear);
  const L = S.w, H = S.h;
  const k = R.h / H; // rear pixels per voxel, vertically and across
  const D = Math.max(4, Math.round(R.w / k));
  const at = (P, x, y) => { const i = (y * P.w + x) * 4; return P.d[i + 3] > 40 ? i : -1; };
  const rearAt = (z, y) => at(R, Math.min(R.w - 1, Math.floor((z + 0.5) * k)), Math.min(R.h - 1, Math.floor((y + 0.5) * k)));
  const solid = new Uint8Array(L * H * D);
  const idx = (x, y, z) => (y * L + x) * D + z;
  for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
    if (at(S, x, y) < 0) continue;
    for (let z = 0; z < D; z++) if (rearAt(z, y) >= 0) solid[idx(x, y, z)] = 1;
  }
  const filled = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < L && y < H && z < D && solid[idx(x, y, z)];
  const colours = [], colourOf = new Map();
  const col = (r, g, b) => { const key = (r << 16) | (g << 8) | b; if (!colourOf.has(key)) { colourOf.set(key, colours.length); colours.push([r, g, b]); } return colourOf.get(key); };
  const faces = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) for (let z = 0; z < D; z++) {
    if (!solid[idx(x, y, z)]) continue;
    // sprite x runs back to front (the cars face right), so +x is the nose
    for (let n = 0; n < NORMALS.length; n++) {
      const [nx, ny, nz] = NORMALS[n];
      if (filled(x + nx, y - ny, z + nz)) continue; // y in the sprite grows downwards
      let i, P;
      if (n >= 3) { P = S; i = at(S, x, y); } // the sides: the side view
      else if (n === 2) { P = S; i = at(S, x, y); } // the roof: the top of the side view
      else { P = R; i = rearAt(n === 1 ? z : D - 1 - z, y); } // front and back: the rear view
      if (i < 0) continue;
      let r = P.d[i], g = P.d[i + 1], b = P.d[i + 2];
      if (n === 0 && r > 170 && g < 110 && b < 110) { r = 255; g = 243; b = 192; } // tail lights become headlights
      if (n === 2) { r = Math.min(255, r * 1.05); g = Math.min(255, g * 1.05); b = Math.min(255, b * 1.05); }
      faces.push({ x: x - L / 2 + 0.5, y: H - y - 0.5, z: z - D / 2 + 0.5, n, c: col(r | 0, g | 0, b | 0) });
    }
  }
  return { faces, colours, L, H, D, styles: new Map() };
}

// the eight corners of a unit block, and which four make each face
const CORNERS = [];
for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) CORNERS.push([x, y, z]);
const ci = (x, y, z) => (x > 0 ? 4 : 0) + (y > 0 ? 2 : 0) + (z > 0 ? 1 : 0);
const QUADS = [
  [ci(1, -1, -1), ci(1, 1, -1), ci(1, 1, 1), ci(1, -1, 1)],
  [ci(-1, -1, -1), ci(-1, 1, -1), ci(-1, 1, 1), ci(-1, -1, 1)],
  [ci(-1, 1, -1), ci(1, 1, -1), ci(1, 1, 1), ci(-1, 1, 1)],
  [ci(-1, -1, 1), ci(1, -1, 1), ci(1, 1, 1), ci(-1, 1, 1)],
  [ci(-1, -1, -1), ci(1, -1, -1), ci(1, 1, -1), ci(-1, 1, -1)],
];
const LIGHT = (() => { const v = [-0.45, 0.8, -0.55], m = Math.hypot(...v); return v.map((a) => a / m); })();

// Draws the model with its middle-bottom at (cx, by), `size` canvas pixels per block, turned by `yaw`
// and seen from a little above (`pitch`, radians).
export function drawVoxel(g, m, cx, by, size, yaw, pitch = 0.32) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  // world point -> screen (x, y) and depth (bigger = further away)
  const proj = (x, y, z) => {
    const xr = x * cy + z * sy, zr = -x * sy + z * cy;
    return [xr, -(y * cp) - zr * sp, zr * cp - y * sp];
  };
  const corner = CORNERS.map(([x, y, z]) => proj(x * 1.04, y * 1.04, z * 1.04)); // a hair oversized: no seams
  // which faces point at the camera, and how brightly each is lit
  const view = [0, sp, -cp];
  const seen = [], light = [];
  NORMALS.forEach(([x, y, z], n) => {
    const xr = x * cy + z * sy, zr = -x * sy + z * cy;
    seen[n] = xr * view[0] + y * view[1] + zr * view[2] > 0.02;
    light[n] = Math.round((0.5 + 0.5 * Math.max(0, xr * LIGHT[0] + y * LIGHT[1] + zr * LIGHT[2])) * 20);
  });
  const list = [];
  for (const f of m.faces) {
    if (!seen[f.n]) continue;
    const p = proj(f.x, f.y, f.z);
    list.push(p[2], p[0], p[1], f.n, f.c);
  }
  const order = [];
  for (let i = 0; i < list.length; i += 5) order.push(i);
  order.sort((a, b) => list[b] - list[a]);
  g.save();
  g.translate(cx, by);
  g.scale(size, size);
  for (const i of order) {
    const n = list[i + 3], c = list[i + 4], sx = list[i + 1], syy = list[i + 2];
    const key = c * 32 + light[n];
    let st = m.styles.get(key);
    if (!st) { const [r, gg, b] = m.colours[c], k = light[n] / 20; st = `rgb(${(r * k) | 0},${(gg * k) | 0},${(b * k) | 0})`; m.styles.set(key, st); }
    g.fillStyle = st;
    const q = QUADS[n];
    g.beginPath();
    g.moveTo(sx + corner[q[0]][0], syy + corner[q[0]][1]);
    g.lineTo(sx + corner[q[1]][0], syy + corner[q[1]][1]);
    g.lineTo(sx + corner[q[2]][0], syy + corner[q[2]][1]);
    g.lineTo(sx + corner[q[3]][0], syy + corner[q[3]][1]);
    g.fill();
  }
  g.restore();
}

import * as THREE from 'three';
import { rng } from './rng.js';
import { face } from './face.js';
import { t, redrawable } from './i18n.js';

const KAI = '"Kaiti SC","STKaiti","KaiTi",serif';
const HEI = '"Heiti SC","PingFang SC","Microsoft YaHei",sans-serif';

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
export function rep(t, sx, sy = sx) {
  const c = t.clone();
  c.repeat.set(sx, sy);
  c.needsUpdate = true;
  return c;
}

const S = 512, N = 8, CELL = S / N;

// shared relief for every tiled surface: flat glazed faces, recessed rough grout
let _relief;
export function tileRelief() {
  if (_relief) return _relief;
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const tx = x % CELL, ty = y % CELL;
      const d = Math.min(tx, CELL - 1 - tx, ty, CELL - 1 - ty);
      const k = Math.min(Math.max((d - 1.2) / 3, 0), 1);
      h[y * S + x] = k * k * (3 - 2 * k);
    }
  const [nc, nx] = cv(S, S), [rc, rx] = cv(S, S);
  const ni = nx.createImageData(S, S), ri = rx.createImageData(S, S);
  const R = rng(3);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x, o = i * 4;
      const dx = h[y * S + ((x + 1) % S)] - h[y * S + ((x + S - 1) % S)];
      const dy = h[((y + 1) % S) * S + x] - h[((y + S - 1) % S) * S + x];
      const vx = -dx * 2.2, vy = dy * 2.2, l = Math.hypot(vx, vy, 1);
      ni.data[o] = (vx / l) * 127 + 128;
      ni.data[o + 1] = (vy / l) * 127 + 128;
      ni.data[o + 2] = (1 / l) * 127 + 128;
      ni.data[o + 3] = 255;
      const rough = 0.86 - h[i] * 0.66 + (R() - 0.5) * 0.05;
      ri.data[o] = ri.data[o + 1] = ri.data[o + 2] = rough * 255;
      ri.data[o + 3] = 255;
    }
  nx.putImageData(ni, 0, 0);
  rx.putImageData(ri, 0, 0);
  _relief = { normal: tex(nc, false), rough: tex(rc, false) };
  return _relief;
}

export function tileColor({ tile, vary = 6, grout = [168, 172, 168], seed = 1, grime = 0.5 }) {
  const R = rng(seed);
  const [c, x] = cv(S, S);
  x.fillStyle = `rgb(${grout})`;
  x.fillRect(0, 0, S, S);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const v = (R() - 0.5) * 2 * vary, w = (R() - 0.5) * vary;
      x.fillStyle = `rgb(${tile[0] + v | 0},${tile[1] + v + w * 0.4 | 0},${tile[2] + v - w | 0})`;
      x.fillRect(i * CELL + 2, j * CELL + 2, CELL - 4, CELL - 4);
      if (R() < 0.05) {
        x.fillStyle = 'rgba(120,112,90,0.10)';
        x.fillRect(i * CELL + 2, j * CELL + 2, CELL - 4, CELL - 4);
      }
    }
  // soap scum and mineral blooms
  for (let i = 0; i < 26; i++) {
    const px = R() * S, py = R() * S, r = 30 + R() * 110;
    for (const ox of [-S, 0, S])
      for (const oy of [-S, 0, S]) {
        const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
        const a = grime * (0.04 + R() * 0.05);
        g.addColorStop(0, R() > 0.5 ? `rgba(150,140,110,${a})` : `rgba(255,255,255,${a})`);
        g.addColorStop(1, 'rgba(128,128,128,0)');
        x.fillStyle = g;
        x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2);
      }
  }
  return tex(c);
}

export function ceilTex() {
  const [c, x] = cv(256, 256);
  x.fillStyle = '#dfe3e0';
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(120,128,126,0.55)';
  x.lineWidth = 2;
  x.strokeRect(0, 0, 256, 256);
  const R = rng(8);
  for (let i = 0; i < 500; i++) {
    x.fillStyle = `rgba(90,96,94,${R() * 0.12})`;
    x.fillRect(R() * 256, R() * 256, 1.5, 1.5);
  }
  return tex(c);
}

export function lockerTex() {
  const [c, x] = cv(256, 512);
  x.fillStyle = '#6f7f8a';
  x.fillRect(0, 0, 256, 512);
  const R = rng(15);
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 2; i++) {
      const ox = i * 128, oy = j * 256;
      x.fillStyle = `rgb(${150 + R() * 8 | 0},${176 + R() * 8 | 0},${190 + R() * 8 | 0})`;
      x.fillRect(ox + 4, oy + 4, 120, 248);
      x.strokeStyle = 'rgba(40,55,65,0.6)';
      x.lineWidth = 2;
      x.strokeRect(ox + 4, oy + 4, 120, 248);
      x.fillStyle = 'rgba(40,55,65,0.55)';
      for (let k = 0; k < 4; k++) x.fillRect(ox + 34, oy + 26 + k * 9, 60, 3);
      x.fillStyle = '#d9dcd4';
      x.fillRect(ox + 44, oy + 76, 40, 16);
      x.fillStyle = '#3d4a52';
      x.fillRect(ox + 100, oy + 124, 8, 22);
      x.fillStyle = `rgba(60,50,30,${0.05 + R() * 0.1})`;
      x.fillRect(ox + 4, oy + 210, 120, 42);
    }
  return tex(c);
}

export function stripeTex(a, b, n = 8) {
  const [c, x] = cv(256, 32);
  for (let i = 0; i < n; i++) {
    x.fillStyle = i % 2 ? a : b;
    x.fillRect((i * 256) / n, 0, 256 / n + 1, 32);
  }
  return tex(c);
}

// inside of a closed slide: joints between sections let light in
export function tubeTex(col) {
  const [c, x] = cv(256, 64);
  x.fillStyle = col;
  x.fillRect(0, 0, 256, 64);
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.28)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0.28)');
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 64);
  x.fillStyle = 'rgba(255,255,255,0.85)';
  x.fillRect(0, 0, 5, 64);
  x.fillStyle = 'rgba(0,0,0,0.3)';
  x.fillRect(5, 0, 4, 64);
  return tex(c);
}

export function sign(lines, { w = 512, h = 160, bg = '#1f4f7a', fg = '#f2f1e8', size = 64, font = HEI, border = true } = {}) {
  const [c, x] = cv(w, h);
  const out = tex(c, true, false);
  redrawable(() => {
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    if (border) {
      x.strokeStyle = fg;
      x.lineWidth = 5;
      x.strokeRect(9, 9, w - 18, h - 18);
    }
    x.fillStyle = fg;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    lines = [].concat(lines);
    lines.forEach((l, i) => {
      x.font = `${l.size || size}px ${l.font || font}`;
      x.fillText(t(l.t || l), w / 2, (h * (i + 1)) / (lines.length + 1) + 3, w - 34);
    });
    out.needsUpdate = true;
  });
  return out;
}

export function nameTag(name) {
  const [c, x] = cv(256, 96);
  const out = tex(c, true, false);
  redrawable(() => {
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = '#f3efe2';
    x.fillRect(0, 0, 256, 96);
    x.fillStyle = '#22211e';
    x.font = `60px ${KAI}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.save();
    x.translate(128, 50);
    x.rotate(-0.04);
    x.fillText(t(name), 0, 0, 236);
    x.restore();
    out.needsUpdate = true;
  });
  return out;
}

export function towelTex() {
  const [c, x] = cv(64, 256);
  x.fillStyle = '#c9463c';
  x.fillRect(0, 0, 64, 256);
  x.fillStyle = '#f1ead6';
  for (let y = 10; y < 256; y += 34) x.fillRect(0, y, 64, 12);
  return tex(c, true, false);
}

// a wet mark: dark, soft-edged
function wetBlob(x, cx, cy, rx, ry, rot, a) {
  x.save();
  x.translate(cx, cy);
  x.rotate(rot);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(10,22,26,${a})`);
  g.addColorStop(0.75, `rgba(10,22,26,${a * 0.85})`);
  g.addColorStop(1, 'rgba(10,22,26,0)');
  x.scale(rx, ry);
  x.fillStyle = g;
  x.beginPath();
  x.arc(0, 0, 1, 0, 6.3);
  x.fill();
  x.restore();
}
export function footprintTex() {
  const [c, x] = cv(64, 128);
  wetBlob(x, 32, 44, 20, 36, 0, 0.5);
  wetBlob(x, 32, 100, 15, 20, 0, 0.5);
  return tex(c, true, false);
}
export function handprintTex() {
  const [c, x] = cv(256, 512);
  wetBlob(x, 128, 410, 58, 70, 0, 0.62);
  const f = [[-52, -0.2, 250], [-18, -0.06, 330], [18, 0.05, 345], [52, 0.2, 290]];
  for (const [ox, rot, len] of f) {
    x.save();
    x.translate(128 + ox, 370);
    x.rotate(rot);
    for (let k = 0; k < 10; k++) wetBlob(x, Math.sin(k) * 2, -(len * k) / 10, 13 - k * 0.5, len / 14, 0, 0.5);
    x.restore();
  }
  x.save();
  x.translate(72, 430);
  x.rotate(-1.0);
  for (let k = 0; k < 6; k++) wetBlob(x, 0, -k * 22, 13, 16, 0, 0.5);
  x.restore();
  return tex(c, true, false);
}

// the thing in the water, as a seven-year-old would draw it and then wish they hadn't
export function scribbleFrames(n = 5) {
  const out = [];
  for (let f = 0; f < n; f++) {
    const R = rng(900 + f * 17);
    const [c, x] = cv(512, 768);
    const j = () => (R() - 0.5) * 7;
    x.lineCap = 'round';
    const mass = (cx, cy, rx, ry, count, wMin, wMax) => {
      for (let i = 0; i < count; i++) {
        const a = R() * 6.283, b = a + 1.5 + R() * 3.2;
        const r1 = Math.sqrt(R()), r2 = Math.sqrt(R());
        x.strokeStyle = `rgba(${R() * 14 | 0},${R() * 14 | 0},${R() * 18 | 0},${0.35 + R() * 0.5})`;
        x.lineWidth = wMin + R() * (wMax - wMin);
        x.beginPath();
        x.moveTo(cx + Math.cos(a) * rx * r1, cy + Math.sin(a) * ry * r1);
        x.quadraticCurveTo(cx + (R() - 0.5) * rx, cy + (R() - 0.5) * ry, cx + Math.cos(b) * rx * r2, cy + Math.sin(b) * ry * r2);
        x.stroke();
      }
    };
    mass(256 + j(), 520, 118, 250, 520, 2, 7);
    mass(256 + j(), 205 + j(), 122, 128, 420, 2, 7);
    // arms that go on too long
    for (const s of [-1, 1]) {
      for (let k = 0; k < 16; k++) {
        x.strokeStyle = `rgba(8,8,12,${0.4 + R() * 0.5})`;
        x.lineWidth = 3 + R() * 6;
        x.beginPath();
        x.moveTo(256 + s * (95 + j()), 340 + j());
        x.bezierCurveTo(256 + s * (190 + j() * 3), 400 + j() * 4, 256 + s * (215 + j() * 3), 560 + j() * 4, 256 + s * (150 + j() * 5), 740 + j() * 3);
        x.stroke();
      }
      for (let k = 0; k < 4; k++) {
        x.lineWidth = 3;
        x.beginPath();
        x.moveTo(256 + s * 152, 735);
        x.lineTo(256 + s * (120 + k * 22 + j()), 768);
        x.stroke();
      }
    }
    // the same face it has in the pictures: two pits, a pinprick deep in each, and the mouth
    x.lineCap = 'butt';
    face(x, 256 + j() * 0.5, 172 + j() * 0.5, 0.56, R, false);
    x.lineCap = 'round';
    out.push(tex(c, true, false));
  }
  return out;
}

export function fogGlass() {
  const [c, x] = cv(2048, 512);
  const R = rng(61);
  x.fillStyle = 'rgba(236,232,214,0.955)';
  x.fillRect(0, 0, 2048, 512);
  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(255,252,240,${0.05 + R() * 0.1})`;
    x.beginPath();
    x.arc(R() * 2048, R() * 512, 1 + R() * 3, 0, 6.3);
    x.fill();
  }
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 70; i++) {
    const px = R() * 2048, py = R() * 200, len = 60 + R() * 300;
    const g = x.createLinearGradient(0, py, 0, py + len);
    g.addColorStop(0, 'rgba(0,0,0,0.0)');
    g.addColorStop(0.2, 'rgba(0,0,0,0.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(px, py, 2 + R() * 3, len);
  }
  x.globalCompositeOperation = 'source-over';
  const t = tex(c, true, false);
  return { canvas: c, ctx: x, texture: t };
}

export function mapBoard(L) {
  const k = 8, [c, x] = cv(124 * k, 96 * k + 70);
  x.fillStyle = '#efe9d4';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#2d4f6c';
  x.font = `40px ${HEI}`;
  x.textAlign = 'center';
  x.fillText('园 区 导 览 图', c.width / 2, 48);
  x.translate(0, 70);
  x.fillStyle = '#e3dcc4';
  x.fillRect(k, k, 122 * k, 94 * k);
  const blue = '#7fb9cf';
  const rr = (r, col) => {
    x.fillStyle = col;
    x.fillRect(r.x0 * k, r.z0 * k, (r.x1 - r.x0) * k, (r.z1 - r.z0) * k);
  };
  // river
  x.strokeStyle = blue;
  x.lineWidth = L.RIVER.hw * 2 * k;
  x.beginPath();
  L.path.forEach((p, i) => (i ? x.lineTo(p.x * k, p.z * k) : x.moveTo(p.x * k, p.z * k)));
  x.closePath();
  x.stroke();
  // tunnel stretch, drawn as covered
  x.strokeStyle = '#8c8f86';
  x.lineWidth = L.RIVER.hw * 2 * k + 6;
  x.setLineDash([10, 7]);
  x.beginPath();
  let first = true;
  L.path.forEach((p) => {
    if (!L.inTunnelS(p.s)) return;
    first ? x.moveTo(p.x * k, p.z * k) : x.lineTo(p.x * k, p.z * k);
    first = false;
  });
  x.stroke();
  x.setLineDash([]);
  rr(L.WAVE, blue);
  for (const p of Object.values(L.POOLS)) rr(p, blue);
  for (const b of L.buildings) rr(b, '#c9c2aa');
  x.fillStyle = '#b6ad92';
  for (const b of L.bridges) x.fillRect(b.x0 * k, b.z0 * k, (b.x1 - b.x0) * k, (b.z1 - b.z0) * k);
  x.fillStyle = '#7d7660';
  for (const w of L.walls || []) x.fillRect(w.x0 * k, w.z0 * k, Math.max(3, (w.x1 - w.x0) * k), Math.max(3, (w.z1 - w.z0) * k));
  x.fillStyle = '#3a3a34';
  x.font = `26px ${HEI}`;
  for (const [t, px, pz] of L.labels) x.fillText(t, px * k, pz * k);
  return c;
}

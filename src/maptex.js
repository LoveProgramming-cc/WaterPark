import * as THREE from 'three';
import { rng } from './rng.js';
import { HALL, ROOMS, DOORS, HIDDEN } from './layout.js';
import { t, redrawable } from './i18n.js';

// Canvas textures that only this map needs: murals, notices, camera stills, the plan on the map boards.
export const HEI = '"Heiti SC","PingFang SC","Microsoft YaHei",sans-serif';
export function cvs(w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d'), t = new THREE.CanvasTexture(c);
  redrawable(() => {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, w, h);
    x.save();
    draw(x, w, h);
    x.restore();
    t.needsUpdate = true;
  });
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.userData.canvas = c;
  return t;
}
export function mottled(base, seed, { speck = 0, blot = 60, dark = 0.07 } = {}) {
  return cvs(256, 256, (x) => {
    const R = rng(seed);
    x.fillStyle = base;
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < blot; i++) {
      const px = R() * 256, py = R() * 256, r = 20 + R() * 60, g = x.createRadialGradient(px, py, 0, px, py, r);
      const k = R() > 0.5 ? '255,255,255' : '0,0,0';
      g.addColorStop(0, `rgba(${k},${dark * R()})`);
      g.addColorStop(1, `rgba(${k},0)`);
      x.fillStyle = g;
      for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2);
    }
    for (let i = 0; i < speck; i++) {
      const v = (R() * 255) | 0;
      x.fillStyle = `rgba(${v},${v * 0.95},${v * 0.9},${0.25 + R() * 0.5})`;
      x.fillRect(R() * 256, R() * 256, 1 + R() * 2.5, 1 + R() * 2.5);
    }
  }, true);
}
export const text = (x, s, px, py, size, col = '#333', align = 'center') => {
  x.font = `${size}px ${HEI}`;
  x.fillStyle = col;
  x.textAlign = align;
  x.fillText(t(s), px, py);
};
export const muralWave = () => cvs(2048, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#bfe3ee');
  g.addColorStop(0.6, '#e9f3ea');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  x.fillStyle = '#f6c56a';
  x.beginPath();
  x.arc(420, 210, 120, 0, 7);
  x.fill();
  [['#8fc8dc', 330], ['#63aacb', 390], ['#3f86b8', 450]].forEach(([c, y0], k) => {
    x.fillStyle = c;
    x.beginPath();
    x.moveTo(0, h);
    for (let px = 0; px <= w; px += 16) x.lineTo(px, y0 + Math.sin(px / 70 + k * 2) * 18);
    x.lineTo(w, h);
    x.fill();
  });
  // palms
  for (const [px, s] of [[1500, 1], [1720, 0.75], [150, 0.6]]) {
    x.strokeStyle = '#7a6a4a';
    x.lineWidth = 16 * s;
    x.beginPath();
    x.moveTo(px, 400);
    x.quadraticCurveTo(px + 30 * s, 250, px - 10 * s, 400 - 260 * s);
    x.stroke();
    x.strokeStyle = '#4f9a6a';
    x.lineWidth = 12 * s;
    for (let a = 0; a < 7; a++) {
      const an = -2.9 + a * 0.45;
      x.beginPath();
      x.moveTo(px - 10 * s, 400 - 260 * s);
      x.quadraticCurveTo(px - 10 * s + Math.cos(an) * 80 * s, 400 - 300 * s + Math.sin(an) * 40 * s, px - 10 * s + Math.cos(an) * 150 * s, 400 - 220 * s + Math.sin(an) * 60 * s);
      x.stroke();
    }
  }
  text(x, '欢 乐 水 世 界', 1000, 220, 150, '#e8f4f6');
  x.lineWidth = 5;
  x.strokeStyle = '#3f86b8';
  x.strokeText(t('欢 乐 水 世 界'), 1000, 220);
  text(x, 'HAPPY  WATER  WORLD', 1000, 285, 44, '#3f86b8');
  x.fillStyle = 'rgba(236,240,236,0.38)';
  x.fillRect(0, 0, w, h);
});
export const muralKids = () => cvs(1024, 256, (x, w, h) => {
  x.fillStyle = '#f7e9b8';
  x.fillRect(0, 0, w, h);
  const R = rng(77);
  for (let i = 0; i < 9; i++) {
    const px = 60 + i * 110 + R() * 30, py = 60 + R() * 130, s = 0.7 + R() * 0.6, c = ['#f08a5d', '#6ac1c8', '#f2c14e', '#e86a92'][i % 4];
    x.fillStyle = c;
    x.beginPath();
    x.ellipse(px, py, 34 * s, 18 * s, 0, 0, 7);
    x.fill();
    x.beginPath();
    x.moveTo(px - 30 * s, py);
    x.lineTo(px - 56 * s, py - 18 * s);
    x.lineTo(px - 56 * s, py + 18 * s);
    x.fill();
    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(px + 18 * s, py - 4 * s, 5 * s, 0, 7);
    x.fill();
  }
  x.strokeStyle = 'rgba(255,255,255,0.8)';
  x.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    x.beginPath();
    x.arc(R() * w, R() * h, 3 + R() * 9, 0, 7);
    x.stroke();
  }
});
export const poster = (title, lines, bg = '#f3f0e4', fg = '#2c3a40') => cvs(512, 720, (x, w, h) => {
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  x.fillStyle = '#2a6a8a';
  x.fillRect(0, 0, w, 96);
  text(x, title, w / 2, 66, 50, '#fff');
  lines.forEach((l, i) => text(x, l, 36, 160 + i * 58, 30, fg, 'left'));
  x.fillStyle = 'rgba(120,100,60,0.08)';
  x.fillRect(0, h * 0.7, w, h * 0.3);
});
export const fridgeTex = () => cvs(256, 512, (x, w, h) => {
  x.fillStyle = '#dfeef2';
  x.fillRect(0, 0, w, h);
  const cols = ['#c8473d', '#e8a020', '#3f86b8', '#4f9a6a', '#1c1c1c', '#e86a92'];
  for (let r = 0; r < 5; r++) {
    x.fillStyle = '#9aa8ac';
    x.fillRect(0, 96 + r * 96, w, 6);
    for (let i = 0; i < 7; i++) {
      x.fillStyle = cols[(r * 2 + i) % cols.length];
      x.fillRect(14 + i * 34, 36 + r * 96, 22, 60);
      x.fillStyle = 'rgba(255,255,255,0.8)';
      x.fillRect(14 + i * 34, 28 + r * 96, 22, 10);
    }
  }
});
export const doorTex = () => cvs(256, 512, (x, w, h) => {
  x.fillStyle = '#e9dcae';
  x.fillRect(0, 0, w, h);
  x.strokeStyle = 'rgba(120,100,50,0.5)';
  x.lineWidth = 4;
  x.strokeRect(8, 8, w - 16, h - 16);
  const g = x.createLinearGradient(0, 60, 0, 250);
  g.addColorStop(0, '#fff3c8');
  g.addColorStop(1, '#ffd98a');
  x.fillStyle = g;
  x.fillRect(60, 60, 136, 190);
  x.strokeRect(60, 60, 136, 190);
  x.fillStyle = '#8d8a80';
  x.fillRect(206, 280, 26, 12);
});
// what the cameras kept. Nobody is drawn as more than a blob: two tall, one tiny, and one on its own.
export function camTex(label, time, draw) {
  return cvs(256, 192, (x, w, h) => {
    x.fillStyle = '#1b3a32';
    x.fillRect(0, 0, w, h);
    const fig = (px, py, s, c = '#eef6f0') => {
      x.fillStyle = c;
      x.beginPath();
      x.arc(px, py - 30 * s, 7 * s, 0, 7);
      x.fill();
      x.fillRect(px - 6 * s, py - 22 * s, 12 * s, 22 * s);
    };
    x.strokeStyle = x.fillStyle = '#86b3a2';
    x.lineWidth = 2;
    draw(x, fig);
    for (let y = 0; y < h; y += 3) (x.fillStyle = 'rgba(0,0,0,0.2)'), x.fillRect(0, y, w, 1);
    text(x, label, 8, 18, 13, '#cfe6d8', 'left');
    text(x, time, w - 8, h - 8, 13, '#cfe6d8', 'right');
    x.fillStyle = '#c0392b';
    x.beginPath();
    x.arc(w - 12, 13, 4, 0, 7);
    x.fill();
  });
}
export const scrawl = (x, cx, cy, rx, ry, n, seed, col = 'rgba(6,8,8,0.8)') => {
  const R = rng(seed);
  x.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    x.lineWidth = 1 + R() * 3;
    x.beginPath();
    x.moveTo(cx + (R() - 0.5) * 2 * rx, cy + (R() - 0.5) * 2 * ry);
    x.quadraticCurveTo(cx + (R() - 0.5) * rx, cy + (R() - 0.5) * ry, cx + (R() - 0.5) * 2 * rx, cy + (R() - 0.5) * 2 * ry);
    x.stroke();
  }
};
const loungers4 = (x, y) => {
  for (let k = 0; k < 4; k++) x.strokeRect(24 + k * 30, y, 22, 40);
};
export const CAMS = () => [
  camTex('CAM 01  造浪池', '14:20', (x, fig) => {
    loungers4(x, 110);
    for (let k = 0; k < 5; k++) x.strokeRect(0, 40 + k * 9, 256, 0.5);
    fig(178, 150, 1.2), fig(214, 150, 1.25), fig(196, 152, 0.5);
    fig(60, 70, 0.7);
  }),
  camTex('CAM 02  小卖部', '14:02', (x, fig) => {
    x.strokeRect(150, 60, 90, 70);
    fig(90, 150, 1.2), fig(126, 150, 1.25), fig(108, 152, 0.5);
  }),
  camTex('CAM 03  服务台', '14:21', (x, fig) => {
    x.strokeRect(20, 50, 200, 30);
    fig(110, 140, 1.2), fig(146, 140, 1.25), fig(128, 100, 0.5);
  }),
  camTex('CAM 04  儿童池', '14:25', (x, fig) => {
    x.beginPath();
    x.arc(180, 80, 34, 3.14, 6.28);
    x.stroke();
    x.strokeRect(176, 80, 8, 50);
    fig(70, 150, 1.2), fig(106, 150, 1.25), fig(88, 152, 0.5);
  }),
  camTex('CAM 01  造浪池', '17:30', (x, fig) => {
    loungers4(x, 110);
    for (let k = 0; k < 5; k++) x.strokeRect(0, 40 + k * 9, 256, 0.5);
    fig(65, 128, 0.7);
  }),
  camTex('CAM 07  监控室', '现在', (x, fig) => {
    for (let k = 0; k < 3; k++) x.strokeRect(60 + k * 46, 40, 40, 30);
    fig(128, 170, 1.1);
    scrawl(x, 176, 110, 22, 60, 120, 5);
  }),
  camTex('CAM 07  监控室', '现在', (x, fig) => {
    fig(128, 180, 1.6);
    scrawl(x, 128, 96, 70, 90, 420, 9);
  }),
];
export function planTex() {
  const k = 12, W = HALL.x1 * k, H = HALL.z1 * k + 80;
  return cvs(W, H, (x) => {
    x.fillStyle = '#efe9d4';
    x.fillRect(0, 0, W, H);
    text(x, '园 区 导 览 图', W / 2, 54, 40, '#2d4f6c');
    x.translate(0, 80);
    for (const r of ROOMS) {
      if (HIDDEN.includes(r.id)) continue;
      x.fillStyle = r.st === 'tun' ? '#9a9c92' : r.label ? '#d9d0b4' : '#c9c2aa';
      x.fillRect(r.x0 * k, r.z0 * k, (r.x1 - r.x0) * k, (r.z1 - r.z0) * k);
      x.fillStyle = '#7fb9cf';
      for (const s of r.subs) if (s.pool) x.fillRect(s.x0 * k, s.z0 * k, (s.x1 - s.x0) * k, (s.z1 - s.z0) * k);
    }
    x.strokeStyle = '#7d7660';
    x.lineWidth = 3;
    for (const r of ROOMS) if (!HIDDEN.includes(r.id)) x.strokeRect(r.x0 * k, r.z0 * k, (r.x1 - r.x0) * k, (r.z1 - r.z0) * k);
    x.fillStyle = '#efe9d4';
    for (const d of DOORS) {
      if ((d.kind === 'open' && d.y1 < 9) || (d.ax === 'x' && d.at === 44 && d.a < 20) || d.a === 50 || (d.at > 62 && d.a < 26 && d.b < 26)) continue;
      if (d.ax === 'x') x.fillRect(d.at * k - 3, d.a * k + 2, 6, (d.b - d.a) * k - 4);
      else x.fillRect(d.a * k + 2, d.at * k - 3, (d.b - d.a) * k - 4, 6);
    }
    for (const r of ROOMS) if (r.label) text(x, r.label, ((r.x0 + r.x1) / 2) * k, ((r.z0 + r.z1) / 2) * k + 10, 28, '#3a3a34');
    text(x, '漂流河', 32 * k, 41.4 * k, 22, '#2d4f6c');
    text(x, '隧道', 44 * k, 57.2 * k, 20, '#f2f1e8');
  });
}

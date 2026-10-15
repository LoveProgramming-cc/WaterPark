// The one face it has, wherever it is drawn: on the thing in the park and in the pictures it shows you.
function scribble(x, cx, cy, rx, ry, n, R, col) {
  x.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    x.lineWidth = 2 + R() * 7;
    x.globalAlpha = 0.4 + R() * 0.6;
    x.beginPath();
    x.moveTo(cx + (R() - 0.5) * 2 * rx, cy + (R() - 0.5) * 2 * ry);
    x.quadraticCurveTo(cx + (R() - 0.5) * rx, cy + (R() - 0.5) * ry, cx + (R() - 0.5) * 2 * rx, cy + (R() - 0.5) * 2 * ry);
    x.stroke();
  }
  x.globalAlpha = 1;
}

// Its face. Nothing round or wide-eyed: two pits with a pinprick far back in each, and a mouth that goes on past
// where a face would end, full of teeth that are too long and too many.
export function face(x, cx, cy, s, R, pale = true) {
  if (pale) scribble(x, cx, cy + 20 * s, 170 * s, 230 * s, 90, R, 'rgba(206,200,182,0.2)');
  for (const d of [-1, 1]) {
    const ex = cx + d * (64 + (d > 0 ? 9 : 0)) * s, ey = cy - (70 - d * 8) * s;
    x.fillStyle = '#000';
    x.beginPath();
    x.ellipse(ex, ey, 30 * s, (d > 0 ? 50 : 40) * s, d * 0.25, 0, 7);
    x.fill();
    scribble(x, ex, ey, 34 * s, 48 * s, 26, R, '#000');
    x.fillStyle = '#f4eeda';
    x.beginPath();
    x.arc(ex + (R() - 0.5) * 3 * s, ey + 6 * s + (R() - 0.5) * 3 * s, Math.max(1.2, 2.6 * s), 0, 7);
    x.fill();
  }
  const L = [cx - 185 * s, cy + 36 * s], Rr = [cx + 196 * s, cy + 22 * s], lo = [cx + 6 * s, cy + (228 + R() * 14) * s], up = [cx, cy + 118 * s];
  const q = (c, t) => [(1 - t) * (1 - t) * L[0] + 2 * (1 - t) * t * c[0] + t * t * Rr[0], (1 - t) * (1 - t) * L[1] + 2 * (1 - t) * t * c[1] + t * t * Rr[1]];
  x.fillStyle = '#000';
  x.beginPath();
  x.moveTo(...L);
  x.quadraticCurveTo(...lo, ...Rr);
  x.quadraticCurveTo(...up, ...L);
  x.fill();
  x.fillStyle = '#d6cfb8';
  const n = 26;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, w = (5.2 + R() * 2.5) * s, m = Math.sin(Math.PI * t);
    const a = q(up, t), lenA = (16 + R() * 44) * s * (0.35 + m);
    x.beginPath();
    x.moveTo(a[0] - w, a[1] - 2 * s);
    x.lineTo(a[0] + w, a[1] - 2 * s);
    x.lineTo(a[0] + (R() - 0.5) * 4 * s, a[1] + lenA);
    x.fill();
    const b = q(lo, t), lenB = (10 + R() * 30) * s * (0.25 + m);
    x.beginPath();
    x.moveTo(b[0] - w, b[1] + 2 * s);
    x.lineTo(b[0] + w, b[1] + 2 * s);
    x.lineTo(b[0] + (R() - 0.5) * 4 * s, b[1] - lenB);
    x.fill();
  }
  // the corners keep going
  x.strokeStyle = '#000';
  x.lineWidth = 3 * s;
  for (const [pt, d] of [[L, -1], [Rr, 1]]) {
    x.beginPath();
    x.moveTo(...pt);
    x.quadraticCurveTo(pt[0] + d * 30 * s, pt[1] - 30 * s, pt[0] + d * (34 + R() * 10) * s, pt[1] - (70 + R() * 20) * s);
    x.stroke();
  }
}

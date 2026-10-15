import * as THREE from 'three';
import { HALL, roomAt } from './layout.js';

// ---------------- baked light: every lamp spreads over the floor plan and stops at walls ----------------
export function bakeLight(lights, occluders, solids) {
  const K = 4, W = HALL.x1 * K, H = HALL.z1 * K, N = W * H;
  const occ = new Uint8Array(N), valid = new Uint8Array(N), ao = new Float32Array(N);
  for (const o of occluders)
    for (let z = Math.max(0, Math.floor(o.z0 * K)); z < Math.min(H, Math.ceil(o.z1 * K)); z++)
      for (let x = Math.max(0, Math.floor(o.x0 * K)); x < Math.min(W, Math.ceil(o.x1 * K)); x++) occ[z * W + x] = 1;
  for (const s of solids) {
    if (s.y0 > 0.75 || s.y1 - s.y0 < 0.25) continue;
    for (let z = Math.max(0, Math.floor(s.z0 * K)); z < Math.min(H, Math.ceil(s.z1 * K)); z++)
      for (let x = Math.max(0, Math.floor(s.x0 * K)); x < Math.min(W, Math.ceil(s.x1 * K)); x++) {
        const ax = Math.min(s.x1, (x + 1) / K) - Math.max(s.x0, x / K), az = Math.min(s.z1, (z + 1) / K) - Math.max(s.z0, z / K);
        ao[z * W + x] = Math.min(1, ao[z * W + x] + Math.max(0, ax) * Math.max(0, az) * K * K);
      }
  }
  const L = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const i = z * W + x, px = (x + 0.5) / K, pz = (z + 0.5) / K;
      if (occ[i] || !roomAt(px, pz)) continue;
      valid[i] = 1;
      for (const l of lights) {
        const dx = l.x - px, dz = l.z - pz, d2 = dx * dx + dz * dz;
        if (d2 > l.r * l.r) continue;
        const d = Math.sqrt(d2), n = Math.ceil(d / 0.11);
        let vis = 1;
        for (let k = 1; k < n - 3; k++) {
          const sx = px + (dx * k) / n, sz = pz + (dz * k) / n;
          if (occ[Math.floor(sz * K) * W + Math.floor(sx * K)]) {
            vis = 0;
            break;
          }
        }
        if (!vis) continue;
        const c = 1 - d2 / (l.r * l.r), e = (1.4 * l.I * (l.hy * l.hy)) / (d2 + l.hy * l.hy) * c * c;
        L[0][i] += e * l.col[0], L[1][i] += e * l.col[1], L[2][i] += e * l.col[2];
      }
    }
  // one soft bounce, then let the light bleed into the wall texels so wall faces sample something sensible
  const blur = (src, rad, mask) => {
    const tmp = new Float32Array(N), out = new Float32Array(N);
    for (let pass = 0; pass < 2; pass++) {
      const a = pass ? tmp : src, b = pass ? out : tmp, step = pass ? W : 1, lim = pass ? H : W;
      for (let z = 0; z < H; z++)
        for (let x = 0; x < W; x++) {
          const i = z * W + x, p = pass ? z : x;
          let s = 0, n = 0;
          for (let k = -rad; k <= rad; k++) {
            if (p + k < 0 || p + k >= lim) continue;
            const j = i + k * step;
            if (mask && !mask[j]) continue;
            s += a[j], n++;
          }
          b[i] = n ? s / n : 0;
        }
    }
    return out;
  };
  for (const c of L) {
    const b = blur(c, 7, valid);
    for (let i = 0; i < N; i++) if (valid[i]) c[i] = c[i] + b[i] * 0.4 + 0.05;
  }
  const ok = valid.slice();
  for (let it = 0; it < 4; it++) {
    const nxt = ok.slice();
    for (let z = 1; z < H - 1; z++)
      for (let x = 1; x < W - 1; x++) {
        const i = z * W + x;
        if (ok[i]) continue;
        let n = 0, s = [0, 0, 0];
        for (const j of [i - 1, i + 1, i - W, i + W, i - W - 1, i - W + 1, i + W - 1, i + W + 1]) if (ok[j]) (n++, (s[0] += L[0][j]), (s[1] += L[1][j]), (s[2] += L[2][j]));
        if (n) (L[0][i] = s[0] / n), (L[1][i] = s[1] / n), (L[2][i] = s[2] / n), (nxt[i] = 1);
      }
    ok.set(nxt);
  }
  const aoB = blur(ao, 1);
  const px = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.min(255, (L[c][i] / 2) * 255);
    px[i * 4 + 3] = (1 - 0.72 * Math.min(1, aoB[i] * 1.5)) * 255;
  }
  const t = new THREE.DataTexture(px, W, H, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

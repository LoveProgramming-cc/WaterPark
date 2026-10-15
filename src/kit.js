import * as THREE from 'three';
import { TW, ROOMS, RM, DOORS, baseGround } from './layout.js';

// The building kit: geometry goes into per-material bins (merged later), collision boxes into `solids`,
// lamps into `lights`. Calling this also builds every room's floor, walls and ceiling from the layout.
export function makeKit(STYLE, R) {
  // ---------------- builders ----------------
  const bins = {}, solids = [], occluders = [], lights = [], models = [];
  let XF = null;
  const push = (mat, g) => {
    if (XF) g.applyMatrix4(XF);
    (bins[mat] ||= []).push(g);
  };
  function grp(x, y, z, ry, fn, rx = 0) {
    const prev = XF, m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
    XF = prev ? prev.clone().multiply(m) : m;
    fn();
    XF = prev;
  }
  const v3 = new THREE.Vector3();
  function addSolid(x0, x1, y0, y1, z0, z1) {
    let s = { x0, x1, y0, y1, z0, z1 };
    if (XF) {
      s = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 };
      for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
        v3.set(x, y, z).applyMatrix4(XF);
        s.x0 = Math.min(s.x0, v3.x), s.x1 = Math.max(s.x1, v3.x), s.y0 = Math.min(s.y0, v3.y), s.y1 = Math.max(s.y1, v3.y), s.z0 = Math.min(s.z0, v3.z), s.z1 = Math.max(s.z1, v3.z);
      }
    }
    solids.push(s);
    return s;
  }
  function box(mat, x0, x1, y0, y1, z0, z1, solid = true, o) {
    if (mat) {
      const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, [ox, oy, oz] = o || [0, 0, 0];
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(n.getX(i)) > 0.5) uv.setXY(i, p.getZ(i) - oz, p.getY(i) - oy);
        else if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, p.getX(i) - ox, p.getZ(i) - oz);
        else uv.setXY(i, p.getX(i) - ox, p.getY(i) - oy);
      }
      push(mat, g);
    }
    if (solid) return addSolid(x0, x1, y0, y1, z0, z1);
  }
  const put = (mat, g, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => {
    if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')));
    g.translate(x, y, z);
    push(mat, g);
  };
  const cyl = (mat, x, y, z, r, h, seg = 12, r2 = r) => put(mat, new THREE.CylinderGeometry(r2, r, h, seg), x, y + h / 2, z);
  const UP = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion();
  function between(mat, g, a, b) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
    g.applyQuaternion(qa.setFromUnitVectors(UP, d.clone().normalize()));
    g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    push(mat, g);
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const pipe = (mat, a, b, r, seg = 8) => between(mat, new THREE.CylinderGeometry(r, r, dist(a, b), seg), a, b);
  const beam = (mat, a, b, w, t) => between(mat, new THREE.BoxGeometry(w, dist(a, b), t), a, b);
  const torus = (mat, x, y, z, Rr, r, rx = 0, ry = 0) => put(mat, new THREE.TorusGeometry(Rr, r, 8, 20), x, y, z, ry, rx);
  function quad(mat, pts, uvs) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs.flat(), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    push(mat, g);
  }
  // handrail on a level edge
  function rail(x0, z0, x1, z1, y, h = 1.0) {
    const t = 0.025, lo = [Math.min(x0, x1), Math.min(z0, z1)], hi = [Math.max(x0, x1), Math.max(z0, z1)];
    box(null, lo[0] - t, hi[0] + t, y, y + h, lo[1] - t, hi[1] + t);
    pipe('steel', [x0, y + h, z0], [x1, y + h, z1], 0.022);
    pipe('steel', [x0, y + h * 0.5, z0], [x1, y + h * 0.5, z1], 0.014);
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.1));
    for (let i = 0; i <= n; i++) cyl('steel', x0 + ((x1 - x0) * i) / n, y, z0 + ((z1 - z0) * i) / n, 0.02, h, 8);
  }
  const anchor = (id, side, along, off = 0.012) => {
    const r = RM[id];
    return side === 'N' ? [along, r.z0 + TW + off, 0] : side === 'S' ? [along, r.z1 - TW - off, Math.PI] : side === 'W' ? [r.x0 + TW + off, along, Math.PI / 2] : [r.x1 - TW - off, along, -Math.PI / 2];
  };
  const model = (id, x, y, z, ry = 0, s = 1, o = {}) => models.push({ id, x, y, z, ry, s, ...o });
  function lamp(id, x, z, { w = 0.6, d = 1.2, I = 1, r = 10, col = [1, 1, 1], dead = false, y, mat } = {}) {
    const rm = RM[id], yy = y ?? rm.h;
    box('steelD', x - w / 2 - 0.03, x + w / 2 + 0.03, yy - 0.05, yy, z - d / 2 - 0.03, z + d / 2 + 0.03, false);
    box(dead ? 'panelOff' : mat || 'panel', x - w / 2, x + w / 2, yy - 0.065, yy - 0.04, z - d / 2, z + d / 2, false);
    if (!dead) lights.push({ x, z, hy: Math.max(1.3, yy - rm.f - 0.9), I, r, col });
  }

  // ---------------- rooms: floor, walls with openings, ceiling ----------------
  const YB = -2.7;
  function buildRoom(r) {
    const st = STYLE[r.st];
    // floor as a grid of blocks, so every change of level has a riser
    const xs = [...new Set([r.x0, r.x1, ...r.subs.flatMap((s) => [s.x0, s.x1])])].sort((a, b) => a - b);
    const zs = [...new Set([r.z0, r.z1, ...r.subs.flatMap((s) => [s.z0, s.z1])])].sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++)
      for (let j = 0; j < zs.length - 1; j++) {
        const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
        let f = r.f, mat = st.floor;
        for (const s of r.subs) if (cx > s.x0 && cx < s.x1 && cz > s.z0 && cz < s.z1) (f = s.f), (mat = s.mat || (s.pool ? 'pool' : st.floor));
        if (typeof f === 'function') continue;
        box(mat, xs[i], xs[i + 1], YB - 0.3, f, zs[j], zs[j + 1], false);
      }
    for (const s of r.subs) {
      if (typeof s.f === 'function')
        quad('pool', [[s.x0, s.f(s.x0, s.z0), s.z0], [s.x0, s.f(s.x0, s.z1), s.z1], [s.x1, s.f(s.x1, s.z1), s.z1], [s.x1, s.f(s.x1, s.z0), s.z0]], [[s.x0, s.z0], [s.x0, s.z1], [s.x1, s.z1], [s.x1, s.z0]]);
      if (!s.pool) continue;
      // tile lining and a darker coping band round every pool
      const e = 0.02, y1 = r.f - 0.002, ix0 = r.x0 + TW, ix1 = r.x1 - TW, iz0 = r.z0 + TW, iz1 = r.z1 - TW, c = 0.3;
      const wet = (x, z) => r.subs.some((q) => q !== s && q.pool && x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1);
      const run = (vals, a0, a1, test, emit) => {
        const cc = vals.filter((v) => v >= a0 && v <= a1);
        for (let i = 0; i < cc.length - 1; i++) if (!test((cc[i] + cc[i + 1]) / 2)) emit(cc[i], cc[i + 1]);
      };
      const cz = (a) => Math.max(iz0, a), cZ = (b) => Math.min(iz1, b);
      if (s.x0 > ix0) run(zs, s.z0, s.z1, (z) => wet(s.x0 - 0.05, z), (a, b) => (box('pool', s.x0, s.x0 + e, YB, y1, a, b, false), box('cope', s.x0 - c, s.x0, r.f, r.f + 0.014, a, b, false)));
      if (s.x1 < ix1) run(zs, s.z0, s.z1, (z) => wet(s.x1 + 0.05, z), (a, b) => (box('pool', s.x1 - e, s.x1, YB, y1, a, b, false), box('cope', s.x1, s.x1 + c, r.f, r.f + 0.014, a, b, false)));
      if (s.z0 > iz0) run(xs, s.x0, s.x1, (x) => wet(x, s.z0 - 0.05), (a, b) => (box('pool', a, b, YB, y1, s.z0, s.z0 + e, false), box('cope', a, b, r.f, r.f + 0.014, s.z0 - c, s.z0, false)));
      if (s.z1 < iz1) run(xs, s.x0, s.x1, (x) => wet(x, s.z1 + 0.05), (a, b) => (box('pool', a, b, YB, y1, s.z1 - e, s.z1, false), box('cope', a, b, r.f, r.f + 0.014, s.z1, s.z1 + c, false)));
    }
    box(st.ceil, r.x0, r.x1, r.h, r.h + 0.2, r.z0, r.z1, false);

    const sides = [
      ['x', r.x0, r.z0, r.z1, (s0, s1, t0, t1) => [r.x0 + t0, r.x0 + t1, s0, s1]],
      ['x', r.x1, r.z0, r.z1, (s0, s1, t0, t1) => [r.x1 - t1, r.x1 - t0, s0, s1]],
      ['z', r.z0, r.x0 + TW, r.x1 - TW, (s0, s1, t0, t1) => [s0, s1, r.z0 + t0, r.z0 + t1]],
      ['z', r.z1, r.x0 + TW, r.x1 - TW, (s0, s1, t0, t1) => [s0, s1, r.z1 - t1, r.z1 - t0]],
    ];
    for (const [ax, at, lo, hi, rect] of sides) {
      const holes = DOORS.filter((d) => d.ax === ax && Math.abs(d.at - at) < 1e-3 && d.b > lo && d.a < hi);
      const cuts = [...new Set([lo, hi, ...holes.flatMap((d) => [Math.max(lo, d.a), Math.min(hi, d.b)])])].sort((a, b) => a - b);
      for (let i = 0; i < cuts.length - 1; i++) {
        const s0 = cuts[i], s1 = cuts[i + 1], mid = (s0 + s1) / 2;
        const hs = holes.filter((d) => mid > d.a && mid < d.b).sort((a, b) => a.y0 - b.y0);
        let y = YB;
        const emit = (ya, yb) => {
          if (yb - ya < 0.01) return;
          const [x0, x1, z0, z1] = rect(s0, s1, 0, TW);
          if (ya < st.dh) box(st.dado, x0, x1, ya, Math.min(yb, st.dh), z0, z1);
          if (yb > st.dh) box(st.up, x0, x1, Math.max(ya, st.dh), yb, z0, z1);
          if (ya < 0.3 && yb >= Math.min(r.h, 1.9)) occluders.push({ x0, x1, z0, z1 });
          const tr = (m, e, a, b) => {
            const [u0, u1, w0, w1] = rect(s0, s1, TW, TW + e);
            box(m, u0, u1, a, b, w0, w1, false);
          };
          if (st.trim && ya < st.dh - 0.1 && yb > st.dh + 0.1) tr(st.trim, 0.012, st.dh - 0.035, st.dh + 0.035);
          if (st.skirt && ya < r.f && yb > r.f + 0.3) tr(st.skirt, 0.015, r.f, r.f + 0.1);
        };
        for (const h of hs) {
          if (h.y0 > y) emit(y, Math.min(h.y0, r.h));
          y = Math.max(y, h.y1);
        }
        if (y < r.h) emit(y, r.h);
      }
    }
  }
  ROOMS.forEach(buildRoom);
  // frames hide the seam where two rooms' walls meet inside a doorway
  for (const d of DOORS) {
    if (d.kind === 'open') continue;
    const m = d.kind === 'arch' ? 'cope' : 'frame', e = 0.19, mid = (d.a + d.b) / 2;
    const fl = d.ax === 'x' ? Math.min(baseGround(d.at - 0.3, mid), baseGround(d.at + 0.3, mid)) : Math.min(baseGround(mid, d.at - 0.3), baseGround(mid, d.at + 0.3));
    const B = (a0, a1, y0, y1, solid) => (d.ax === 'x' ? box(m, d.at - e, d.at + e, y0, y1, a0, a1, solid) : box(m, a0, a1, y0, y1, d.at - e, d.at + e, solid));
    B(d.a, d.a + 0.06, fl, d.y1, true);
    B(d.b - 0.06, d.b, fl, d.y1, true);
    B(d.a, d.b, d.y1 - 0.07, d.y1 + 0.02, false);
  }

  // ---------------- furniture ----------------
  function lounger(x, z, ry, y = 0) {
    grp(x, y, z, ry, () => {
      for (const sx of [-0.29, 0.27]) {
        box('plastic', sx, sx + 0.03, 0.25, 0.3, -0.25, 0.95, false);
        box('plastic', sx, sx + 0.035, 0, 0.27, 0.78, 0.83, false);
        box('plastic', sx, sx + 0.035, 0, 0.27, -0.2, -0.15, false);
      }
      for (let k = 0; k < 8; k++) box('plastic', -0.29, 0.3, 0.3, 0.318, -0.25 + k * 0.152, -0.25 + k * 0.152 + 0.115, false);
      grp(0, 0.3, -0.25, 0, () => {
        for (const sx of [-0.29, 0.27]) box('plastic', sx, sx + 0.03, -0.05, 0, -0.72, 0, false);
        for (let k = 0; k < 5; k++) box('plastic', -0.29, 0.3, 0, 0.018, -0.72 + k * 0.148, -0.72 + k * 0.148 + 0.112, false);
      }, 0.6);
      for (const sx of [-0.27, 0.24]) beam('plastic', [sx + 0.015, 0, -0.62], [sx + 0.015, 0.52, -0.66], 0.03, 0.03);
      box('plastic', -0.27, 0.27, 0.5, 0.53, -0.68, -0.65, false);
      box(null, -0.3, 0.3, 0, 0.32, -0.8, 0.95);
    });
  }
  function bench(x0, x1, z, y = 0, along = 'x') {
    const B = (m, a0, a1, y0, y1, c0, c1, s) => (along === 'x' ? box(m, a0, a1, y + y0, y + y1, z + c0, z + c1, s) : box(m, z + c0, z + c1, y + y0, y + y1, a0, a1, s));
    for (const c of [-0.19, -0.055, 0.08]) B('wood', x0, x1, 0.4, 0.44, c, c + 0.11, false);
    for (let a = x0 + 0.25; a < x1; a += (x1 - x0 - 0.5) / Math.max(1, Math.round((x1 - x0) / 1.4))) {
      B('steelD', a - 0.02, a + 0.02, 0, 0.4, -0.17, -0.13, false);
      B('steelD', a - 0.02, a + 0.02, 0, 0.4, 0.13, 0.17, false);
      B('steelD', a - 0.02, a + 0.02, 0.36, 0.4, -0.17, 0.17, false);
    }
    B(null, x0, x1, 0, 0.44, -0.2, 0.2, true);
  }
  function lockerBank(x0, x1, z0, z1, y) {
    box('dark', x0 + 0.02, x1 - 0.02, y, y + 0.1, z0 + 0.03, z1 - 0.03, false);
    box('locker', x0, x1, y + 0.1, y + 2.0, z0, z1, true, [x0, y + 0.1, z0]);
    box('steelD', x0 - 0.012, x0, y, y + 2.02, z0 - 0.01, z1 + 0.01, false);
    box('steelD', x1, x1 + 0.012, y, y + 2.02, z0 - 0.01, z1 + 0.01, false);
    box('steelD', x0 - 0.01, x1 + 0.01, y + 2.0, y + 2.03, z0 - 0.01, z1 + 0.01, false);
  }
  function table(x, z, y = 0) {
    cyl('plastic', x, y + 0.68, z, 0.45, 0.03, 20);
    cyl('plastic', x, y + 0.02, z, 0.035, 0.66, 10);
    cyl('plastic', x, y, z, 0.26, 0.025, 16);
    box(null, x - 0.4, x + 0.4, y, y + 0.71, z - 0.4, z + 0.4);
  }
  function chair(x, z, ry, y = 0) {
    model('plastic_monobloc_chair_01', x, y, z, ry);
    box(null, x - 0.24, x + 0.24, y, y + 0.44, z - 0.24, z + 0.24);
  }
  function ladder(x, z, dx, dz) {
    // two bent rails over the pool edge and three rungs below the waterline
    const px = -dz, pz = dx;
    for (const s of [-0.25, 0.25]) {
      const bx = x + px * s, bz = z + pz * s;
      pipe('steel', [bx - dx * 0.35, 0, bz - dz * 0.35], [bx - dx * 0.35, 0.75, bz - dz * 0.35], 0.022);
      pipe('steel', [bx - dx * 0.35, 0.75, bz - dz * 0.35], [bx + dx * 0.12, 0.75, bz + dz * 0.12], 0.022);
      pipe('steel', [bx + dx * 0.12, 0.75, bz + dz * 0.12], [bx + dx * 0.12, -1.0, bz + dz * 0.12], 0.022);
    }
    for (const yy of [-0.25, -0.55, -0.85]) pipe('steel', [x + px * 0.25 + dx * 0.12, yy, z + pz * 0.25 + dz * 0.12], [x - px * 0.25 + dx * 0.12, yy, z - pz * 0.25 + dz * 0.12], 0.02);
  }
  const drain = (x, z, y = 0) => {
    box('steelD', x - 0.09, x + 0.09, y, y + 0.004, z - 0.09, z + 0.09, false);
    for (let k = -2; k <= 2; k++) box('dark', x - 0.07, x + 0.07, y + 0.004, y + 0.006, z + k * 0.03 - 0.008, z + k * 0.03 + 0.008, false);
  };
  const wetSign = (x, z, ry) => grp(x, 0, z, ry, () => {
    grp(0, 0, 0.13, 0, () => box('yel', -0.15, 0.15, 0, 0.62, -0.008, 0.008, false), 0.2);
    grp(0, 0, -0.13, 0, () => box('yel', -0.15, 0.15, 0, 0.62, -0.008, 0.008, false), -0.2);
    box(null, -0.15, 0.15, 0, 0.6, -0.14, 0.14);
  });
  const ringStack = (x, z, n, y = 0) => {
    for (let k = 0; k < n; k++) torus(k % 3 === 1 ? 'blue' : 'yel', x + (R() - 0.5) * 0.05, y + 0.09 + k * 0.16, z + (R() - 0.5) * 0.05, 0.3, 0.085, Math.PI / 2);
    box(null, x - 0.38, x + 0.38, y, y + n * 0.16, z - 0.38, z + 0.38);
  };
  const cageLamp = (id, x, y, z, I = 0.5, col = [1, 0.8, 0.55]) => {
    put('warm', new THREE.SphereGeometry(0.05, 8, 6), x, y, z);
    torus('steelD', x, y, z, 0.07, 0.008, Math.PI / 2);
    torus('steelD', x, y, z, 0.07, 0.008, 0, 0);
    lights.push({ x, z, hy: 1.2, I: I * 1.7, r: 7, col });
  };

  return { bins, solids, occluders, lights, models, push, grp, addSolid, box, put, cyl, pipe, beam, torus, quad, rail, anchor, model, lamp, lounger, bench, lockerBank, table, chair, ladder, drain, wetSign, ringStack, cageLamp };
}

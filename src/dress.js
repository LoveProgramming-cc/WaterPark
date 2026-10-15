import * as THREE from 'three';
import { WATER0, GLASS, FAM, RM, TW, WAVE } from './layout.js';
const WAVE_Z0 = WAVE.z0;

// Everything that stands in the rooms and never moves, room by room.
export function dress(K, R) {
  const { bins, solids, occluders, lights, models, push, grp, addSolid, box, put, cyl, pipe, beam, torus, quad, rail, anchor, model, lamp, lounger, bench, lockerBank, table, chair, ladder, drain, wetSign, ringStack, cageLamp } = K;
  // ---------------- 造浪池 ----------------
  {
    const r = RM.WAVE;
    // roof steel, skylights
    for (let z = 33; z < 62; z += 5.6) {
      box('frame', 4.15, 25.85, 6.75, 7.0, z - 0.09, z + 0.09, false);
      for (let x = 6; x < 25; x += 3.6) beam('frame', [x, 6.8, z], [x + 1.8, 7.5, z], 0.05, 0.05), beam('frame', [x + 1.8, 7.5, z], [x + 3.6, 6.8, z], 0.05, 0.05);
    }
    // the lamps hang just under the trusses: pools of light on the floor, and the roof stays in the dark
    for (const x of [10, 20]) for (const z of [35.8, 47, 58.2]) {
      lamp('WAVE', x, z, { w: 1.2, d: 6, I: 1.0, r: 12, dead: (x === 20 && z === 58.2) || (x === 10 && z === 47), y: 6.6 });
      for (const dz of [-2.6, 2.6]) pipe('steelD', [x, 6.6, z + dz], [x, 7.5, z + dz], 0.012, 4);
    }
    // wave machine: five dark chambers in the deep-end wall
    for (let k = 0; k < 5; k++) {
      const x0 = 7.1 + k * 3.25;
      box('dark', x0, x0 + 2.75, -1.6, 0.85, 61.78, 61.86, false);
      box('steelD', x0 - 0.06, x0 + 2.81, 0.85, 0.93, 61.76, 61.86, false);
      for (let b = 0; b <= 11; b++) box('steelD', x0 + b * 0.25 - 0.015, x0 + b * 0.25 + 0.015, -1.6, 0.85, 61.74, 61.79, false);
    }
    // float line where the floor drops away
    for (let x = 6.6; x < 23.5; x += 0.22) cyl(Math.floor(x / 0.88) % 2 ? 'red' : 'plastic', x, WATER0 - 0.045, 51, 0.055, 0.2, 8);
    // lifeguard chair, nobody in it
    grp(5.05, 0, 47.5, Math.PI / 2, () => {
      for (const [sx, sz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) pipe('plastic', [sx * 1.25, 0, sz * 1.25], [sx, 1.7, sz], 0.025);
      box('plastic', -0.38, 0.38, 1.7, 1.74, -0.38, 0.38, false);
      box('plastic', -0.38, 0.38, 1.74, 2.3, -0.38, -0.34, false);
      for (const yy of [0.4, 0.8, 1.2]) pipe('plastic', [-0.42 + yy * 0.04, yy, 0.42 - yy * 0.04], [0.42 - yy * 0.04, yy, 0.42 - yy * 0.04], 0.018);
      box(null, -0.45, 0.45, 0, 2.3, -0.45, 0.45);
    });
    // loungers: the family's four, then two more groups nobody is using
    for (const x of FAM) lounger(x, 34.6, 0);
    for (const x of [15.2, 16.5]) lounger(x, 34.4, 0.04);
    lounger(22.6, 36.2, -0.5);
    chair(5.2, 36.4, 1.9);
    chair(5.1, 37.5, 1.3);
    model('metal_trash_can', 24.9, 0, 31.2, 0.4);
    box(null, 24.6, 25.2, 0, 0.9, 30.9, 31.5);
    wetSign(11.6, 31.6, 0.3);
    // benches along the east wall: somewhere to get your feet out of the water
    bench(37.6, 40, 25.5, 0, 'z');
    bench(43.2, 45.6, 25.5, 0, 'z');
    model('lifebuoy', ...anchor('WAVE', 'W', 44, 0.08).slice(0, 1), 1.75, 44, Math.PI / 2);
    model('lifebuoy', ...anchor('WAVE', 'E', 54, 0.08).slice(0, 1), 1.75, 54, -Math.PI / 2);
    model('wall_clock', 15, 4.4, r.z0 + TW + 0.01, 0, 3.2);
    // three more slides loop through the roof space and back out through the walls. There is no way up to any of them.
    const loop = (mat, pts, legs) => {
      const c = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q)), false, 'centripetal');
      push(mat, new THREE.TubeGeometry(c, 220, 0.62, 14, false));
      for (const u of legs) {
        const q = c.getPointAt(u), fl = q.z > WAVE_Z0 && q.x > 6.5 && q.x < 23.5 ? -2.4 * (q.z - WAVE_Z0) / 23 : 0;
        pipe('steel', [q.x, fl - 0.1, q.z], [q.x, q.y - 0.55, q.z], 0.11, 12);
        torus('steelD', q.x, q.y - 0.5, q.z, 0.14, 0.03, Math.PI / 2);
        box(null, q.x - 0.14, q.x + 0.14, fl - 0.2, q.y - 0.55, q.z - 0.14, q.z + 0.14);
      }
    };
    loop('tubeR', [[4.0, 5.6, 37.5], [7.5, 5.4, 39.5], [10.5, 4.6, 44.5], [9.0, 4.0, 50.5], [5.6, 4.4, 53.5], [6.2, 5.0, 58.0], [11.5, 5.6, 59.5], [16.0, 6.0, 56.0], [16.8, 6.2, 49.0], [14.0, 6.1, 43.0], [11.0, 5.9, 30.0]], [0.27, 0.48]);
    loop('tubeG', [[26.0, 6.1, 52.0], [22.0, 5.8, 53.5], [19.5, 5.0, 50.0], [20.5, 4.3, 45.5], [23.5, 4.0, 43.0], [24.6, 4.4, 47.5], [22.5, 4.9, 57.5], [17.0, 5.4, 61.6], [12.0, 5.6, 61.9]], [0.36, 0.53]);
    loop('tubeB', [[16.5, 5.9, 30.0], [18.0, 5.8, 34.0], [13.5, 5.5, 38.0], [7.8, 5.8, 44.5], [4.0, 6.0, 46.0]], [0.47]);
    // slide supports on the shore
    for (const [x, y, z] of [[20.0, 3.0, 33.0], [18.6, 2.1, 36.5]]) {
      pipe('steel', [x - 0.9, 0, z], [x - 0.9, y, z], 0.05, 10);
      pipe('steel', [x - 0.9, y - 0.5, z], [x - 0.4, y - 0.62, z], 0.035);
      box(null, x - 1.0, x - 0.8, 0, 2.5, z - 0.1, z + 0.1);
    }
  }
  // ---------------- 洗脚池 chicane ----------------
  box('pool', 7.7, 9.85, -0.3, 2.6, 27.9, 28.1);
  occluders.push({ x0: 7.7, x1: 9.85, z0: 27.9, z1: 28.1 });
  lamp('CHIC', 6.9, 28, { w: 0.3, d: 1.0, I: 0.9, r: 7 });
  lamp('CHIC', 9, 29, { w: 0.9, d: 0.3, I: 0.8, r: 6 });
  lamp('CHIC', 9, 27, { w: 0.9, d: 0.3, I: 0.6, r: 6 });

  // ---------------- 更衣室 ----------------
  {
    const f = 0.2;
    for (const z of [14.0, 17.6, 21.2]) lockerBank(5.7, 17.3, z, z + 1.0, f);
    lockerBank(8.2, 14.6, 12.15, 12.65, f);
    lockerBank(9.0, 18.6, 25.35, 25.85, f);
    bench(9, 15, 15.85, f);
    bench(8.6, 12.2, 19.45, f);
    bench(13, 15.4, 19.5, f);
    bench(9, 15, 23.4, f);
    for (const [x, z, dead] of [[5.8, 15, 0], [5.8, 22, 0], [12, 15.9, 0], [12, 19.5, 1], [12, 23.4, 0], [17.5, 15, 1], [17.5, 22.5, 0]]) lamp('LOCK', x, z, { I: 0.95, r: 8, dead: !!dead });
    for (const [x, z] of [[5.6, 13.0], [6.9, 24.9], [18.2, 17.8]]) box('blue', x - 0.5, x + 0.5, f, f + 0.012, z - 0.35, z + 0.35, false);
    drain(4.9, 18.6, f);
    // hooks on the west wall, one cap left behind
    for (let z = 15; z < 23; z += 0.45) box('steel', 4.15, 4.2, 1.55, 1.58, z, z + 0.02, false);
    box('steelD', 4.15, 4.165, 1.5, 1.62, 14.8, 23.1, false);
    put('org', new THREE.SphereGeometry(0.09, 10, 6, 0, 6.3, 0, 1.6), 4.24, 1.46, 18.61);
    model('wall_clock', 18.84, 2.35, 21, -Math.PI / 2, 1.4);
    wetSign(4.7, 23.2, 1.2);
  }
  // ---------------- 淋浴间 ----------------
  {
    for (let k = 0; k <= 5; k++) {
      const x = 4.15 + k * 1.45;
      if (k > 0) {
        box('partition', x - 0.018, x + 0.018, 0.16, 1.95, 3.15, 4.5, false);
        cyl('steel', x, 0, 4.46, 0.018, 0.16, 6);
        box(null, x - 0.03, x + 0.03, 0, 1.95, 3.15, 4.5);
      }
      if (k < 5) {
        const cx = x + 0.725;
        pipe('steel', [cx, 1.0, 3.19], [cx, 2.05, 3.19], 0.014);
        pipe('steel', [cx, 2.05, 3.19], [cx, 2.0, 3.42], 0.014);
        cyl('steel', cx, 1.95, 3.42, 0.055, 0.035, 12);
        torus('steel', cx, 1.05, 3.2, 0.035, 0.012);
        drain(cx, 3.9);
      }
    }
    box('steel', 4.15, 11.4, 1.93, 1.96, 4.47, 4.5, false);
    bench(5.4, 9.6, 7.6);
    // wash basins and a mirror nobody has wiped
    box('lam', 7.6, 12.6, 0.78, 0.84, 11.35, 11.85, false);
    box('mosaic', 7.7, 12.5, 0, 0.78, 11.5, 11.85, true);
    for (const x of [8.4, 10.1, 11.8]) {
      cyl('dark', x, 0.836, 11.58, 0.19, 0.006, 18);
      pipe('steel', [x, 0.84, 11.78], [x, 0.98, 11.78], 0.012);
      pipe('steel', [x, 0.98, 11.78], [x, 0.96, 11.66], 0.012);
    }
    box('mirror', 7.9, 12.3, 1.05, 1.75, 11.835, 11.85, false);
    box('frame', 7.86, 12.34, 1.01, 1.79, 11.842, 11.851, false);
    for (const [x, z, dead] of [[6.2, 8.8, 0], [10.4, 8.8, 1], [8.4, 5.4, 0]]) lamp('SHOW', x, z, { I: 0.9, r: 8, dead: !!dead });
    drain(8.5, 9.6);
    model('garden_hose_wall_mounted_01', 4.16, 1.0, 10.6, Math.PI / 2);
  }
  // ---------------- wet corridor ----------------
  cageLamp('W1', 15.4, 2.1, 4.25);
  cageLamp('W2', 18.15, 2.1, 7.5);
  cageLamp('W3', 19.4, 2.1, 11.3);
  pipe('pipeG', [13.2, 2.25, 5.3], [16.6, 2.25, 5.3], 0.05);
  pipe('pipeG', [17.05, 2.25, 5.7], [17.05, 2.25, 12.4], 0.05);
  pipe('pipeG', [17.05, 2.25, 12.4], [20.8, 2.25, 12.4], 0.05);

  // ---------------- 滑梯 ----------------
  const PLAT = 6;
  const curve = new THREE.CatmullRomCurve3([
    [31.5, 6.62, 5.1], [31.5, 6.45, 6.6], [31.0, 6.1, 9.3], [29.0, 5.7, 11.3], [26.0, 5.3, 11.4], [24.2, 4.95, 9.4], [24.3, 4.6, 6.6], [26.2, 4.3, 5.0],
    [28.6, 4.1, 6.0], [29.3, 3.95, 8.6], [28.6, 3.85, 11.2], [27.6, 3.8, 13.0],
    // between the two halls the pipe runs where nobody can see it, and it does not run straight
    [27.0, 3.75, 14.6], [24.6, 3.7, 16.4], [22.2, 3.6, 18.6], [23.0, 3.5, 21.0], [26.6, 3.45, 22.4], [27.6, 3.4, 24.6], [25.0, 3.4, 26.2], [22.0, 3.42, 27.6], [20.8, 3.45, 29.0], [20.5, 3.45, 30.0],
    [20.0, 3.0, 33.0], [18.6, 2.1, 36.5], [17.4, 1.15, 39.8], [17.0, 0.62, 42.6],
  ].map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const slide = { curve, end: { x: 17.0, z: 43.5 }, mouth: { x: 31.5, z: 5.3 } };
  {
    push('slide', new THREE.TubeGeometry(curve, 460, 0.65, 16, false));
    torus('steel', 31.5, 6.62, 5.12, 0.69, 0.04);
    torus('steel', 17.0, 0.62, 42.58, 0.69, 0.04);
    for (const [x, y, z] of [[27.6, 3.8, 13.0], [20.5, 3.45, 30.0]]) for (const dz of [-0.17, 0.17]) put('steelD', new THREE.RingGeometry(0.66, 1.2, 24), x, y, z + dz, dz > 0 ? 0 : Math.PI);
    // steel stair, two flights and a platform
    for (let i = 1; i <= 12; i++) {
      const z0 = 10.9 - 0.55 * i, y = 0.25 * i;
      box('tread', 21.15, 22.35, y - 0.04, y, z0, z0 + 0.57);
      box(null, 22.35, 22.4, y, y + 1.1, z0, z0 + 0.55);
      if (i % 2) cyl('steel', 22.33, y, z0 + 0.28, 0.018, 1.0, 6);
      const x0 = 23.0 + 0.6 * (i - 1), y2 = 3 + 0.25 * i;
      box('tread', x0, x0 + 0.62, y2 - 0.04, y2, 2.15, 3.35);
      box(null, x0, x0 + 0.6, y2, y2 + 1.1, 3.35, 3.4);
      if (i % 2) cyl('steel', x0 + 0.3, y2, 3.33, 0.018, 1.0, 6);
    }
    beam('steelD', [22.33, 0.05, 10.65], [22.33, 2.85, 4.5], 0.05, 0.2);
    beam('steelD', [21.2, 0.05, 10.65], [21.2, 2.85, 4.5], 0.05, 0.2);
    pipe('steel', [22.33, 1.12, 10.9], [22.33, 4.0, 4.3], 0.022);
    beam('steelD', [23.1, 3.0, 3.33], [30.1, 5.85, 3.33], 0.2, 0.05);
    beam('steelD', [23.1, 3.0, 2.2], [30.1, 5.85, 2.2], 0.2, 0.05);
    pipe('steel', [23.0, 4.1, 3.33], [30.2, 7.0, 3.33], 0.022);
    box('tread', 21.15, 23.0, 2.94, 3.0, 2.15, 4.3);
    box('tread', 30.2, 32.85, PLAT - 0.06, PLAT, 2.15, 5.6);
    rail(23.0, 3.35, 23.0, 4.3, 3);
    rail(22.35, 4.3, 23.0, 4.3, 3);
    rail(30.2, 3.35, 30.2, 5.6, PLAT);
    rail(30.2, 5.6, 30.82, 5.6, PLAT);
    rail(32.18, 5.6, 32.85, 5.6, PLAT);
    for (const [x, z, h] of [[22.9, 4.2, 2.94], [22.9, 2.3, 2.94], [30.3, 5.5, 5.94], [32.75, 5.5, 5.94], [30.3, 2.3, 5.94], [26.6, 3.25, 4.4]]) pipe('steelD', [x, 0, z], [x, h, z], 0.05, 10), box(null, x - 0.07, x + 0.07, 0, Math.min(h, 2.4), z - 0.07, z + 0.07);
    for (const [x, y, z] of [[29.0, 5.7, 11.3], [24.2, 4.95, 9.4], [26.2, 4.3, 5.0]]) pipe('steel', [x, 0, z], [x, y - 0.66, z], 0.045, 10), box(null, x - 0.07, x + 0.07, 0, 2.4, z - 0.07, z + 0.07);
    pipe('steel', [29.3, -1.1, 8.6], [29.3, 3.3, 8.6], 0.045, 10);
    for (const [x, z, dead] of [[24.5, 8, 0], [29.5, 8.5, 0], [27, 3.6, 1]]) lamp('SLIDE', x, z, { w: 1.6, d: 2.4, I: 1.1, r: 18, dead: !!dead });
    cageLamp('SLIDE', 21.25, 1.9, 7.5, 0.4);
    ladder(26.5, 8.6, 1, 0);
    ringStack(24.2, 12.2, 5);
    wetSign(25.3, 10.4, 2.2);
    box('red', 30.82, 32.18, PLAT + 0.95, PLAT + 1.0, 5.57, 5.63, false);
  }

  // ---------------- corridors ----------------
  lamp('C1', 22, 17.8, { w: 0.25, d: 1.1, I: 0.8, r: 7 });
  lamp('C2', 24.8, 21, { w: 0.25, d: 1.1, I: 0.8, r: 7, dead: true });
  lamp('C3', 27.4, 23.8, { w: 0.25, d: 1.1, I: 0.75, r: 7 });
  lamp('PS', 31.6, 14, { w: 0.25, d: 0.9, I: 0.7, r: 6 });
  lamp('P2', 39.8, 29.6, { w: 0.25, d: 1.1, I: 0.8, r: 6 });
  lamp('P2', 39.8, 26.6, { w: 0.25, d: 1.1, I: 0.8, r: 6, dead: true });
  lamp('P3', 27, 33.9, { w: 0.25, d: 0.9, I: 0.8, r: 6 });
  model('korean_fire_extinguisher_01', 24.3, 0, 22.3, Math.PI / 2);
  bench(20.2, 22.6, 17.4);
  pipe('pipeG', [19.2, 2.3, 18.35], [25.3, 2.3, 18.35], 0.04);
  pipe('pipeG', [25.3, 2.3, 18.35], [25.3, 2.3, 24.3], 0.04);
  pipe('pipeG', [25.3, 2.3, 24.3], [29.8, 2.3, 24.3], 0.04);

  // ---------------- 服务台 ----------------
  {
    const f = 0.2;
    // counter: taller than a seven-year-old's eyes
    box('cream', 36.2, 43.85, f, f + 1.02, 17.9, 18.5);
    box('wood', 36.1, 43.85, f + 1.02, f + 1.06, 17.8, 18.6, false);
    // shelves of lost things behind it
    for (const y of [0.9, 1.4, 1.9]) box('lam', 37, 43, f + y, f + y + 0.03, 15.15, 15.5, false);
    for (const x of [37, 40, 43]) box('lam', x - 0.02, x + 0.02, f + 0.2, f + 2.2, 15.15, 15.5, false);
    for (const [x, y, m] of [[37.6, 0.93, 'org'], [38.3, 0.93, 'blue'], [39.2, 1.43, 'yel'], [40.6, 0.93, 'red'], [41.4, 1.43, 'blue'], [42.3, 0.93, 'plastic'], [41.9, 1.93, 'org']]) box(m, x, x + 0.22, f + y, f + y + 0.09 + R() * 0.1, 15.2, 15.42, false);
    torus('org', 38.9, f + 1.52, 15.33, 0.1, 0.035, Math.PI / 2);
    // turnstiles and the doors to outside
    for (const z of [19.9, 21.2, 22.5]) {
      box('steel', 41.1, 42.1, f, f + 0.95, z - 0.11, z + 0.11);
      for (const a of [0.5, 2.6, 4.7]) pipe('steel', [41.6, f + 0.8, z + 0.11], [41.6 + Math.cos(a) * 0.1, f + 0.8 + Math.sin(a) * 0.36, z + 0.5], 0.016);
    }
    box(null, 41.5, 41.7, f, f + 1.0, 18.5, 23.0);
    rail(41.6, 23.0, 41.6, 25.05, f);
    box('day', 43.83, 43.85, f + 0.1, f + 2.5, 19.2, 23.2, false);
    for (const z of [19.2, 20.2, 21.2, 22.2, 23.2]) box('steelD', 43.78, 43.85, f, f + 2.6, z - 0.04, z + 0.04, false);
    box('steelD', 43.78, 43.85, f + 2.5, f + 2.62, 19.2, 23.2, false);
    box('steelD', 43.78, 43.85, f + 1.0, f + 1.06, 19.2, 23.2, false);
    lights.push({ x: 43.2, z: 21.2, hy: 1.4, I: 1.5, r: 9, col: [1, 1, 1] });
    for (let k = 0; k < 5; k++) chair(31.2 + k * 0.62, 24.65, Math.PI, f);
    // the queue: three rails that make you walk back and forth to reach the desk
    rail(36.4, 19.5, 40.0, 19.5, f, 0.85);
    rail(37.0, 20.5, 40.9, 20.5, f, 0.85);
    rail(36.4, 21.5, 40.0, 21.5, f, 0.85);
    rail(36.4, 19.5, 36.4, 21.5, f, 0.85);
    chair(30.6, 20.2, Math.PI / 2, f);
    chair(30.6, 20.85, Math.PI / 2, f);
    model('metal_trash_can', 35.2, f, 24.7, 1);
    box(null, 34.9, 35.5, f, f + 0.9, 24.4, 25.0);
    for (const [x, z, dead] of [[33, 18.5, 0], [33, 23.2, 1], [38, 22.6, 0], [40, 16.6, 0]]) lamp('LOBBY', x, z, { I: 0.95, r: 9, dead: !!dead });
    model('wall_clock', 34.2, 2.5, 15.16, 0, 1.6);
    box('blue', 31, 32.2, f, f + 0.012, 15.3, 16.1, false);
  }

  // ---------------- 小卖部 · 漂流河 ----------------
  {
    // kiosk against the east wall
    box('coral', 41.2, 41.8, 0, 0.95, 35.2, 41.6);
    box('lam', 41.1, 41.9, 0.95, 0.99, 35.1, 41.7, false);
    box('coral', 41.8, 43.85, 0, 0.95, 35.2, 35.8);
    box('frame', 41.2, 43.85, 2.3, 3.2, 35.2, 35.3, false);
    box('frame', 41.2, 41.3, 2.3, 3.2, 35.2, 41.6, false);
    for (const z of [35.25, 41.55]) box('frame', 41.2, 41.3, 0.99, 2.3, z - 0.04, z + 0.04, false);
    box('plastic', 42.9, 43.8, 0, 0.82, 36.2, 37.8);
    box('glassTop', 42.92, 43.78, 0.82, 0.84, 36.22, 37.78, false);
    box('panel', 42.95, 43.75, 0.6, 0.62, 36.25, 37.75, false);
    box('dark', 43.1, 43.83, 0, 1.95, 39.2, 40.0);
    lights.push({ x: 42.6, z: 39.6, hy: 1.2, I: 0.45, r: 5, col: [0.8, 0.95, 1] }, { x: 42.4, z: 37, hy: 1.2, I: 0.3, r: 4, col: [0.8, 0.95, 1] });
    for (const [x, z] of [[29.5, 36.2], [35.8, 34.6]]) {
      table(x, z);
      cyl('steel', x, 0.7, z, 0.02, 1.75, 8);
      put('awning', new THREE.ConeGeometry(1.25, 0.4, 8, 1, true), x, 2.5, z, 0.3);
    }
    for (const [x, z] of [[34.2, 38.4], [39.3, 43.6], [33.6, 33.0], [38.6, 37.6], [33.4, 44.4]]) {
      box('coral', x - 0.3, x + 0.3, 0, 1.2, z - 0.3, z + 0.3);
      box('wall', x - 0.3, x + 0.3, 1.2, 2.9, z - 0.3, z + 0.3);
      occluders.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 });
    }
    for (const [x, z] of [[43.3, 32.0], [42.5, 31.9], [28.7, 38.6]]) {
      for (let k = 0; k < 5; k++) model('plastic_monobloc_chair_01', x, k * 0.13, z, 0.2);
      box(null, x - 0.3, x + 0.3, 0, 1.4, z - 0.3, z + 0.3);
    }
    rail(40.3, 35.6, 40.3, 41.2, 0, 0.85);
    for (const [x, z, n, m] of [[40.8, 43.0, 3, 'blue'], [41.4, 43.1, 2, 'red'], [40.9, 43.7, 1, 'blue'], [34.3, 47.9, 2, 'red']])
      for (let k = 0; k < n; k++) box(m, x - 0.26, x + 0.26, k * 0.32, k * 0.32 + 0.3, z - 0.18, z + 0.18, k === 0 ? undefined : false), k === n - 1 && box(null, x - 0.26, x + 0.26, 0, n * 0.32, z - 0.18, z + 0.18);
    grp(30.7, 0, 32.2, 0.5, () => {
      box('steelD', -0.45, 0.45, 0, 0.12, -0.7, 0.7, false);
      box('red', -0.3, 0.3, 0.3, 0.62, -0.65, 0.6, false);
      box('red', -0.3, 0.3, 0.62, 0.95, -0.2, -0.05, false);
      box('yel', -0.28, 0.28, 0.62, 0.7, 0.2, 0.6, false);
      for (const [sx, sz] of [[-0.32, -0.42], [0.32, -0.42], [-0.32, 0.38], [0.32, 0.38]]) put('dark', new THREE.CylinderGeometry(0.15, 0.15, 0.08, 14), sx, 0.3, sz, 0, 0, Math.PI / 2);
      torus('dark', 0, 0.82, 0.0, 0.11, 0.018, -0.5);
      cyl('steelD', 0, 0.12, 0, 0.07, 0.2, 10);
      box('steelD', 0.5, 0.68, 0, 0.9, -0.1, 0.1, false);
      box(null, -0.45, 0.68, 0, 0.9, -0.7, 0.7);
    });
    for (const [x, z, a] of [[29.5, 35.4, 0], [30.3, 36.3, -1.5], [28.8, 36.9, 1.6], [35.8, 33.8, 0], [36.6, 34.7, -1.6], [35.0, 34.8, 1.5]]) chair(x, z, a);
    model('plastic_monobloc_chair_01', 37.2, 0.3, 37.0, 0.7, 1, { rz: Math.PI / 2 });
    model('metal_trash_can', 28.6, 0, 31.6, 2);
    box(null, 28.3, 28.9, 0, 0.9, 31.3, 31.9);

    // the river comes out of the wall over a little fall
    box('pool', 28.15, 28.95, -1.3, 1.25, 39.6, 41.3);
    box('cope', 28.15, 29.05, 1.25, 1.32, 39.5, 41.4, false);
    box('pool', 28.15, 28.7, 1.32, 1.5, 39.6, 41.3, false);
    box('dark', 28.7, 28.72, 1.335, 1.44, 39.75, 41.15, false);
    lights.push({ x: 29.6, z: 40.4, hy: 1.2, I: 0.7, r: 5, col: [0.6, 0.95, 1] });
    // railings on every bank; the only ways in are the steps and the ladder
    rail(29.1, 39.5, 31, 39.5, 0);
    rail(32.4, 39.5, 38, 39.5, 0);
    rail(38, 39.5, 38, 45.4, 0);
    rail(38, 45.4, 40.6, 45.4, 0);
    rail(41.4, 45.4, 43.85, 45.4, 0);
    rail(30.6, 42.5, 31, 42.5, 0);
    rail(32.4, 42.5, 35, 42.5, 0);
    rail(35, 42.5, 35, 48.25, 0);
    ladder(41, 45.4, 0, 1);
    // footbridge to the boarding dock
    for (const [z0, z1, y] of [[38.6, 39.05, 0.27], [39.05, 39.5, 0.54], [42.5, 42.95, 0.54], [42.95, 43.4, 0.27]]) box('tread', 31, 32.4, 0, y, z0, z1);
    box('wood', 31, 32.4, 0.68, 0.8, 39.5, 42.5);
    for (const x of [31.02, 32.38]) {
      rail(x, 39.5, x, 42.5, 0.8, 0.9);
      beam('steelD', [x, 0.74, 39.5], [x, 0.74, 42.5], 0.05, 0.16);
    }
    for (const x of [30.85, 32.55]) pipe('blue', [x, 0, 38.5], [x, 2.55, 38.5], 0.05, 10), box(null, x - 0.07, x + 0.07, 0, 2.5, 38.43, 38.57);
    // the dock: ring hire, steps down into the water
    box('coral', 28.15, 28.9, 0, 0.9, 44.3, 47.4);
    box('lam', 28.15, 29.0, 0.9, 0.94, 44.2, 47.5, false);
    ringStack(29.7, 47.75, 6);
    ringStack(30.6, 47.85, 3);
    ringStack(32.6, 47.8, 4);
    for (const s of [28.42, 30.58]) pipe('steel', [s, 0.85, 42.6], [s, -0.15, 41.2], 0.022);
    bench(31.2, 33.6, 46.2);
    for (const [x, z, dead] of [[31.5, 34.5, 0], [33, 41, 0], [36, 37.4, 1], [39.5, 33.5, 0], [40.5, 43.8, 0], [31.5, 45.6, 0], [36.5, 46.6, 1]]) lamp('SNACK', x, z, { I: 0.95, r: 9, dead: !!dead });
    box('steelD', 43.8, 43.86, 1.25, 1.33, 46.1, 48.3, false);
    wetSign(40.4, 44.4, 0.5);
  }

  // ---------------- 监控室: not on the map ----------------
  {
    const f = 0.2;
    box('lam', 46.6, 48.45, f + 0.72, f + 0.76, 15.15, 15.9, false);
    box('steelD', 46.6, 48.45, f, f + 0.72, 15.3, 15.85);
    box('steelD', 44.75, 46.85, f + 1.05, f + 2.2, 15.15, 15.3, false);
    box('steelD', 47.9, 48.45, f, f + 1.8, 17.5, 18.45);
    chair(47.3, 16.5, 2.6, f);
    lights.push({ x: 45.7, z: 15.9, hy: 1.2, I: 0.55, r: 4.5, col: [0.6, 0.85, 1] }, { x: 47.5, z: 15.9, hy: 1.2, I: 0.35, r: 4, col: [0.6, 0.85, 1] });
  }

  // ---------------- the corridor that was short a minute ago ----------------
  const MATS = [];
  {
    // eight mats the full width of the corridor, 0.6 m apart: a walking jump clears a gap, a running one is comfortable
    for (let k = 0; k < 8; k++) {
      const z0 = 23.2 + k * 2.3, x0 = 50.0;
      MATS.push([x0, z0, k]);
      // solid all the way down, so nobody ends up wedged underneath the edge of one
      box(null, x0, x0 + 1.2, -1.0, 0.24, z0, z0 + 1.7);
    }
    for (const [z, dead] of [[21.3, 0], [26.5, 1], [31.7, 0], [36.9, 0], [42.1, 1]]) lamp('LONG', 50.6, z, { w: 0.25, d: 1.1, I: 0.75, r: 7, dead: !!dead });
    lamp('LEND', 50.6, 44.7, { w: 0.25, d: 0.6, I: 0.5, r: 4 });
    pipe('pipeG', [51.1, 2.3, 20.2], [51.1, 2.3, 43.8], 0.04);
  }

  // ---------------- behind the staff door ----------------
  {
    const f = 0.2, door = (x, z, ax, lit) => {
      // a door in the wall: three of them never open
      const w = 0.45, t = 0.03;
      if (ax === 'x') box('lam', x - t, x + t, f, f + 1.85, z - w, z + w, false), box('steelD', x - t - 0.01, x + t + 0.01, f + 1.85, f + 1.92, z - w - 0.05, z + w + 0.05, false);
      else box('lam', x - w, x + w, f, f + 1.85, z - t, z + t, false), box('steelD', x - w - 0.05, x + w + 0.05, f + 1.85, f + 1.92, z - t - 0.01, z + t + 0.01, false);
      if (lit) ax === 'x' ? box('warm', x - t - 0.005, x + t + 0.005, f, f + 0.02, z - w, z + w, false) : box('warm', x - w, x + w, f, f + 0.02, z - t - 0.005, z + t + 0.005, false);
    };
    // a handrail at a small child's height along every wall, the kind they put in the children's area
    const post = (x, z) => cyl('steelD', x, f, z, 0.025, 0.55, 6);
    // the corridor: a lamp every four metres, a pipe, nothing else, so that every four metres is the same four metres
    for (let z = 65.2; z < 79; z += 4) cageLamp('M1', 5.85, 1.8, z, 1.0), post(4.8, z + 2), post(5.8, z + 2);
    pipe('pipeG', [4.85, 1.95, 63.4], [4.85, 1.95, 79.2], 0.05);
    for (const x of [4.8, 5.8]) pipe('yel', [x, f + 0.75, 63.4], [x, f + 0.75, 79.2], 0.025);
    pipe('org', [4.85, 1.75, 63.4], [4.85, 1.75, 79.2], 0.025);
    door(5.3, 79.22, 'z', true);
    lights.push({ x: 5.3, z: 78.6, hy: 1.2, I: 0.45, r: 3.5, col: [1, 0.75, 0.45] });
    // the square: the same on all four sides, a lamp in the middle of each, a door a third of the way along each
    for (const [x, z] of [[12, 66.98], [16.02, 71], [12, 75.02], [7.98, 71]]) cageLamp('RN', x, 1.8, z, 1.1);
    for (const [x, z] of [[8.0, 67.0], [16.0, 67.0], [8.0, 75.0], [16.0, 75.0]]) post(x, z);
    for (const [a, b] of [[[8, 67.0], [16, 67.0]], [[16.0, 67], [16.0, 75]], [[16, 75.0], [8, 75.0]], [[8.0, 75], [8.0, 67]]]) pipe('pipeG', [a[0], 1.95, a[1]], [b[0], 1.95, b[1]], 0.05);
    door(10.4, 66.98, 'z');
    door(16.02, 69.4, 'x', true);
    door(13.6, 75.02, 'z');
    door(7.98, 72.6, 'x');
    lights.push({ x: 15.7, z: 69.4, hy: 1.2, I: 0.35, r: 3, col: [1, 0.75, 0.45] });
    // the crossing: three arms long enough to look like ways on, each with a lamp and a door at the end
    for (const x of [21.8, 23.2]) for (const z of [70.3, 71.7]) box('coral', x - 0.15, x + 0.15, -0.3, 2.1, z - 0.15, z + 0.15, false), occluders.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15 }), box(null, x - 0.15, x + 0.15, -0.3, 2.1, z - 0.15, z + 0.15);
    cageLamp('MS', 22.5, 1.8, 75.4, 1.1);
    cageLamp('MJ', 22.5, 1.8, 71, 0.8);
    cageLamp('MN', 22.5, 1.8, 65.6, 1.4);
    cageLamp('MN', 22.5, 1.8, 68.6, 1.0);
    cageLamp('MW', 17.4, 1.8, 71, 1.4);
    cageLamp('MW', 20.0, 1.8, 71, 1.0);
    cageLamp('ME', 26.8, 1.8, 71, 1.4);
    cageLamp('ME', 25.0, 1.8, 71, 1.0);
    for (const z of [67.6, 73.6]) post(21.95, z), post(23.05, z);
    for (const x of [19.4, 25.2]) post(x, 70.45), post(x, 71.55);
    door(22.5, 78.42, 'z');
    door(22.5, 64.78, 'z', true);
    door(16.78, 71, 'x', true);
    door(27.42, 71, 'x', true);
    for (const [x, z] of [[22.5, 65.3], [17.3, 71], [26.9, 71]]) lights.push({ x, z, hy: 1.1, I: 0.4, r: 3, col: [1, 0.75, 0.45] });
    pipe('pipeG', [21.95, 1.95, 64.8], [21.95, 1.95, 78.4], 0.05);
    pipe('pipeG', [16.8, 1.95, 70.45], [27.4, 1.95, 70.45], 0.05);
  }

  // ---------------- tunnel, pump room, service passage ----------------
  cageLamp('T1', 46, 1.45, 46.25, 0.4);
  cageLamp('T2', 49.15, 1.45, 52, 0.35);
  cageLamp('T3', 42, 1.45, 55.85, 0.35);
  cageLamp('T3', 33.2, 1.45, 55.85, 0.4);
  ladder(32.4, 56.15, 1, 0);
  for (const s of [48.2, 54.2]) pipe('steelD', s < 50 ? [44.2, 1.5, 48.1] : [47.3, 1.5, 55.9], s < 50 ? [49.2, 1.5, 48.1] : [34, 1.5, 55.9], 0.03);
  {
    const f = 0.2;
    for (const [x, z] of [[34, 53.6], [36.6, 53.6], [39.2, 53.6]]) {
      cyl('tank', x, f + 0.25, z, 0.85, 1.7, 22);
      put('tank', new THREE.SphereGeometry(0.85, 22, 8, 0, 6.3, 0, 1.57), x, f + 1.95, z);
      put('tank', new THREE.SphereGeometry(0.85, 22, 8, 0, 6.3, 1.57, 1.57), x, f + 0.25, z);
      for (const a of [0.8, 2.4, 3.9, 5.5]) pipe('steelD', [x + Math.cos(a) * 0.6, f, z + Math.sin(a) * 0.6], [x + Math.cos(a) * 0.6, f + 0.3, z + Math.sin(a) * 0.6], 0.03);
      pipe('pipeG', [x, f + 2.8, z], [x, f + 2.3, z], 0.07);
      pipe('pipeG', [x - 0.9, f + 1.0, z - 0.6], [x - 0.9, f + 1.0, z - 1.6], 0.06);
      torus('red', x - 0.9, f + 1.0, z - 1.1, 0.11, 0.015, 0, Math.PI / 2);
      box(null, x - 0.85, x + 0.85, f, f + 2.4, z - 0.85, z + 0.85);
    }
    pipe('pipeG', [31, f + 2.6, 53.6], [46.5, f + 2.6, 53.6], 0.07);
    pipe('pipeG', [33.1, f + 1.0, 52.0], [46.6, f + 1.0, 52.0], 0.06);
    pipe('pipeG', [46.6, f + 1.0, 52.0], [46.6, f + 1.0, 49.0], 0.06);
    pipe('org', [30.3, f + 2.3, 48.7], [46.7, f + 2.3, 48.7], 0.035);
    pipe('org', [30.3, f + 2.45, 48.7], [46.7, f + 2.45, 48.7], 0.035);
    // switchgear
    box('steelD', 42, 43.6, f, f + 1.9, 48.56, 48.95);
    for (const [x, m] of [[42.3, 'exit'], [42.6, 'exit'], [42.9, 'warm'], [43.2, 'red']]) cyl(m, x, f + 1.55, 48.95, 0.025, 0.02, 8);
    box('yel', 44.6, 46.4, f, f + 0.005, 49.3, 51.2, false);
    // drain valve: the square stem is there, the handwheel is not
    pipe('pipeG', [46.6, f + 1.0, 50.6], [46.25, f + 1.0, 50.6], 0.05);
    cyl('steelD', 46.2, f + 0.93, 50.6, 0.07, 0.14, 8);
    box('steel', 46.02, 46.2, f + 0.985, f + 1.015, 50.585, 50.615, false);
    // mop and bucket
    cyl('blue', 31.2, f, 52.6, 0.15, 0.3, 12, 0.18);
    pipe('wood', [31.2, f + 0.1, 52.6], [30.5, f + 1.5, 52.2], 0.015);
    model('garden_hose_wall_mounted_01', 37.8, 1.3, 48.56, 0);
    cageLamp('PUMP', 33, 2.6, 50.3, 1.3, [1, 0.85, 0.6]);
    cageLamp('PUMP', 40.5, 2.6, 50.3, 1.3, [1, 0.85, 0.6]);
    cageLamp('PUMP', 45.3, 2.6, 54.2, 1.0, [1, 0.85, 0.6]);
    // the valve has a lamp of its own, and it stays on
    cageLamp('PUMP', 45.4, 2.3, 50.6, 1.5, [1, 0.9, 0.7]);
    cageLamp('PUMP', 36.6, 2.6, 55.2, 0.9, [1, 0.85, 0.6]);
    cageLamp('SVC', 28, 2.1, 50.02, 0.5);
    pipe('pipeG', [26.2, 2.1, 51.2], [29.8, 2.1, 51.2], 0.05);
  }

  // ---------------- back corridor to the children's pool ----------------
  lamp('BACK', 27, 60.5, { w: 0.25, d: 1.1, I: 0.7, r: 7 });
  lamp('BACK', 27, 65, { w: 0.25, d: 1.1, I: 0.7, r: 7, dead: true });
  lights.push({ x: 27.4, z: 68.2, hy: 1.3, I: 0.55, r: 5, col: [1, 0.75, 0.42] });
  for (const [x, z, a] of [[26.6, 69.3, 0.4], [26.9, 69.0, 2.1], [27.4, 69.4, -0.8]]) model('rubber_duck_toy', x, 0, z, a);
  chair(27.45, 64.3, -Math.PI / 2);

  // ---------------- terrace and the children's pool behind glass ----------------
  {
    // glazing: one pane, mullions, a low sill
    box('glassTop', GLASS.x0, GLASS.x1, 0, GLASS.h, GLASS.z - 0.012, GLASS.z + 0.012, false);
    box(null, GLASS.x0, GLASS.x1, 0, GLASS.h, GLASS.z - 0.08, GLASS.z + 0.08);
    for (let x = GLASS.x0; x <= GLASS.x1 + 0.01; x += (GLASS.x1 - GLASS.x0) / 6) box('frame', x - 0.035, x + 0.035, 0, GLASS.h, GLASS.z - 0.05, GLASS.z + 0.05, false);
    box('frame', GLASS.x0, GLASS.x1, 0, 0.08, GLASS.z - 0.06, GLASS.z + 0.06, false);
    box('frame', GLASS.x0, GLASS.x1, GLASS.h - 0.08, GLASS.h, GLASS.z - 0.06, GLASS.z + 0.06, false);
    lounger(30.2, 61.6, 0.1);
    lounger(42.2, 61.8, -0.15);
    cageLamp('TERR', 31, 2.6, 59.75, 0.35, [0.8, 0.9, 1]);
    // light from under the water where the passage comes in
    box('glow', 35.8, 37.2, -1.22, -1.2, 58.1, 59.6, false);
    lights.push({ x: 36.5, z: 58.9, hy: 1.2, I: 1.6, r: 4.5, col: [0.5, 1, 0.9] }, { x: 36.5, z: 61.3, hy: 1.3, I: 0.8, r: 6, col: [0.6, 1, 0.9] });
    // the warm room
    for (const [x, z] of [[32, 68], [40, 68], [32, 74.5], [40, 74.5], [36, 71.5]]) lamp('KIDS', x, z, { w: 1.0, d: 1.0, I: 1.25, r: 12, col: [1, 0.8, 0.5], mat: 'panelW' });
    // mushroom fountain, little slide
    cyl('plastic', 36.5, -0.35, 72.8, 0.16, 1.5, 14);
    put('red', new THREE.SphereGeometry(1.0, 22, 8, 0, 6.3, 0, 1.3), 36.5, 0.85, 72.8);
    for (let k = 0; k < 9; k++) {
      const a = k * 0.7, rr = 0.35 + (k % 3) * 0.25;
      put('plastic', new THREE.SphereGeometry(0.1, 8, 6), 36.5 + Math.cos(a) * rr, 0.85 + Math.sqrt(1 - rr * rr) * 0.985, 72.8 + Math.sin(a) * rr);
    }
    beam('blue', [33.2, 0.95, 74], [33.2, -0.2, 72.2], 0.5, 0.03);
    for (const sx of [-0.26, 0.26]) beam('blue', [33.2 + sx, 1.05, 74], [33.2 + sx, -0.1, 72.2], 0.03, 0.2);
    box('yel', 32.9, 33.5, -0.35, 0.95, 74, 74.7, false);
    for (const [x, z, a] of [[38.4, 71, 0.5], [39.3, 73.6, 2.6], [34.6, 75.2, -1.2], [40.6, 70.1, 1.4]]) model('rubber_duck_toy', x, WATER0 - 0.03, z, a);
    // three loungers by the glass
    for (const x of [32.8, 34.1, 35.4]) lounger(x, 67.6, Math.PI);
    table(37.2, 66.7);
    lounger(41.6, 67.6, Math.PI + 0.2);
  }

  return { PLAT, slide, MATS };
}

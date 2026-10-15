import * as THREE from 'three';
import * as T from './tex.js';
import { rng } from './rng.js';
import { PASSAGE, GLASS, FAM, RM, TW } from './layout.js';
import { patch } from './shade.js';
import { t } from './i18n.js';
import { cvs, text, muralWave, muralKids, poster, fridgeTex, doorTex, CAMS, scrawl, planTex } from './maptex.js';

// Signs, pictures, and the things the story touches: what gets picked up, opened, shut, swapped or hidden.
export function placeProps(scene, G, K, M, R, PLAT, MATS) {
  const { addSolid, anchor } = K;
  // ---------------- small things placed by hand ----------------
  const add = (geo, mat, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  };
  const pm = (o, noZone) => patch(new THREE.MeshStandardMaterial(o), G, noZone);
  const signMat = (t) => pm({ map: t, roughness: 0.5, side: THREE.DoubleSide });
  function sign(lines, w, h, id, side, along, y, opts) {
    const [x, z, ry] = anchor(id, side, along);
    return add(new THREE.PlaneGeometry(w, h), signMat(T.sign(lines, { w: Math.round((160 * w) / h), h: 160, ...opts })), side === 'W' || side === 'E' ? x : along, y, side === 'W' || side === 'E' ? along : z, ry);
  }
  const picture = (tex, w, h, id, side, along, y, o = {}) => {
    const [x, z, ry] = anchor(id, side, along);
    return add(new THREE.PlaneGeometry(w, h), pm({ map: tex, roughness: 0.85, ...o }), side === 'W' || side === 'E' ? x : along, y, side === 'W' || side === 'E' ? along : z, ry);
  };
  const GRN = { bg: '#2a6a58' }, RED = { bg: '#f1eee2', fg: '#8c2a22' }, ORG = { bg: '#c57a2a' }, GRY = { bg: '#3d4a4c' };
  // wave hall
  picture(muralWave(), 16, 4, 'WAVE', 'W', 49, 4.0);
  sign('更衣室 · 淋浴', 1.7, 0.4, 'WAVE', 'N', 9, 2.5, { size: 72, w: 680, ...GRN });
  sign('小卖部 · 服务台  →', 2.0, 0.4, 'WAVE', 'E', 31.6, 2.5, { size: 70, w: 800 });
  sign('儿童区  →', 1.3, 0.4, 'WAVE', 'E', 55.8, 2.5, { size: 76, ...ORG });
  sign('员工通道', 0.9, 0.28, 'WAVE', 'E', 50.6, 2.25, { size: 84, ...GRY });
  sign('深水区 2.4m', 2.6, 0.5, 'WAVE', 'S', 15, 2.2, { w: 800, size: 78, ...RED });
  for (const [z, t] of [[44, '0.5m'], [50, '1.2m'], [56, '1.8m']]) for (const s of ['W', 'E']) sign(t, 0.6, 0.26, 'WAVE', s, z, 0.45, { size: 90, w: 370, ...RED });
  sign(['造浪时请勿', '靠近池壁'], 1.2, 0.6, 'WAVE', 'E', 44, 1.9, { w: 400, h: 200, size: 44, ...RED });
  sign('请洗脚后进入泳区', 1.6, 0.3, 'CHIC', 'E', 27.0, 1.8, { size: 72, w: 850, ...GRN });
  // changing rooms
  for (const [z, n] of [[14.0, 101], [17.6, 181], [21.2, 261]]) add(new THREE.PlaneGeometry(0.6, 0.2), signMat(T.sign(`A ${n}–${n + 79}`, { size: 72, bg: '#e9e6da', fg: '#2c3a40', w: 480 })), 5.685, 2.0, z + 0.5, -Math.PI / 2);
  sign('淋浴', 0.7, 0.3, 'LOCK', 'N', 5.65, 2.45, { size: 90, w: 370, ...GRN });
  sign('泳池  ↓', 1.0, 0.3, 'LOCK', 'S', 7.0, 2.45, { size: 84, w: 530, ...GRN });
  sign('出口 · 服务台  →', 1.6, 0.32, 'LOCK', 'E', 17.8, 2.5, { size: 72, w: 800 });
  picture(poster('更衣须知', ['一、贵重物品请勿存放', '二、手牌遗失照价赔偿', '三、儿童须由家长陪同', '四、地面湿滑 小心慢行', '五、闭园前请取回衣物']), 0.8, 1.12, 'LOCK', 'W', 13.6, 1.7);
  sign('滑梯  →', 1.0, 0.3, 'SHOW', 'E', 4.8, 2.35, { size: 84, w: 530, bg: '#b98a1f' });
  sign('滑梯  ↑', 0.9, 0.28, 'W2', 'E', 7.5, 1.9, { size: 84, w: 510, bg: '#b98a1f' });
  // slide room
  sign(['一次一人', '身高1.1米以上'], 1.0, 0.5, 'SLIDE', 'E', 4.6, PLAT + 1.9, { w: 400, h: 200, size: 44, ...RED });
  sign('服务台  ↓', 1.0, 0.3, 'SLIDE', 'S', 31.6, 2.5, { size: 84, w: 530 });
  sign('此池停用', 0.9, 0.3, 'SLIDE', 'E', 9, 1.2, { size: 84, w: 480, ...RED });
  // corridors
  picture(poster('游泳须知', ['· 患心脏病、皮肤病者', '  谢绝入池', '· 不要在池边奔跑', '· 不会游泳者请勿', '  进入深水区', '· 请看管好您的孩子'], '#f3f0e4'), 0.8, 1.12, 'C1', 'N', 22.4, 1.65);
  sign('服务台  →', 1.0, 0.3, 'C3', 'N', 27, 2.05, { size: 84, w: 530 });
  // lobby
  add(new THREE.PlaneGeometry(2.6, 0.5), signMat(T.sign('服 务 台', { size: 96, w: 832 })), 40.4, 0.2 + 2.45, 15.5, 0);
  sign('失物招领', 1.2, 0.32, 'LOBBY', 'N', 37.6, 2.6, { size: 84, w: 600, ...GRY });
  sign('出 口', 1.2, 0.4, 'LOBBY', 'E', 21.2, 2.85, { size: 100, w: 480, bg: '#0d6a3a' });
  sign('小卖部 · 漂流河  ↓', 1.8, 0.32, 'LOBBY', 'S', 39.8, 2.6, { size: 72, w: 900 });
  sign('更衣室  ←', 1.0, 0.3, 'LOBBY', 'W', 23.8, 2.6, { size: 84, w: 530, ...GRN });
  // the line a child has to be under to get in free
  add(new THREE.PlaneGeometry(0.5, 1.5), signMat(cvs(128, 384, (x) => {
    x.fillStyle = '#f1eee2';
    x.fillRect(0, 0, 128, 384);
    x.fillStyle = '#c8473d';
    x.fillRect(0, 76, 128, 6);
    text(x, '1.2米', 64, 60, 30, '#c8473d');
    text(x, '儿童', 64, 130, 28, '#2c3a40');
    text(x, '免票', 64, 170, 28, '#2c3a40');
    for (let k = 0; k < 12; k++) x.fillRect(0, 90 + k * 24, k % 5 ? 14 : 30, 2);
  })), 37, 0.2 + 0.75, 25.035, Math.PI);
  // snack bar
  add(new THREE.PlaneGeometry(2.6, 0.8), signMat(cvs(832, 256, (x) => {
    x.fillStyle = '#b9443a';
    x.fillRect(0, 0, 832, 256);
    text(x, '小 卖 部', 150, 80, 60, '#fff3d0');
    [['冰淇淋', '3'], ['烤肠', '2'], ['可乐', '3']].forEach(([n, p], i) => text(x, `${t(n)}  ¥${p}`, 330 + i * 0, 70 + i * 70, 44, '#fff', 'left'));
    [['泡面', '5'], ['泳圈租借', '10'], ['矿泉水', '2']].forEach(([n, p], i) => text(x, `${t(n)}  ¥${p}`, 570, 70 + i * 70, 44, '#fff', 'left'));
  })), 41.19, 2.5, 38.4, -Math.PI / 2);
  add(new THREE.PlaneGeometry(0.7, 1.7), patch(new THREE.MeshBasicMaterial({ map: fridgeTex(), color: new THREE.Color(1.5, 1.6, 1.7) }), G), 43.09, 1.0, 39.6, -Math.PI / 2);
  sign('漂流河隧道', 1.8, 0.36, 'SNACK', 'E', 47.2, 1.62, { w: 800, size: 74, ...GRY });
  sign(['请使用泳圈', '中途不可上岸'], 1.0, 0.5, 'SNACK', 'S', 41.5, 1.9, { w: 400, h: 200, size: 44, ...RED });
  sign('泳圈租借', 0.9, 0.26, 'SNACK', 'W', 44.9, 1.5, { size: 84, w: 560, ...ORG });
  sign('服务台  ↑', 1.0, 0.3, 'SNACK', 'N', 39.8, 2.6, { size: 84, w: 530 });
  sign('机房  →', 0.8, 0.24, 'RN', 'N', 14.6, 1.55, { size: 90, w: 530, ...GRY });
  // behind the staff door: the children's-area rule on every wall, and the line you are under
  {
    const rule = (id, side, along) => sign(['身高1.2米以下儿童', '须由家长陪同'], 0.62, 0.31, id, side, along, 1.45, { w: 420, h: 210, size: 40, ...RED });
    const chart = cvs(128, 384, (x) => {
      x.fillStyle = '#f1eee2';
      x.fillRect(0, 0, 128, 384);
      x.fillStyle = '#c8473d';
      x.fillRect(0, 76, 128, 6);
      text(x, '1.2米', 64, 60, 30, '#c8473d');
      x.fillStyle = '#2c3a40';
      for (let k = 0; k < 12; k++) x.fillRect(0, 90 + k * 24, k % 5 ? 14 : 30, 2);
    });
    const tall = (id, side, along) => picture(chart, 0.32, 0.95, id, side, along, 0.2 + 0.72);
    for (let z = 65.2; z < 79; z += 4) rule('M1', 'W', z + 1), tall('M1', 'E', z + 2.6);
    for (const [id, side, along] of [['RN', 'N', 12], ['RS', 'S', 12], ['RW', 'W', 71], ['RE', 'E', 71]]) rule(id, side, along);
    for (const [id, side, along] of [['RN', 'S', 10], ['RS', 'N', 14], ['RW', 'E', 69.6], ['RE', 'W', 72.4]]) tall(id, side, along);
    // every arm of the crossing is signposted the same way
    for (const [id, side, along] of [['MN', 'W', 65.9], ['MW', 'N', 17.9], ['ME', 'N', 26.3]]) sign('儿童区  →', 0.6, 0.2, id, side, along, 1.6, { size: 80, w: 480, ...ORG });
    rule('MS', 'W', 74.5);
    tall('MS', 'E', 76.2);
  }
  // pump room and back corridor
  sign('造浪机控制', 0.9, 0.22, 'PUMP', 'N', 42.8, 2.3, { size: 84, w: 660, bg: '#e8c532', fg: '#222' });
  sign(['闲人免进'], 0.7, 0.24, 'T3', 'N', 31.1, 2.2, { size: 90, w: 470, ...RED });
  sign('儿 童 区', 1.3, 0.36, 'BACK', 'E', 68.2, 2.3, { size: 86, w: 580, ...ORG });
  sign(['身高1.2米以下儿童', '须由家长陪同'], 0.9, 0.45, 'BACK', 'W', 68.2, 1.5, { w: 420, h: 210, size: 40, ...RED });
  // painted footprints on the floor leading to the door
  {
    const fp = patch(new THREE.MeshBasicMaterial({ map: T.footprintTex(), transparent: true, depthWrite: false, color: '#e8742a', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), G);
    for (let z = 58.4, k = 0; z < 67.4; z += 0.42, k++) {
      const m = add(new THREE.PlaneGeometry(0.14, 0.3).rotateX(-Math.PI / 2), fp, 27 + (k % 2 ? 0.13 : -0.13), 0.006, z, Math.PI);
      m.material = fp;
    }
  }
  // the locked door
  add(new THREE.BoxGeometry(0.05, 2.1, 1.1), pm({ map: doorTex(), roughness: 0.5, emissive: '#ffb860', emissiveMap: doorTex(), emissiveIntensity: 0.35 }), 27.84, 1.05, 68.2);
  add(new THREE.BoxGeometry(0.07, 2.2, 0.07), M.frame, 27.83, 1.1, 67.62);
  add(new THREE.BoxGeometry(0.07, 2.2, 0.07), M.frame, 27.83, 1.1, 68.78);
  add(new THREE.BoxGeometry(0.07, 0.07, 1.23), M.frame, 27.83, 2.17, 68.2);
  picture(muralKids(), 12, 2.2, 'KIDS', 'S', 36, 2.1);
  picture(muralKids(), 10, 2.2, 'KIDS', 'E', 71.8, 2.1);

  // map boards
  const plan = planTex();
  function board(id, side, along, hereX, hereZ) {
    const src = plan.userData.canvas, t = cvs(src.width, src.height, (x) => {
      x.drawImage(src, 0, 0);
      x.fillStyle = '#c0392b';
      x.beginPath();
      x.arc(hereX * 12, hereZ * 12 + 80, 9, 0, 6.3);
      x.fill();
      text(x, '您在此处', hereX * 12 + 14, hereZ * 12 + 72, 22, '#c0392b', 'left');
    });
    const [x, z, ry] = anchor(id, side, along, 0.03);
    const px = side === 'W' || side === 'E' ? x : along, pz = side === 'W' || side === 'E' ? along : z;
    add(new THREE.BoxGeometry(1.12, 1.66, 0.04), M.frame, px, 1.45, pz, ry);
    add(new THREE.PlaneGeometry(1.02, 1.56), pm({ map: t, roughness: 0.6 }), px + Math.sin(ry) * 0.022, 1.45, pz + Math.cos(ry) * 0.022, ry);
    return { x: px, z: pz, canvas: t.userData.canvas };
  }
  const maps = [board('WAVE', 'N', 12.6, 12.6, 31), board('LOBBY', 'W', 21.4, 31, 21.4), board('SNACK', 'N', 33.5, 33.5, 32)];

  // the family's four loungers
  const towel = add(new THREE.BoxGeometry(0.56, 0.025, 1.1), pm({ map: T.towelTex(), roughness: 0.95 }), FAM[1], 0.335, 34.95);
  const ring = add(new THREE.TorusGeometry(0.3, 0.085, 12, 28), pm({ color: '#e8c532', roughness: 0.35 }), FAM[1] - 0.62, 0.3, 35.5);
  ring.rotation.set(1.15, 0, 0.2);
  const arm = new THREE.Group();
  for (const dx of [-0.07, 0.09]) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.035, 8, 16), pm({ color: '#e8742a', roughness: 0.4 }));
    a.rotation.x = Math.PI / 2;
    a.position.set(dx, 0.035, dx * 0.6);
    arm.add(a);
  }
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.06), pm({ map: T.nameTag('赵子拓'), roughness: 0.8 }));
  tag.rotation.x = -Math.PI / 2;
  tag.position.set(0.02, 0.008, 0.2);
  arm.add(tag);
  arm.position.set(FAM[3], 0.325, 34.9);
  scene.add(arm);
  const slipM = pm({ color: '#3f78a8', roughness: 0.6 });
  for (const dx of [-0.07, 0.07]) add(new THREE.BoxGeometry(0.09, 0.03, 0.2), slipM, FAM[1] + dx + 0.5, 0.015, 35.7, 0.1);

  // what is behind the glass
  const pair = (x, z, len, col) => {
    const m = pm({ color: col, roughness: 0.6 });
    for (const dx of [-0.07, 0.07]) add(new THREE.BoxGeometry(len * 0.42, 0.03, len), m, x + dx * (len / 0.2), 0.015, z, 0.08);
  };
  pair(32.7, 66.3, 0.27, '#2f3b46');
  pair(33.6, 66.35, 0.24, '#b0506a');
  pair(34.3, 66.25, 0.12, '#e8a020');
  for (const [dx, dz, col] of [[-0.12, 0.02, '#d8e6ea'], [0.1, -0.08, '#d8e6ea'], [0.03, 0.14, '#e8a020']])
    add(new THREE.CylinderGeometry(0.035, 0.03, 0.1, 10), pm({ color: col, roughness: 0.3 }), 37.2 + dx, 0.76, 66.7 + dz);
  const kring = add(new THREE.TorusGeometry(0.17, 0.065, 10, 22), pm({ color: '#e8742a', roughness: 0.4 }), 35.4, 0.36, 67.5);
  kring.rotation.set(1.45, 0, -0.3);

  // logbook, microphone, receipt
  add(new THREE.BoxGeometry(0.34, 0.025, 0.46), pm({ color: '#ece6d0', roughness: 0.9 }), 38.2, 1.275, 18.2, 0.12);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), M.dark, 40.6, 1.41, 18.2);
  add(new THREE.BoxGeometry(0.14, 0.03, 0.1), M.dark, 40.6, 1.275, 18.2);
  add(new THREE.SphereGeometry(0.03, 10, 8), M.dark, 40.6, 1.57, 18.2);
  add(new THREE.BoxGeometry(0.08, 0.004, 0.2), pm({ color: '#f4f2ea', roughness: 0.9 }), 41.5, 0.993, 38.3, 0.3);

  // locker A-217, left open
  {
    const z = 18.6, x = 12.6, y = 0.3;
    add(new THREE.PlaneGeometry(0.36, 0.9), pm({ color: '#0e1214', roughness: 1 }), x, y + 1.42, z + 0.006);
    add(new THREE.BoxGeometry(0.02, 0.9, 0.36), M.locker, x - 0.19, y + 1.42, z + 0.18);
    add(new THREE.BoxGeometry(0.26, 0.07, 0.02), pm({ color: '#c9d6e8', roughness: 0.9 }), x, y + 1.03, z + 0.02);
    for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.015, 0.03, 0.03), M.steel, x - 0.12 + k * 0.08, y + 1.75, z + 0.02);
    add(new THREE.PlaneGeometry(0.14, 0.05), signMat(T.sign('A-217', { w: 448, size: 100, bg: '#e9e6da', fg: '#2c3a40', border: false })), x, y + 1.92, z + 0.008);
  }

  // one shower that nobody turned off
  const sprayTex = cvs(64, 256, (x) => {
    x.clearRect(0, 0, 64, 256);
    const Rr = rng(5);
    for (let i = 0; i < 90; i++) {
      x.fillStyle = `rgba(235,248,250,${0.15 + Rr() * 0.4})`;
      x.fillRect(Rr() * 64, Rr() * 256, 1.2, 14 + Rr() * 30);
    }
  }, true);
  const spray = add(new THREE.CylinderGeometry(0.05, 0.26, 1.9, 12, 1, true), patch(new THREE.MeshBasicMaterial({ map: sprayTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }), G), 4.15 + 1.45 * 3 + 0.725, 0.98, 3.52);
  const SHOWER = { x: spray.position.x, z: 3.6 };
  // palm-tree sprinklers on the decks of the wave hall: nobody turned these off either, and the hall is full of their mist
  {
    const trunk = pm({ color: '#6b5a44', roughness: 0.9 }), leaf = pm({ color: '#2f5a3a', roughness: 0.7, side: THREE.DoubleSide });
    const mistM = patch(new THREE.MeshBasicMaterial({ map: sprayTex, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), G);
    for (const [x, z] of [[5.25, 44.5], [24.75, 47.3], [21.8, 31.6]]) {
      add(new THREE.CylinderGeometry(0.1, 0.16, 3.4, 10), trunk, x, 1.7, z);
      // fronds that droop: a long flat blade, bent down twice
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + (k % 2) * 0.2;
        for (const [len, tilt, off] of [[0.9, 1.25, 0], [0.9, 2.1, 0.86]]) {
          const l = add(new THREE.ConeGeometry(0.2, len, 4, 1).translate(0, len / 2, 0).scale(1, 1, 0.18), leaf, 0, 0, 0);
          const r = Math.sin(1.25) * off;
          l.position.set(x + Math.sin(a) * r, 3.35 + Math.cos(1.25) * off - (k % 3) * 0.05, z + Math.cos(a) * r);
          l.rotation.set(tilt, a, 0, 'YXZ');
        }
      }
      add(new THREE.CylinderGeometry(0.35, 1.35, 3.2, 16, 1, true), mistM, x, 1.65, z).renderOrder = 4;
      addSolid(x - 0.18, x + 0.18, 0, 3.4, z - 0.18, z + 0.18);
    }
  }

  // the gate under the water, and the fogged glass
  const grate = new THREE.Group();
  for (let k = 0; k < 8; k++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.95, 6), M.steelD);
    b.position.set(PASSAGE.x0 + 0.2 + k * 0.2, -0.775, 58.02);
    grate.add(b);
  }
  scene.add(grate);
  const grateSolid = addSolid(PASSAGE.x0, PASSAGE.x1, -1.3, -0.2, 57.95, 58.1);
  const fog = T.fogGlass();
  const fogMat = patch(new THREE.MeshBasicMaterial({ map: fog.texture, transparent: true, color: new THREE.Color(1.25, 1.1, 0.85) }), G, true);
  const fogMesh = add(new THREE.PlaneGeometry(GLASS.x1 - GLASS.x0, GLASS.h), fogMat, (GLASS.x0 + GLASS.x1) / 2, GLASS.h / 2, GLASS.z - 0.07, Math.PI);
  fogMesh.renderOrder = 5;

  // wet prints
  const fpMat = patch(new THREE.MeshBasicMaterial({ map: T.footprintTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), G);
  const flatG = (w, h) => new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2);
  function prints(list, geo, mat) {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    list.forEach(([x, z, a, s = 1, y = 0], i) => im.setMatrixAt(i, m.compose(new THREE.Vector3(x, y + 0.008, z), q.setFromAxisAngle(up, a), new THREE.Vector3(s, 1, s))));
    im.frustumCulled = false;
    scene.add(im);
    return im;
  }
  const fl = [];
  // three people walked from the loungers toward the east side of the pool; one of them very small. The prints dry out on the way.
  [[FAM[0], 1.25, 0.34], [FAM[2], 1.1, 0.3], [FAM[3], 0.55, 0.17]].forEach(([sx, size, stride], who) => {
    let x = sx, z = 36.2, k = 0;
    for (const [tx, tz] of [[24.4 + who * 0.3, 38.2 + who * 0.4], [24.8 + who * 0.3, 47]]) {
      while (Math.hypot(tx - x, tz - z) > 0.5 && k < 200) {
        const a = Math.atan2(tx - x, -(tz - z)) + (R() - 0.5) * 0.25;
        x += Math.sin(a) * stride;
        z -= Math.cos(a) * stride;
        const side = k++ % 2 ? 0.08 : -0.08;
        fl.push([x + Math.cos(a) * side * size, z + Math.sin(a) * side * size, -a, size]);
      }
    }
  });
  const footprints = prints(fl, flatG(0.1, 0.22), fpMat);
  const hpMat = patch(new THREE.MeshBasicMaterial({ map: T.handprintTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), G);
  const hl = [];
  const trail = (x, z, a, n, y = 0) => {
    for (let i = 0; i < n; i++) {
      const d = 0.45 + i * 0.62, s = i % 2 ? 0.2 : -0.2;
      hl.push([x + Math.sin(a) * d + Math.cos(a) * s, z - Math.cos(a) * d + Math.sin(a) * s, -a + (R() - 0.5) * 0.4, 1 - i * 0.06, y]);
    }
  };
  trail(15, 40.4, 0, 7); // out of the wave pool, toward the loungers
  trail(31.7, 38.5, 0, 6); // over the bridge, toward the door to the lobby
  trail(39.8, 24.8, 0, 5, 0.2); // across the lobby toward the desk
  trail(26.4, 8.7, -Math.PI / 2, 5); // out of the pool that is closed
  const handprints = prints(hl, flatG(0.3, 0.6), hpMat);
  handprints.visible = false;

  // ---------------- things that open, close, or were not there before ----------------
  const BLU = { bg: '#2d6f9c' };
  add(new THREE.BoxGeometry(2.0, 0.5, 0.05), M.blue, 31.7, 2.5, 38.5);
  add(new THREE.PlaneGeometry(1.9, 0.44), signMat(T.sign('漂 流 河', { size: 100, w: 690, h: 160, ...BLU })), 31.7, 2.5, 38.47, Math.PI);
  sign('漂 流 河   LAZY RIVER', 4.2, 0.5, 'SNACK', 'S', 40.6, 2.15, { size: 84, ...BLU });
  sign('漂流河  ↓', 1.2, 0.32, 'SNACK', 'N', 37.6, 2.6, { size: 84, w: 600, ...BLU });
  sign('上船处  过桥', 1.3, 0.3, 'SNACK', 'W', 36.4, 1.9, { size: 76, w: 700, ...BLU });
  // the fall: a soft sheet with slow streaks in it, and a patch of foam where it lands
  const fallTex = cvs(256, 512, (x) => {
    const Rr = rng(8);
    x.fillStyle = 'rgba(196,236,240,0.3)';
    x.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 90; i++) {
      const px = Rr() * 256, w = 3 + Rr() * 14, y0 = Rr() * 512, len = 160 + Rr() * 300, a = 0.1 + Rr() * 0.28;
      for (const oy of [0, -512]) {
        const g = x.createLinearGradient(0, y0 + oy, 0, y0 + oy + len);
        g.addColorStop(0, 'rgba(240,252,253,0)');
        g.addColorStop(0.5, `rgba(240,252,253,${a})`);
        g.addColorStop(1, 'rgba(240,252,253,0)');
        x.fillStyle = g;
        x.fillRect(px, y0 + oy, w, len);
      }
    }
  }, true);
  add(new THREE.PlaneGeometry(1.5, 1.5), patch(new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }), G), 28.98, 0.55, 40.45, Math.PI / 2);
  const foamTex = cvs(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(245,253,253,0.75)');
    g.addColorStop(0.5, 'rgba(235,250,250,0.3)');
    g.addColorStop(1, 'rgba(235,250,250,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  });
  const foam = add(new THREE.PlaneGeometry(1.2, 2.0).rotateX(-Math.PI / 2), patch(new THREE.MeshBasicMaterial({ map: foamTex, transparent: true, depthWrite: false }), G), 29.35, -0.1, 40.45);
  foam.renderOrder = 6;
  // counter flap, the door behind the desk, the door that slams
  const mkDoor = (m, solid, shut) => {
    const d = { m, solid, set(on) { m.visible = on; solid.off = !on; } };
    d.set(shut);
    return d;
  };
  const flap = mkDoor(add(new THREE.BoxGeometry(0.1, 1.02, 2.75), M.wood, 36.25, 0.71, 16.52), addSolid(36.2, 36.3, 0.2, 1.22, 15.15, 17.9), true);
  const cctvDoor = mkDoor(add(new THREE.BoxGeometry(0.05, 1.8, 0.94), M.steelD, 44, 1.1, 16.4), addSolid(43.9, 44.1, 0.2, 2.2, 15.9, 16.9), true);
  add(new THREE.PlaneGeometry(0.5, 0.16), signMat(T.sign('员工专用', { size: 84, w: 500, h: 160, ...GRY })), 43.82, 2.3, 16.4, -Math.PI / 2);
  // after closing the river is shut: a gate across the tunnel mouth, chains across the steps and the ladder
  const shutBits = [
    mkDoor(add(new THREE.BoxGeometry(0.08, 1.6, 2.2), M.steelD, 43.95, 0.45, 47.2), addSolid(43.85, 44.1, -1.3, 1.3, 46.1, 48.3), false),
    mkDoor(add(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 6).rotateZ(Math.PI / 2), M.red, 29.5, 0.7, 42.5), addSolid(28.4, 30.6, 0, 1.0, 42.45, 42.55), false),
    mkDoor(add(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6).rotateZ(Math.PI / 2), M.red, 41, 0.7, 45.4), addSolid(40.6, 41.4, 0, 1.0, 45.37, 45.43), false),
    mkDoor(add(new THREE.PlaneGeometry(1.5, 0.34), signMat(T.sign('漂流河已关闭', { size: 80, w: 700, h: 160, bg: '#f1eee2', fg: '#8c2a22' })), 29.5, 1.0, 42.52, Math.PI), addSolid(0, 0, 0, 0, 0, 0), false),
  ];
  const riverShut = { set: (on) => shutBits.forEach((b) => b.set(on)) };
  const t3Door = mkDoor(add(new THREE.BoxGeometry(1.14, 1.8, 0.05), M.steelD, 31.1, 1.1, 55.6), addSolid(30.5, 31.7, 0, 2.2, 55.5, 55.7), false);
  // things adrift in the tunnel once the drain is open (they do not block: the walls and bends are trouble enough)
  const floatM = pm({ color: '#e8c532', roughness: 0.95 });
  const floatBits = [
    mkDoor(add(new THREE.BoxGeometry(0.9, 0.14, 0.7), floatM, 47.45, 0.1, 51.3), addSolid(0, 0, 0, 0, 0, 0), false),
    mkDoor(add(new THREE.BoxGeometry(0.7, 0.14, 0.8), floatM, 43.3, 0.1, 57.6), addSolid(0, 0, 0, 0, 0, 0), false),
    mkDoor(add(new THREE.BoxGeometry(0.7, 0.14, 0.75), floatM, 40.3, 0.1, 55.98), addSolid(0, 0, 0, 0, 0, 0), false),
  ];
  const floats = { set: (on) => floatBits.forEach((b) => b.set(on)) };
  const svcDoor = mkDoor(add(new THREE.BoxGeometry(0.05, 1.8, 1.14), M.steelD, 30, 1.1, 50.6), addSolid(29.9, 30.1, 0, 2.2, 50, 51.2), false);
  add(new THREE.BoxGeometry(1.1, 2.1, 0.05), M.lam, 50.6, 1.05, 20.17);
  // monitors
  const cams = CAMS();
  const monitors = cams.slice(0, 6).map((t, i) => add(new THREE.PlaneGeometry(0.62, 0.465), patch(new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.7, 1.8, 1.7) }), G, true), 45.15 + (i % 3) * 0.65, 2.1 - Math.floor(i / 3) * 0.52, 15.305));
  // the handwheel: on the desk in there, later on the valve
  const mkWheel = (x, y, z, ry, rx) => {
    const g = new THREE.Group(), m = pm({ color: '#c8473d', roughness: 0.4 });
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 24), m));
    for (const a of [0, Math.PI / 2]) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 6), m);
      sp.rotation.z = a;
      g.add(sp);
    }
    g.position.set(x, y, z);
    g.rotation.set(rx, ry, 0, 'YXZ');
    scene.add(g);
    return g;
  };
  const wheelItem = mkWheel(47.5, 0.985, 15.55, 0.4, Math.PI / 2), valveWheel = mkWheel(46.02, 1.2, 50.6, Math.PI / 2, 0);
  valveWheel.visible = false;
  sign('排 水 闸', 0.7, 0.24, 'PUMP', 'E', 50.6, 1.95, { size: 90, w: 470, bg: '#e8c532', fg: '#222' });
  sign(['手轮存放', '监控室'], 0.5, 0.25, 'PUMP', 'E', 51.5, 1.3, { w: 400, h: 200, size: 44, ...RED });
  // foam mats in the long corridor, and what the notices on its wall turn into
  MATS.forEach(([x0, z0, k]) => add(new THREE.BoxGeometry(1.2, 0.14, 1.7), pm({ color: k % 2 ? '#e8c532' : '#3f78a8', roughness: 0.95 }), x0 + 0.6, 0.17, z0 + 0.85));
  [[24.3, '请看管好您的孩子'], [28.6, '请看管好您的孩子'], [32.9, '请看管好您的'], [37.0, '没有人看管'], [40.4, '没有人']].forEach(([z, t]) => sign(t, 1.3, 0.3, 'LONG', 'W', z, 1.6, { size: 70, w: 700, ...RED }));
  // drips
  const dripMat = patch(new THREE.MeshBasicMaterial({ color: '#dff3f6', transparent: true, opacity: 0.75 }), G);
  const drips = [[8.4, 2.8, 6.4, 0], [17.6, 2.4, 8.2, -0.3], [24.8, 2.5, 20.4, 0], [39.8, 2.5, 28.2, 0], [34.4, 3.0, 21.0, 0.2], [36.6, 2.9, 36.4, 0], [38.4, 3.0, 51.2, 0.2], [27, 2.5, 62.4, 0], [50.6, 2.5, 30.2, -0.9], [12, 2.7, 20.3, 0.2], [45.6, 2.5, 17.4, 0.2], [44.5, 1.7, 56.8, -0.2]]
    .map(([x, y1, z, y0], i) => ({ m: add(new THREE.SphereGeometry(0.018, 6, 4).scale(1, 4, 1), dripMat, x, y1, z), y1, y0, per: 1.7 + ((i * 0.618) % 1) * 2.4, ph: i * 1.3 }));
  // what is floating about after closing
  const flotsam = new THREE.Group();
  [[12.5, 44.5, '#e8c532'], [19, 49, '#3f78a8'], [36.4, 41, '#e8742a'], [9, 36.5, '#e8c532'], [40.5, 44.3, '#c8473d']].forEach(([x, z, c]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.085, 8, 20), pm({ color: c, roughness: 0.4 }));
    m.rotation.x = Math.PI / 2;
    m.position.set(x, 0, z);
    flotsam.add(m);
  });
  [[14, 36.2], [22, 40], [33, 33.5], [27, 34], [8, 31.5], [39.8, 29]].forEach(([x, z], i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.2), slipM);
    m.position.set(x, 0, z);
    m.rotation.y = i * 1.7;
    flotsam.add(m);
  });
  flotsam.visible = false;
  scene.add(flotsam);
  // the map, once it starts lying
  const mapLie = cvs(plan.userData.canvas.width, plan.userData.canvas.height, (x, w, h) => {
    x.drawImage(plan.userData.canvas, 0, 0);
    scrawl(x, 36 * 12, 71.7 * 12 + 80, 8.6 * 12, 6.8 * 12, 800, 3, 'rgba(18,20,24,0.85)');
    x.fillStyle = '#c0392b';
    x.beginPath();
    x.arc(15 * 12, 57 * 12 + 80, 9, 0, 6.3);
    x.fill();
    text(x, '您在此处', 15 * 12 + 14, 57 * 12 + 72, 22, '#c0392b', 'left');
  }).userData.canvas;

  // ---------------- my things: where I lost them, and they are still there ----------------
  const glintTex = cvs(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 1, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,240,1)');
    g.addColorStop(0.2, 'rgba(255,250,220,0.5)');
    g.addColorStop(1, 'rgba(255,250,220,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  });
  const glint = (x, y, z, s = 0.35) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    sp.position.set(x, y, z);
    sp.scale.setScalar(s);
    scene.add(sp);
    return sp;
  };
  const item = (x, y, z, build, gl) => {
    const g = new THREE.Group();
    build(g);
    g.position.set(x, y, z);
    scene.add(g);
    const sp = gl ? glint(x, y + 0.06, z, gl) : null;
    return { g, sp, set(on) { g.visible = on; if (sp) sp.visible = on; } };
  };
  const mesh = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    return m;
  };
  // goggles, on the floor of the deep end
  const goggles = item(12.4, -2.2, 60.1, (g) => {
    const lens = pm({ color: '#2b6f9c', roughness: 0.1, metalness: 0.3 }), strap = pm({ color: '#1d2a33', roughness: 0.8 });
    for (const dx of [-0.05, 0.05]) g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 14), lens, dx, 0.015, 0));
    g.add(mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 20), strap, 0, 0.01, 0.03, Math.PI / 2));
    g.rotation.y = 0.6;
  }, 0.45);
  // a torch, still on, at the top of the slide: its beam is the only light up there
  const torch = item(32.3, 6.05, 3.0, (g) => {
    const body = mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.2, 10), pm({ color: '#e8c532', roughness: 0.4 }), 0, 0.035, 0, 0, 0, Math.PI / 2);
    body.rotation.set(0, 0.75, Math.PI / 2);
    g.add(body);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9, 20, 1, true).translate(0, -4.5, 0), new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    beam.position.set(-0.08, 0.035, 0.08);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(-6.3, -2.5, 6.0).normalize());
    g.add(beam);
  }, 0.5);
  // a whistle on its cord, hung on the cage of the lamp in the wet corridor
  const whistle = item(17.62, 1.25, 8.2, (g) => {
    const o = pm({ color: '#e8742a', roughness: 0.35 });
    g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 10), o, 0, 0, 0, 0, 0, Math.PI / 2));
    g.add(mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), o, 0.05, 0.012, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.7, 4), pm({ color: '#1d2a33', roughness: 0.8 }), 0, 0.36, 0));
  }, 0.3);
  // the key band for the locker next to mine, caught on a bracket in the river tunnel
  const band = item(49.12, 0.12, 51.6, (g) => {
    g.add(mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 16), pm({ color: '#3f78a8', roughness: 0.5 }), 0, 0, 0, 0, Math.PI / 2));
    g.add(mesh(new THREE.BoxGeometry(0.01, 0.03, 0.05), M.steel, 0, -0.05, 0));
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.025, 0.04), M.steelD, 0.08, 0.02, 0));
  }, 0.3);
  // what is in the locker next to mine
  const phone = item(13.02, 1.35, 18.66, (g) => {
    g.add(mesh(new THREE.BoxGeometry(0.075, 0.15, 0.01), M.dark, 0, 0, 0, -0.3));
    g.add(mesh(new THREE.PlaneGeometry(0.065, 0.13), patch(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.75, 0.95) }), G, true), 0, 0, 0.006, -0.3));
  });
  phone.set(false);
  // the other locker's door: shut until the band opens it
  const doorB = add(new THREE.BoxGeometry(0.36, 0.9, 0.02), M.locker, 13.0, 1.72, 18.62);
  add(new THREE.PlaneGeometry(0.14, 0.05), signMat(T.sign('A-218', { w: 448, size: 100, bg: '#e9e6da', fg: '#2c3a40', border: false })), 13.0, 1.92, 18.632);
  const lockerB = { set(open) { doorB.rotation.y = open ? -1.6 : 0; doorB.position.set(open ? 12.83 : 13.0, 1.72, open ? 18.8 : 18.62); phone.set(open); } };
  // the notice I put up myself, under theirs
  const lostNote = add(new THREE.PlaneGeometry(0.42, 0.56), pm({ map: cvs(256, 340, (x) => {
    x.fillStyle = '#efe9d6';
    x.fillRect(0, 0, 256, 340);
    x.strokeStyle = 'rgba(40,60,120,0.25)';
    for (let k = 0; k < 11; k++) (x.beginPath(), x.moveTo(10, 60 + k * 26), x.lineTo(246, 60 + k * 26), x.stroke());
    x.font = '34px "Kaiti SC","STKaiti","KaiTi",serif';
    x.fillStyle = '#2d3a78';
    x.textAlign = 'center';
    x.fillText(t('寻物启事'), 128, 46);
    x.font = '19px "Kaiti SC","STKaiti","KaiTi",serif';
    x.textAlign = 'left';
    [t('潜水镜'), t('手电筒'), t('口哨'), t('手牌')].forEach((l, i) => x.fillText(`${i + 1}. ${l} ……`, 22, 84 + i * 52));
  }), roughness: 0.9 }), 30.17, 1.45, 17.3, Math.PI / 2);
  add(new THREE.BoxGeometry(0.03, 0.9, 1.3), pm({ color: '#a8875a', roughness: 0.9 }), 30.16, 1.5, 17.6);
  lostNote.position.x = 30.19;

  return { mine: { goggles, torch, whistle, band, phone, lockerB }, maps, towel, ring, arm, grate, grateSolid, fog, fogMesh, handprints, footprints, sprayTex, SHOWER, fallTex, drips, flotsam, foam, riverShut, floats, t3Door, flap, cctvDoor, svcDoor, monitors, cams, wheelItem, valveWheel, mapLie };
}

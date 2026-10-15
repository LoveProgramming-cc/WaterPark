// Telling the player what to do: the goal line and its hints, the route marker to the next doorway, the glowing items.
import * as THREE from 'three';
import { HALL, WAVE, PASSAGE, GLASS, WATER0, Z, NZ, RING, DOORS, zoneId, inTunnel, roomAt, baseGround } from './world.js';
import { ui } from './ui.js';
import { sfx } from './sfx.js';
import { t, cfg, D, redrawAll } from './i18n.js';
import { scene, camera, world, player, S, P, byKey } from './core.js';

// the goal line, and what the child mutters if you have been stuck on it for over a minute
export const HINTS = {
  '看看躺椅上的东西（走近 按 E）': ['躺椅上有我的毛巾', '最右边那张 有弟弟的臂圈'],
  '去服务台问问': ['跟着墙上的牌子 服务台', '柜台上有个登记本'],
  '去儿童池': ['造浪池东墙 写着儿童区的门', '跟着地上的橙色脚印'],
  '从员工通道去隧道尽头': ['造浪池东墙中间 灰色的小牌子 员工通道', '穿过机房 西南角的门'],
  '去机房 打开排水闸': ['机房最东头 地上画着黄线', '阀门在黄线里'],
  '去监控室拿手轮（服务台柜台后面）': ['回服务台', '柜台的挡板开了 里面有扇门'],
  '把手轮装回机房的排水闸': ['机房在造浪池东墙 员工通道里面', '阀门在机房最东头'],
  '别掉进水里': ['按住 Shift 跑起来', '跑到垫子尽头再按空格'],
  '回漂流河 跳进去': () => (S.fin === 'pump' ? ['绕着水罐跑 别让它贴上来', '从员工通道跑'] : ['出员工通道 沿东墙往北', '过桥 下台阶 跳进河里', '按住 W 顺着水游']),
  '找到去机房的路': () =>
    S.maze === 1 ? ['往前走不到头', '回头 来的那扇门还在后面']
    : S.maze === 2 ? ['顺着箭头走 总是回到这里', '反过来走']
    : S.mazeK < 2 ? ['三条路里 有一条的灯是亮的', '走到那条路的尽头'] : ['亮的两条都走过了', '只剩黑的那条 走到头'],
};
export function goal(text) {
  ui.goal(text, true);
  S.goalText = text;
  S.goalT = S.goalT0 = S.t;
  S.wayUntil = S.t + 18;
}
// the hand-holding (marker, glowing items, the H key, no penalty before closing) is for easy mode only
export const EASY = () => cfg.diff === 'e';
// H: say it again, in the middle of the screen, with the hint and the marker
export function askHint() {
  if (!EASY() || !S.goalText || S.busy || S.ending || ui.paperOpen) return;
  ui.goal(S.goalText, true);
  S.wayUntil = S.t + 18;
  const h0 = HINTS[S.goalText], h = typeof h0 === 'function' ? h0() : h0;
  if (h) ui.say(h, 3);
  S.goalT = S.t;
}

// ---------------- where to go: the next doorway on the way to the goal ----------------
export const EDGES = [];
for (const d of DOORS) {
  if (d.y1 < 1.6 || d.y0 > 1 || d.at === GLASS.z) continue;
  const mid = (d.a + d.b) / 2, A = d.ax === 'x' ? roomAt(d.at - 0.3, mid) : roomAt(mid, d.at - 0.3), B = d.ax === 'x' ? roomAt(d.at + 0.3, mid) : roomAt(mid, d.at + 0.3);
  if (A && B && A !== B) EDGES.push({ a: A.id, b: B.id, x: d.ax === 'x' ? d.at : mid, z: d.ax === 'x' ? mid : d.at });
}
export function nextDoor(from, to) {
  const prev = { [from]: null }, queue = [from];
  while (queue.length) {
    const r = queue.shift();
    if (r === to) break;
    for (const e of EDGES) {
      const n = e.a === r ? e.b : e.b === r ? e.a : null;
      if (n && !(n in prev)) (prev[n] = { r, e }), queue.push(n);
    }
  }
  if (!prev[to]) return null;
  let step = prev[to];
  while (step.r !== from) step = prev[step.r];
  return step.e;
}
export const WAY = {
  '看看躺椅上的东西（走近 按 E）': () => (S.flags.towel ? P.arm : P.towel), '去服务台问问': () => P.log, '去儿童池': () => P.kidsDoor,
  '从员工通道去隧道尽头': () => [31.1, 0.7, 56.2], '去机房 打开排水闸': () => P.valve, '去监控室拿手轮（服务台柜台后面）': () => P.wheel,
  '把手轮装回机房的排水闸': () => P.valve, '回漂流河 跳进去': () => [29.5, 0.4, 42.2],
};
export const wayV = new THREE.Vector3();
export function updateWay() {
  const get = WAY[S.goalText];
  const show = EASY() && get && !S.busy && !S.ending && !S.vision && !S.long && !S.maze && S.finale !== 2 && !ui.paperOpen && player.mode !== 'script'
    && (S.t < S.wayUntil || S.t - S.goalT0 > 40);
  if (!show) return ui.way(false);
  const p = player.pos, tg = get(), here = roomAt(p.x, p.z)?.id, there = roomAt(tg[0], tg[2])?.id;
  let x = tg[0], y = tg[1] + 0.25, z = tg[2];
  if (here && there && here !== there) {
    const e = nextDoor(here, there);
    if (e) (x = e.x), (y = baseGround(p.x, p.z) + 1.25), (z = e.z);
  }
  wayV.set(x, y, z).project(camera);
  const W = window.innerWidth, H = window.innerHeight, behind = wayV.z > 1;
  let sx = wayV.x * (behind ? -1 : 1), sy = wayV.y * (behind ? -1 : 1);
  const off = behind || Math.abs(sx) > 0.9 || Math.abs(sy) > 0.84;
  if (off) {
    // off the screen: slide it to the edge in that direction
    const k = 1 / Math.max(Math.abs(sx) / 0.9, Math.abs(sy) / 0.84, behind ? 1e-3 : 1);
    sx *= k;
    sy *= k;
    if (behind && Math.abs(sx) < 0.9 && Math.abs(sy) < 0.84) sx = sx < 0 ? -0.9 : 0.9;
  }
  const glyph = !off ? '◆' : Math.abs(sx) >= 0.89 ? (sx < 0 ? '◀' : '▶') : sy > 0 ? '▲' : '▼';
  ui.way(true, (sx * 0.5 + 0.5) * W, (-sy * 0.5 + 0.5) * H, glyph, Math.round(Math.hypot(x - p.x, z - p.z)));
}
export function nag() {
  if (cfg.diff === 'h' || !S.goalText || S.busy || S.ending || S.vision || ui.paperOpen || S.t - S.goalT < (S.maze ? 45 : 65)) return;
  S.goalT = S.t + (S.maze ? 0 : 25);
  const h0 = HINTS[S.goalText], h = typeof h0 === 'function' ? h0() : h0;
  if (h) ui.say(h, 3);
}


// a small pulsing light on the things that matter, so nobody walks past them
export const markTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 1, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,250,225,1)');
  g.addColorStop(0.25, 'rgba(255,245,210,0.55)');
  g.addColorStop(1, 'rgba(255,245,210,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
export let marks = [];
export function initMarks() {
  marks = Object.entries({
    towel: () => !S.flags.towel, arm: () => !S.flags.arm, ring: () => !player.hasRing, log: () => !S.flags.log && S.phase < 3, kidsDoor: () => !S.flags.door && S.phase < 3,
    valve: () => S.phase === 3 && !world.drain, wheel: () => S.phase === 3 && !S.wheel, tapes: () => S.phase === 3 && !S.flags.tapes, gate: () => S.phase === 3 && S.flags.tapes && !S.finale,
  }).map(([k, cond]) => {
    const o = byKey[k], s = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, transparent: true, depthWrite: false, fog: false }));
    s.position.set(o.x, o.y + 0.14, o.z);
    s.visible = false;
    scene.add(s);
    return { s, o, cond };
  });
}
export function updateMarks(t) {
  for (const m of marks) {
    const d = Math.hypot(m.o.x - player.pos.x, m.o.z - player.pos.z);
    m.s.visible = EASY() && S.phase >= 1 && !S.busy && !S.ending && d < 11 && !m.o.off && m.cond();
    if (!m.s.visible) continue;
    m.s.scale.setScalar(0.17 + Math.sin(t * 3.2) * 0.035);
    m.s.material.opacity = 0.55 + Math.sin(t * 3.2) * 0.3;
  }
}

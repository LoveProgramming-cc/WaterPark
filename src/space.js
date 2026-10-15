// Space that does not add up: the warps, the control room, the corridor that grows, and the three-part maze behind the staff door.
import * as THREE from 'three';
import { HALL, WAVE, PASSAGE, GLASS, WATER0, Z, NZ, RING, DOORS, zoneId, inTunnel, roomAt, baseGround } from './world.js';
import { ui } from './ui.js';
import { sfx } from './sfx.js';
import { t, cfg, D, redrawAll } from './i18n.js';
import { zoneLevel, zoneTarget, zoneFl, flAmp, bakeZones, world, player, thing, S, after, I, at } from './core.js';
import { goal } from './guide.js';
import { startChase, armTurn } from './scares.js';

// space that does not add up: after closing, some ways through bring you back to where you were
export const WARPS = [
  { id: 'back', n: 3, test: (p, v, id) => id === 'BACK' && p.z > 65.2 && p.z < 66 && v.z > 0.3, dz: -4.5, line: ['门又远了', '我明明在往前走'] },
  { id: 'c2', n: 2, test: (p, v, id) => id === 'C2' && p.z > 21.8 && p.z < 22.4 && v.z > 0.3, dz: -2.6, line: ['这条走廊在绕圈'] },
  { id: 'c2', n: 2, test: (p, v, id) => id === 'C2' && p.z < 19.8 && p.z > 19.2 && v.z < -0.3, dz: 2.6, line: ['这条走廊在绕圈'] },
  { id: 'lock', n: 1, test: (p, v, id) => id === 'LOCK' && p.z < 12.5 && p.x > 5 && p.x < 6.3 && v.z < -0.3, dx: 1.35, dz: 14, line: ['我不是刚从这里出去吗'] },
];
export const warped = {};
export function updateWarps() {
  if (S.phase !== 3 || S.busy || S.long || S.maze || S.finale || player.mode === 'script') return;
  const p = player.pos, id = roomAt(p.x, p.z)?.id;
  for (const w of WARPS) {
    if ((warped[w.id] || 0) >= w.n || !w.test(p, player.vel, id)) continue;
    warped[w.id] = (warped[w.id] || 0) + 1;
    p.x += w.dx || 0;
    p.z += w.dz || 0;
    S.dark = 0.85;
    sfx.clunk();
    if (warped[w.id] === Math.min(2, w.n)) ui.say(w.line, 2.2);
    return;
  }
}


// ---------------- the control room, the long corridor ----------------
export function takeWheel(quiet) {
  S.wheel = true;
  S.streak = 0;
  world.obj.wheelItem.visible = false;
  for (const m of world.obj.monitors) m.material.map = world.obj.camAfter;
  S.p3 = Math.max(S.p3, 76);
  flAmp[Z.CCTV] = 2;
  goal('把手轮装回机房的排水闸');
  if (quiet) return;
  sfx.thud();
  sfx.hiss(0.8);
  S.dark = 0.6;
  ui.say(['拿到了', '屏幕上 那是我', '后面那个是'], 2);
  // you are looking down at the desk. When you turn round it is in the doorway; then the lights go, and it comes.
  const sprung = () => {
    if (S.busy || S.long || S.chase) return;
    thing.pin = new THREE.Vector3(44.3, 1.28, 16.4);
    thing.body.visible = true;
    sfx.sting();
    S.dark = 0.5;
    after(0.55, () => {
      thing.pin = null;
      thing.body.visible = false;
      startChase();
    });
  };
  armTurn(sprung, 7, sprung);
}


// ---------------- behind the staff door ----------------
// Nothing in here can hurt you. It is dark, it is narrow, and it does not add up:
//   1  a corridor with no far end        (the way on is the door behind you)
//   2  a square with only three corners  (the way on is against the arrow)
//   3  a crossing that is always the same crossing (follow the lit arm, twice; then the one arm that is dark)
export const ARM_ZONES = [Z.MW, Z.MN, Z.ME];
export function mazeLights() {
  const lit = S.mazeK === 0 ? [1, 0, 0] : S.mazeK === 1 ? [0, 1, 0] : [1, 1, 0];
  ARM_ZONES.forEach((z, i) => ((zoneLevel[z] = zoneTarget[z] = lit[i] ? 1.0 : 0.1), (zoneFl[z] = 1)));
  bakeZones();
}
export function mazeGo(stage) {
  S.maze = stage;
  S.mazeN = 0;
  S.goalT = S.t;
  S.dark = 0.95;
  sfx.clunk();
  player.vel.set(0, 0, 0);
  if (stage === 1) player.teleport(5.3, 0.2, 77.2), player.face(0, 0);
  else if (stage === 2) player.teleport(10.4, 0.2, 67.55), player.face(-Math.PI / 2, 0);
  else if (stage === 3) {
    S.mazeK = 0;
    mazeLights();
    player.teleport(22.5, 0.2, 77.2);
    player.face(0, 0);
  } else {
    S.flags.mazeDone = true;
    S.streak = 0;
    player.teleport(29.2, 0, 50.6);
    player.face(-Math.PI / 2, 0);
    thing.mode = 'hunt';
    thing.hide = 5;
    thing.react = -2;
    goal('把手轮装回机房的排水闸');
    ui.say('是机房', 1.6);
  }
  player.grounded = true;
}
export function updateMaze() {
  const p = player.pos, v = player.vel;
  if (!S.maze) {
    if (S.phase === 3 && S.wheel && !S.flags.mazeDone && !S.busy && !world.drain && roomAt(p.x, p.z)?.id === 'SVC' && p.x > 27.2 && v.x > 0.3) {
      mazeGo(1);
      thing.mode = 'off';
      thing.strength = 0;
      thing.body.visible = false;
      S.nextGlimpse = S.t + 35;
      goal('找到去机房的路');
      ui.say(['这不是员工通道', '门呢'], 2);
      after(40, () => S.maze && ui.doc('这里什么都没有。出来。', 3));
    }
    return;
  }
  for (const z of ARM_ZONES) flAmp[z] = 0;
  if (S.maze === 1) {
    // every four metres is the same four metres
    if (p.z < 69.2 && v.z < -0.3) {
      p.z += 4;
      if (++S.mazeN === 3) ui.say(['还是这盏灯', '这条路没有头'], 2.2);
    }
  } else if (S.maze === 2) {
    // walking with the arrow, the far half of this side is the far half of the next: one corner never happens
    const dx = p.x - RING.x, dz = p.z - RING.z;
    if (dz < -2.8 && dx > 1.0 && dx < 1.9 && v.x > 0.3) {
      p.x = RING.x - dz;
      p.z = RING.z + dx;
      v.set(-v.z, 0, v.x);
      player.yaw -= Math.PI / 2;
      player.tyaw -= Math.PI / 2;
      if (++S.mazeN === 2) ui.say(['拐了三个弯', '又回到这扇门'], 2.2);
    }
  } else if (S.maze === 3) {
    // you have to go a good way down an arm before it counts: far enough to see the door at the end
    const arm = p.x < 18.8 ? 0 : p.z < 66.8 ? 1 : p.x > 26.0 ? 2 : -1;
    if (arm < 0) return;
    if (arm === S.mazeK) {
      if (++S.mazeK === 3) return mazeGo(0);
    } else {
      S.mazeK = 0;
      ui.say(S.mazeN++ ? '又是这个路口' : ['走错了', '又是这个路口'], 1.8);
    }
    mazeLights();
    S.dark = 0.95;
    sfx.clunk();
    S.goalT = S.t;
    player.teleport(22.5, 0.2, 76.4);
    player.face(0, 0);
    player.grounded = true;
  }
}
I({ x: 5.3, y: 1.2, z: 79.1, r: 1.5, label: '门', enabled: () => S.maze === 1, on: () => mazeGo(2) });
I({ x: 16.0, y: 1.2, z: 69.4, r: 1.5, label: '门', enabled: () => S.maze === 2, on: () => mazeGo(3) });
for (const [x, z] of [[10.4, 67.0], [13.6, 75.0], [8.0, 72.6], [22.5, 78.4]])
  I({ x, y: 1.2, z, r: 1.3, label: '门', enabled: () => S.maze > 1, on() {
    sfx.knock();
    ui.say('打不开', 1.2);
  } });

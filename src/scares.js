// Being caught, and being frightened without being caught: the capture, glimpses, the strobe and its crowd, the lobby chase, turning round.
import * as THREE from 'three';
import { HALL, WAVE, PASSAGE, GLASS, WATER0, Z, NZ, RING, DOORS, LONG_ZONES, zoneId, inTunnel, roomAt, baseGround } from './world.js';
import { ui } from './ui.js';
import { sfx } from './sfx.js';
import { t, cfg, D, redrawAll } from './i18n.js';
import { scene, camera, zoneLevel, zoneTarget, zoneFl, flAmp, flT, DIM, bakeZones, world, water, player, thing, S, after, once, clamp, at, fwd } from './core.js';
import { goal, EASY } from './guide.js';
import { pumpWalker } from './endings.js';

export const RESPAWN = world.respawn;
// it gets you: what it shows you is worse each time, and then you are straight back in it
export function caught() {
  if (S.busy || S.phase < 1 || S.phase > 3 || S.ending) return;
  S.busy = true;
  S.pull = 0.001;
  sfx.thud();
  player.mode = 'script';
  player.freeze = false;
  S.vision = null;
  S.catches++;
  // before closing time it can frighten you but it cannot end the session: on easy only catches after the horn count
  const n = S.phase >= 3 || !EASY() ? S.streak++ : 0, last = n >= D().limit - 1, T = last ? 4.7 : 3.1;
  // its face, in yours; then nothing; then the drawing
  camera.getWorldDirection(fwd);
  thing.pin = new THREE.Vector3(camera.position.x + fwd.x * 0.5, camera.position.y - 0.35, camera.position.z + fwd.z * 0.5);
  thing.body.visible = true;
  sfx.set('machine', 0, 0.2);
  after(0.5, () => {
    ui.clear();
    ui.fade(1, 0.01);
    ui.scare(last ? 3 : S.catches - 1, T);
    thing.pin = null;
    thing.body.visible = false;
  });
  // a held breath; the face and the noise together; the drawing and the laughing from behind the door; then only a heartbeat
  after(0.5 + 0.14, () => (sfx.shriek(), sfx.sting()));
  after(0.5 + 0.66, () => (n >= 1 ? sfx.laughter() : sfx.garble(0.5, 0.05)));
  for (const k of [1.35, 2.1, 2.8, 3.6, 4.3]) if (k < T - 0.3) after(0.5 + k, () => sfx.heartbeat());
  after(0.5 + T - 0.2, () => (sfx.thud(), sfx.hiss(0.3, 0.09)));
  // five times in a row and it keeps you: the session is over
  if (last) {
    S.ending = 'kept';
    after(5.2, () => {
      ui.scareOff();
      ui.end('水上乐园', '这一次，你没有上来。\n\n“今天先到这里。我们下次再试。”');
      for (const k of ['hvac', 'machine', 'lap', 'gurgle', 'wash']) sfx.set(k, 0, 2);
      if (document.pointerLockElement) document.exitPointerLock();
    });
    return;
  }
  after(0.5 + T + 0.05, () => {
    let best = S.long ? [50.6, 0, S.longCk || 21.4] : S.chase ? [46.4, 0.2, 17.2] : S.finale ? (S.fin === 'pump' ? [44.4, 0.2, 50.4] : [33, 0, 45.6]) : S.gate ? [36, 0.2, 22.6] : null;
    if (!best) {
      const hi = S.phase === 3;
      let bd = 1e9;
      for (const r of RESPAWN) {
        if (hi && r[1] < 0.15) continue;
        const d = Math.hypot(r[0] - player.pos.x, r[2] - player.pos.z);
        if (d < bd) (bd = d), (best = r);
      }
    }
    player.teleport(best[0], best[1], best[2]);
    player.mode = 'walk';
    player.grounded = true;
    player.forcedUnder = false;
    player.breath = 1;
    player.roll = 0;
    if (S.long) player.face(Math.PI, 0);
    S.pull = 0;
    S.gate = 0;
    thing.hide = 6;
    thing.react = -1.5;
    thing.speed = 0;
    thing.strength = 0;
    thing.mode = S.phase === 3 ? 'hunt' : 'lurk';
    const s = thing.deepNear(best[0] + 12, best[2] + 10);
    if (s && !S.long) thing.place(s[0], s[1]);
    S.wEvent = false;
    if (S.finale) {
      S.finale = 1;
      thing.mode = 'off';
      after(2.6, pumpWalker);
    } else if (S.chase) {
      thing.mode = 'off';
      after(2.4, lobbyWalker);
    }
    // every time, the place is a little further gone
    for (let i = 0; i < NZ; i++) if (i !== Z.KIDS && i !== Z.VALVE) flAmp[i] = Math.min(2, flAmp[i] + 0.2);
    if (n >= 0) world.obj.handprints.visible = true;
    if (n >= 1) S.nextGlimpse = S.t + 5;
    ui.scareOff();
    ui.fade(0, 0.9);
    sfx.set('machine', S.phase === 3 ? 0.55 : 0.22, 2);
    S.busy = false;
  });
}
thing.onCatch = caught;

// for less than a second it is standing somewhere it should not be
export function glimpse(dist = 7, dur = 0.7) {
  if (S.busy || S.finale || S.ending || S.chase || S.vision || thing.mode === 'walk' || thing.body.visible || player.mode === 'script') return false;
  camera.getWorldDirection(fwd);
  const x = player.pos.x + fwd.x * dist, z = player.pos.z + fwd.z * dist;
  for (let k = 0.3; k <= 1; k += 0.1) if (!roomAt(player.pos.x + fwd.x * dist * k, player.pos.z + fwd.z * dist * k)) return false;
  thing.pin = new THREE.Vector3(x, Math.max(baseGround(x, z), world.level) + 1.05, z);
  thing.body.visible = true;
  sfx.thud();
  S.dark = 0.5;
  after(dur, () => {
    thing.pin = null;
    if (thing.mode !== 'walk') thing.body.visible = false;
  });
  return true;
}


// ---------------- strobe, and the crowd that is only there in the light ----------------
// Two flashes a second, never more (well under what is a risk for photosensitive players); "reduce flicker" replaces it
// with a steady half-light. In the flashes the room is full of grown-ups with their backs to you. It moves in the dark between.
export const crowdTex = [0, 1, 2].map((v) => {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const x = c.getContext('2d'), w = 30 + v * 7;
  x.fillStyle = `rgb(${14 + v * 5},${16 + v * 5},${19 + v * 5})`;
  x.beginPath();
  x.ellipse(64, 34, 17, 22, 0, 0, 7); // head, a long way up
  x.fill();
  x.beginPath();
  x.moveTo(64 - w - 8, 70);
  x.quadraticCurveTo(64, 52, 64 + w + 8, 70);
  x.lineTo(64 + w + 12, 250); // arm
  x.lineTo(64 + w + 2, 252);
  x.lineTo(64 + w - 2, 110);
  x.lineTo(64 + w - 6, 280);
  x.lineTo(64 + w - 10, 510); // leg
  x.lineTo(64 + 6, 510);
  x.lineTo(64 + 2, 300);
  x.lineTo(64 - 2, 300);
  x.lineTo(64 - 6, 510);
  x.lineTo(64 - w + 10, 510);
  x.lineTo(64 - w + 6, 280);
  x.lineTo(64 - w + 2, 110);
  x.lineTo(64 - w - 2, 252);
  x.lineTo(64 - w - 12, 250);
  x.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
});
export const crowd = Array.from({ length: 30 }, (_, i) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: crowdTex[i % 3], transparent: true, depthWrite: false, fog: false }));
  sp.visible = false;
  scene.add(sp);
  return sp;
});
export function shuffleCrowd(rect, f) {
  crowd.forEach((sp, i) => {
    let x, z, k = 0;
    do {
      x = rect[0] + Math.random() * (rect[1] - rect[0]);
      z = rect[2] + Math.random() * (rect[3] - rect[2]);
    } while (k++ < 8 && Math.hypot(x - player.pos.x, z - player.pos.z) < 1.5);
    const h = 2.1 + (i % 5) * 0.14;
    sp.scale.set(h * 0.27, h, 1);
    sp.position.set(x, f + h / 2, z);
  });
}
export function startStrobe(zones, rect, floor = 0.2) {
  S.strobe = { zones, rect, floor, lit: null, base: thing.walkSpeed, mult: 1.7, wait: 0, next: 0 };
  S.lockNext = S.t + 0.6;
}
export function stopStrobe(levels) {
  if (!S.strobe) return;
  S.strobe.zones.forEach((z, i) => ((zoneLevel[z] = zoneTarget[z] = levels[i]), (flT[z] = 0), (zoneFl[z] = 1)));
  thing.walkSpeed = S.strobe.base;
  thing.hold = false;
  S.lockT = 0;
  for (const sp of crowd) sp.visible = false;
  S.strobe = null;
  bakeZones();
}
// Every so often, on a flash, your head is turned for you and held on it. It does not move while it has you looking.
const LOCK = { e: [0.55, 4.2], n: [0.8, 2.6], h: [1.0, 2.0] };
export function lockOn() {
  const [dur, gap] = LOCK[cfg.diff] || LOCK.n;
  S.lockT = S.t + dur;
  S.lockNext = S.lockT + gap + Math.random() * 1.4;
  sfx.thud();
  S.dark = Math.max(S.dark, 0.35);
}
export function updateStrobe() {
  const st = S.strobe;
  if (!st) return;
  // irregular, never more than three flashes a second: lit 0.12–0.18 s, dark 0.22–0.4 s
  let lit = st.lit;
  if (cfg.calm) lit = true;
  else if (S.t >= st.next) {
    lit = !st.lit;
    st.next = S.t + (lit ? 0.12 + Math.random() * 0.06 : 0.22 + Math.random() * 0.18);
  }
  for (const z of st.zones) (flT[z] = 9), (zoneFl[z] = 1);
  const near = thing.mode === 'walk' && Math.hypot(thing.x - player.pos.x, thing.z - player.pos.z) < 14 && S.t > st.wait;
  if (near && lit && !st.lit && S.t > (S.lockNext || 0) && !S.busy) lockOn();
  // it stands and lets you look at it before it starts, and while it has your eyes
  thing.hold = thing.mode === 'walk' && ((!cfg.calm && lit) || S.t < st.wait || S.lockT > S.t);
  if (lit === st.lit) return;
  st.lit = lit;
  for (const z of st.zones) zoneLevel[z] = zoneTarget[z] = cfg.calm ? 0.5 : lit ? 1 : 0.07;
  bakeZones();
  thing.walkSpeed = st.base * (cfg.calm ? st.mult / 2 : st.mult);
  if (st.rect && lit) shuffleCrowd(st.rect, st.floor);
  for (const sp of crowd) sp.visible = !!st.rect && lit;
}
// while locked: the view turns to it and the mouse does nothing
export function updateLock() {
  if (!(S.lockT > S.t) || S.busy || thing.mode !== 'walk') return;
  const dx = thing.x - player.pos.x, dz = thing.z - player.pos.z, dy = thing.y + 0.55 - (player.pos.y + player.eyeH);
  let yaw = Math.atan2(-dx, -dz);
  while (yaw - player.yaw > Math.PI) yaw -= 2 * Math.PI;
  while (yaw - player.yaw < -Math.PI) yaw += 2 * Math.PI;
  player.tyaw = yaw;
  player.tpitch = Math.atan2(dy, Math.hypot(dx, dz));
}

// out of the control room, round the counter, across the hall to the passage: it is somewhere among them
export const LOBBY_RECT = [30.6, 43.4, 18.9, 24.9];
export function startChase() {
  S.chase = true;
  S.streak = 0;
  startStrobe([Z.CCTV, Z.LOBBY], LOBBY_RECT);
  lobbyWalker();
  ui.say('它进来了', 1.6);
  if (once('runHint2')) {
    ui.prompt('Shift  跑');
    after(3, () => ui.prompt(null));
  }
}
export function lobbyWalker() {
  if (!S.chase || S.busy) return;
  S.flags.twist = false;
  thing.mode = 'walk';
  thing.stalk = false;
  thing.pin = null;
  // it is in the far corner among the chairs; the way out is across the hall from it
  thing.place(31.0, 24.2);
  thing.body.visible = true;
  // it does not move until you are out of the control room: however long you stand there, the run is the same run
  Object.assign(S.strobe, { base: D().walk, lit: null, mult: 1.2, wait: Infinity });
  S.lockNext = 0;
}
// it is not good with doors: two seconds after you leave a room it is simply somewhere behind you again
export function walkerFollow(dt) {
  if (thing.mode !== 'walk' || S.busy) return;
  const p = player.pos, d = Math.hypot(p.x - thing.x, p.z - thing.z);
  S.stuckT = roomAt(thing.x, thing.z) !== roomAt(p.x, p.z) ? (S.stuckT || 0) + dt : 0;
  if (S.stuckT > 2.2 || d > 16) {
    S.stuckT = 0;
    const bx = Math.sin(player.yaw), bz = Math.cos(player.yaw);
    for (const r of [8, 6.5, 5]) {
      const x = p.x + bx * r, z = p.z + bz * r;
      if (roomAt(x, z) && !world.blocked(x, z, baseGround(x, z), 1.6, 0.3, 0.3)) {
        thing.place(x, z);
        break;
      }
    }
  }
}
// halfway across the hall the lights go out for a moment; when they come back it is ahead of you, a little to one side
export function updateChaseTwist() {
  if (!S.chase || !S.strobe || S.busy || S.flags.twist || thing.mode !== 'walk') return;
  const p = player.pos;
  if (p.z < 20.6 || roomAt(p.x, p.z)?.id !== 'LOBBY') return;
  S.flags.twist = true;
  const st = S.strobe;
  st.lit = false;
  st.next = S.t + 0.9;
  for (const z of st.zones) zoneLevel[z] = zoneTarget[z] = 0.03;
  for (const sp of crowd) sp.visible = false;
  bakeZones();
  sfx.clunk();
  after(0.85, () => {
    if (!S.chase || S.busy) return;
    // ahead toward the way out, offset to whichever side has more room
    const dx = 39.8 - p.x, dz = 25.2 - p.z, l = Math.hypot(dx, dz) || 1, k = Math.min(4.2, l * 0.7);
    for (const side of [p.x < 38 ? -1 : 1, p.x < 38 ? 1 : -1]) {
      const x = p.x + (dx / l) * k - (dz / l) * 1.9 * side, z = p.z + (dz / l) * k + (dx / l) * 1.9 * side;
      if (roomAt(x, z)?.id === 'LOBBY' && !world.blocked(x, z, 0.2, 1.6, 0.3, 0.3)) {
        thing.place(x, z);
        break;
      }
    }
    S.freezeT = S.t + 1.0;
    S.lockNext = 0;
    sfx.sting();
  });
}
export function endChase() {
  if (!S.chase) return;
  S.chase = false;
  stopStrobe([0.25, DIM]);
  if (thing.mode === 'walk') (thing.mode = 'hunt'), (thing.body.visible = false);
}

// ---------------- turning round ----------------
// Some things only happen when you turn your back on where you were looking: `fn` when you have turned, `late` if you never do.
export const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function armTurn(fn, sec = 25, late) {
  S.turn = { yaw0: player.yaw, until: S.t + sec, fn, late };
}
// dead ends: walk up to one after closing, and whatever you do next, you do it with your back to something
export const DEADENDS = [[27.6, 68.2, 1.6], [12.6, 18.9, 1.4], [31.4, 56.2, 1.3], [50.6, 20.6, 1.5], [10.4, 67.3, 1.2], [13.6, 74.7, 1.2], [8.3, 72.6, 1.2], [22.5, 78.0, 1.3], [5.3, 77.2, 1.0]];
export function updateTurn() {
  const tr = S.turn;
  if (tr) {
    if (S.busy) return;
    if (Math.abs(angDiff(player.yaw, tr.yaw0)) > 2.0) (S.turn = null), tr.fn();
    else if (S.t > tr.until) (S.turn = null), tr.late?.();
    return;
  }
  if (S.phase !== 3 || S.busy || S.finale || S.chase || thing.mode === 'walk') return;
  const p = player.pos;
  DEADENDS.forEach(([x, z, r], i) => {
    if (S.turn || S.flags['de' + i] || Math.hypot(x - p.x, z - p.z) > r) return;
    S.flags['de' + i] = true;
    armTurn(() => glimpse(1.4, 0.45), 20);
  });
}

// ---------------- the corridor that was short a minute ago ----------------
// Nothing here can end the session. The lights go out behind you a stretch at a time, and it is in the dark water under them.
// Fall in, or let the dark catch up, and it pulls you under and shows you something, then you are back on the last mat you stood on.
const FRONT = { e: 0.5, n: 0.7, h: 0.9 };
export function updateLong(dt) {
  const p = player.pos, id = roomAt(p.x, p.z)?.id;
  if (!S.long) {
    if (S.wheel && !S.flags.longDone && !S.busy && id === 'P2' && p.z > 26.6 && p.z < 27.6 && player.vel.z > 0.3) {
      // you walked into the short passage to the snack bar. It is not that passage any more.
      S.long = true;
      endChase();
      S.longCk = 21.4;
      S.longFront = 14;
      S.longWait = S.t + 4;
      p.x += 10.8;
      p.z -= 5.2;
      S.dark = 0.9;
      sfx.clunk();
      goal('别掉进水里');
      after(1.6, () => S.long && ui.say(['这条走廊', '没有这么长'], 2.2));
      thing.place(50.6, 14);
      LONG_ZONES.forEach((z) => ((zoneTarget[z] = 0.6), (flAmp[z] = 0.9)));
    }
    return;
  }
  // where you last had your feet on something: that is where you come back to, not the far end
  if (player.grounded && player.depth < 0.05 && id === 'LONG') {
    const m = world.MATS.find((q) => p.z > q[1] && p.z < q[1] + 1.7);
    S.longCk = m ? m[1] + 0.85 : p.z < 23 ? 21.4 : S.longCk;
  }
  // never more than a few metres behind you; stand still and it closes the rest
  if (!S.busy && S.t > S.longWait) S.longFront = Math.max(S.longFront + (FRONT[cfg.diff] || FRONT.n) * dt, p.z - 5.5);
  // every stretch the dark has passed goes out; the one it is coming into stutters first
  LONG_ZONES.forEach((z, k) => {
    const end = 20 + k * 4 + 4, gone = S.longFront > end - 0.6;
    zoneTarget[z] = gone ? 0.05 : 0.6;
    flAmp[z] = gone ? 0 : S.longFront > end - 7 ? 1.8 : 0.9;
  });
  // it is the dark: its head in the water where the light stops
  thing.stalk = true;
  thing.x = 50.6;
  if (!S.dunk) thing.z += (Math.min(S.longFront, p.z - 1.4) - thing.z) * Math.min(1, dt * 2);
  S.dark = Math.max(S.dark, clamp(1 - (p.z - S.longFront) / 5, 0, 0.5));
  if (id === 'LONG' && p.z > 34 && once('longDoc')) ui.doc('你走错了。那边没有人在等你。', 3.5);
  // halfway, once: every lamp goes, and when they come back it is standing at the far end, where you are going
  if (id === 'LONG' && p.z > 31.5 && !S.busy && once('longFar')) {
    for (const z of LONG_ZONES) (zoneFl[z] = 0.04), (flT[z] = 0.9);
    bakeZones();
    sfx.clunk();
    after(0.9, () => {
      if (!S.long) return;
      thing.pin = new THREE.Vector3(50.6, 1.08, 43.2);
      thing.body.visible = true;
      sfx.sting();
      after(0.7, () => {
        thing.pin = null;
        for (const z of LONG_ZONES) (zoneFl[z] = 0.04), (flT[z] = 0.25);
        bakeZones();
      });
    });
  }
  if (!S.busy) {
    // anything below the top of the mats, between the two landings, is in the water
    if (id === 'LONG' && p.y < 0.12 && p.z > 22.7 && p.z < 41.5) {
      S.longWet = (S.longWet || 0) + dt;
      if (S.longWet > D().wet) (S.longWet = 0), dunk();
    } else S.longWet = 0;
    if (S.longFront > p.z - 0.3) dunk();
  }
  if (id === 'LEND' || p.z > 43.5) {
    S.long = false;
    S.flags.longDone = true;
    S.streak = 0;
    thing.stalk = false;
    p.x = clamp(p.x - 10.8, 39.45, 40.15);
    p.z = Math.min(30.6, p.z - 13);
    S.dark = 0.9;
    sfx.clunk();
    goal('把手轮装回机房的排水闸');
    thing.hide = 4;
    thing.react = -2;
  }
}
// pulled under: what is down there with you, and then the last mat again
export function dunk() {
  if (S.busy) return;
  S.busy = true;
  S.dunks = (S.dunks || 0) + 1;
  S.dunk = { t: 0, n: S.dunks, y0: player.pos.y };
  player.mode = 'script';
  sfx.splash(1);
  sfx.thud();
  sfx.set('machine', 0, 0.2);
  after(0.3, () => sfx.sting());
  after(0.45, () => sfx.shriek());
  for (const k of [0.8, 1.3, 1.8]) after(k, () => sfx.heartbeat());
  after(2.2, () => ui.fade(1, 0.1));
  after(2.5, () => {
    S.dunk = null;
    thing.pin = null;
    for (const sp of crowd) sp.visible = false;
    player.teleport(50.6, 0.24, S.longCk);
    player.mode = 'walk';
    player.grounded = true;
    player.breath = 1;
    player.roll = 0;
    player.face(Math.PI, 0);
    S.longFront = Math.min(S.longFront, S.longCk - 7);
    S.longWait = S.t + 2.5;
    thing.z = S.longFront;
    S.busy = false;
    sfx.set('machine', 0.55, 2);
    ui.fade(0, 0.7);
    sfx.gasp();
  });
}
export function updateDunk(dt) {
  const d = S.dunk;
  if (!d) return;
  d.t += dt;
  // down, fast, and held there
  player.pos.y = Math.max(-1.5, d.y0 - d.t * 5);
  player.roll = Math.sin(d.t * 7) * 0.06;
  player.tpitch = Math.min(player.tpitch, 0.25 + d.t * 0.1);
  camera.getWorldDirection(fwd);
  // first time its face; then the legs of grown-ups standing round you in the water, none of them looking down; then both
  const crowdOn = d.n % 2 === 0 || d.n >= 3, faceOn = d.n % 2 === 1 || (d.n >= 3 && d.t > 1.2);
  if (crowdOn && !d.placed) {
    d.placed = true;
    crowd.slice(0, 8).forEach((sp, i) => {
      const dz = (i % 2 ? 1 : -1) * (0.9 + (i >> 1) * 0.75), x = 50.1 + ((i * 0.37) % 1) * 1.0, h = 2.3 + (i % 3) * 0.2;
      sp.scale.set(h * 0.27, h, 1);
      sp.position.set(x, -0.9 + h / 2, player.pos.z + dz);
      sp.visible = true;
    });
  }
  if (faceOn) {
    const k = Math.max(0.35, 1.8 - (d.t - (d.n >= 3 ? 1.2 : 0.25)) * 1.6);
    thing.pin = new THREE.Vector3(camera.position.x + fwd.x * k, camera.position.y - 0.3, camera.position.z + fwd.z * k);
    thing.body.visible = true;
  }
}

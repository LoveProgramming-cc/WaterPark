// The way out and the four ways it can end: the drain valve and the river run, the turnstile, the glass.
import * as THREE from 'three';
import { HALL, WAVE, PASSAGE, GLASS, WATER0, Z, NZ, RING, DOORS, zoneId, inTunnel, roomAt, baseGround } from './world.js';
import { ui } from './ui.js';
import { sfx } from './sfx.js';
import { t, cfg, D, redrawAll } from './i18n.js';
import { camera, zoneTarget, flAmp, world, water, input, player, thing, S, after, once, clamp, lerp, at, fwd, tmp } from './core.js';
import { goal } from './guide.js';
import { vision } from './story.js';
import { caught, startStrobe, stopStrobe, walkerFollow } from './scares.js';
import { allMine } from './mine.js';

// ---------------- the drain valve, the pump room, the hole under the water ----------------
// Turning the valve lifts the gate on the river and sets the water running for the hole at the end of the tunnel.
// The only way to that hole is the river: out of the pump room past it, back to the dock, in, and down the tunnel with it behind you.
export const RIVER = [[29.5, 41], [36.5, 41], [36.5, 46.9], [43, 47.2], [48.2, 47.2], [48.2, 56.8], [36.5, 56.8], [36.5, 60.5]];
export const RLEN = RIVER.map((p, i) => (i ? Math.hypot(p[0] - RIVER[i - 1][0], p[1] - RIVER[i - 1][1]) : 0));
export function riverS(x, z) {
  // how far along the river (x,z) is
  let best = 0, bd = 1e9, acc = 0;
  for (let i = 1; i < RIVER.length; i++) {
    const [ax, az] = RIVER[i - 1], [bx, bz] = RIVER[i], L = RLEN[i];
    const u = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (L * L), 0, 1), d = Math.hypot(ax + (bx - ax) * u - x, az + (bz - az) * u - z);
    if (d < bd) (bd = d), (best = acc + u * L);
    acc += L;
  }
  return best;
}
export function riverAt(s) {
  for (let i = 1; i < RIVER.length; i++) {
    if (s <= RLEN[i] || i === RIVER.length - 1) {
      const u = clamp(s / RLEN[i], 0, 1);
      return [lerp(RIVER[i - 1][0], RIVER[i][0], u), lerp(RIVER[i - 1][1], RIVER[i][1], u)];
    }
    s -= RLEN[i];
  }
}
export const inRiverNow = () => player.mode === 'swim' && (inTunnel(player.pos.x, player.pos.z) || roomAt(player.pos.x, player.pos.z)?.id === 'SNACK');
export function openDrain() {
  S.finale = 1;
  S.fin = 'pump';
  S.streak = 0;
  S.p3 = Math.max(S.p3, 76);
  world.drain = true;
  world.currentScale = 1.5;
  world.obj.grate.visible = false;
  world.obj.grateSolid.off = true;
  world.obj.riverShut.set(false);
  world.obj.floats.set(true);
  world.obj.valveWheel.visible = true;
  S.spin = 1.4;
  sfx.clang();
  zoneTarget[Z.PUMP] = 0.34;
  zoneTarget[Z.TUN] = 0.5;
  zoneTarget[Z.TERR] = 0.7;
  zoneTarget[Z.SNACK] = Math.max(zoneTarget[Z.SNACK], 0.45);
  flAmp[Z.PUMP] = 1.2;
  thing.mode = 'off';
  thing.strength = 0;
  goal('回漂流河 跳进去');
  vision('river', '闸开了 水往隧道里冲', 1.2, true);
  after(2.6, pumpWalker);
}
export function pumpWalker() {
  if (S.finale !== 1 || S.busy) return;
  thing.mode = 'walk';
  thing.walkSpeed = D().walk;
  thing.stalk = false;
  thing.pin = null;
  // in the pump room it is already in the middle of the room, between you and the door you came in by
  S.fin === 'pump' ? thing.place(37.2, 50.5) : thing.place(31.7, 37.4);
  S.stuckT = 0;
  thing.body.visible = true;
  sfx.sting();
  if (S.fin === 'pump') {
    sfx.clunk();
    world.obj.t3Door.set(true);
    if (!S.strobe) startStrobe([Z.PUMP, Z.VALVE], null);
    S.strobe.base = D().walk;
    S.strobe.mult = 1.4;
    S.strobe.lit = null;
    S.lockNext = 0;
  }
  if (once('ashore')) {
    ui.say(['它上岸了', '从员工通道跑'], 2);
    ui.prompt('Shift  跑');
    after(4, () => ui.prompt(null));
  }
}
export function finaleWin() {
  S.finale = 3;
  S.phase = 4;
  goal(null);
  player.forcedUnder = false;
  thing.mode = 'off';
  thing.body.visible = false;
  thing.strength = 0;
  world.currentScale = 1;
  flAmp.fill(0);
  sfx.set('lap', 0.012, 2);
  sfx.set('gurgle', 0, 0.3);
}
export function updateFinale(dt) {
  if (S.spin) {
    S.spin = Math.max(0, S.spin - dt);
    world.obj.valveWheel.rotation.x += dt * 7;
  }
  if (!S.finale || S.finale > 2 || S.busy) return;
  const p = player.pos;
  if (S.finale === 1) {
    if (S.fin === 'pump' && !['PUMP'].includes(roomAt(p.x, p.z)?.id) && p.x < 29.6) (S.fin = 'run'), stopStrobe([0.34, 0.9]);
    walkerFollow(dt);
    if (inRiverNow()) {
      // in: it follows you into the water, and now it is the faster one unless you swim
      S.finale = 2;
      S.fin = 'run';
      S.chaseT = 0;
      S.runS = riverS(p.x, p.z) - 7.5;
      S.dryT = 0;
      thing.mode = 'chase';
      thing.body.visible = true;
      sfx.splash(1);
      sfx.set('hvac', 0.4, 1);
      if (once('suck')) ui.say(['它下水了', '游 别停'], 1.8);
    }
    return;
  }
  S.chaseT += dt;
  const sp = riverS(p.x, p.z);
  // the whistle stops it for a moment even here
  if (!(S.freezeT > S.t)) S.runS = Math.min(S.runS + Math.min(D().river, 1.5 + S.chaseT * 0.9) * dt, sp + 0.2);
  const [tx, tz] = riverAt(S.runS);
  thing.x = tx;
  thing.z = tz;
  thing.y = world.level - 0.52;
  // the hole is too small for it: it stops at the mouth, and the drain takes you under and through
  player.forcedUnder = inTunnel(p.x, p.z) && Math.abs(p.x - 36.5) < 1.5 && p.z > 56.2;
  if (p.z > 56.8 && Math.abs(p.x - 36.5) < 2.6 && inTunnel(p.x, p.z)) p.x += (36.5 - p.x) * Math.min(1, dt * 6);
  const gap = sp - S.runS;
  S.dark = Math.max(S.dark, clamp(1 - gap / 4, 0, 0.45));
  S.dryT = inRiverNow() || player.forcedUnder ? 0 : S.dryT + dt;
  if (S.dryT > 1.2) {
    // climbed back out
    S.finale = 1;
    thing.mode = 'walk';
    thing.place(31.7, 43.6);
  } else if ((gap < 0.9 && S.chaseT > 1 && p.z < 57.9) || player.breath <= 0) caught();
  else if (p.z > 60.2 && Math.abs(p.x - 36.5) < 3.2) finaleWin();
}

// ---------------- the way out through the turnstile ----------------
export function gatePush() {
  if ((S.gateCd || 0) > S.t) return;
  S.gateCd = S.t + 1.25;
  S.gate++;
  sfx.knock();
  sfx.clunk();
  if (S.gate === 1) {
    ui.say(['动了一点', '再推'], 1.4);
    ui.doc('你要去哪里。他们还没有回来。', 3);
    thing.mode = 'walk';
    thing.walkSpeed = D().gate;
    thing.place(30.8, 23.8);
    thing.body.visible = true;
    after(0.5, () => sfx.thud());
  } else if (S.gate < 4) ui.say(S.gate === 2 ? '再推' : '它在后面', 1.1);
  else {
    S.ending = 'left';
    S.busy = true;
    player.freeze = true;
    thing.mode = 'off';
    thing.body.visible = false;
    ui.doc('不对。那天你没有自己走。', 3);
    finish('那天你是自己走回家的。\n四站路，头发还是湿的。\n晚饭的时候，没有人问你下午去了哪里。');
  }
}

// ---------------- the glass ----------------
export const GW = GLASS.x1 - GLASS.x0, MW = Math.ceil(GW * 10), MH = Math.ceil(GLASS.h * 10), wiped = new Uint8Array(MW * MH);
export const TARGETS = [
  { p: new THREE.Vector3(33.6, 0.03, 66.3), line: '三双拖鞋' },
  { p: new THREE.Vector3(37.2, 0.78, 66.7), line: '三个杯子' },
  { p: new THREE.Vector3(35.4, 0.36, 67.5), line: '子拓的小泳圈' },
];
export function glassHit(origin, dir) {
  if (dir.z < 0.08) return null;
  const k = (GLASS.z - 0.07 - origin.z) / dir.z;
  if (k < 0 || k > 3) return null;
  const x = origin.x + dir.x * k, y = origin.y + dir.y * k;
  return x > GLASS.x0 && x < GLASS.x1 && y > 0 && y < GLASS.h ? [x, y] : null;
}
export function updateGlass() {
  const p = player.pos;
  const nearGlass = p.z > 62.6 && p.z < GLASS.z && p.x > 28 && S.phase === 4 && !S.ending;
  if (nearGlass && once('glassHint')) ui.prompt('按住鼠标  擦玻璃');
  if (!nearGlass) return;
  camera.getWorldDirection(fwd);
  if (input.mouseDown) {
    const h = glassHit(camera.position, fwd);
    if (h) {
      const c = world.fog.ctx, cx = ((GLASS.x1 - h[0]) / GW) * 2048, cy = (1 - h[1] / GLASS.h) * 512;
      c.globalCompositeOperation = 'destination-out';
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, 50);
      g.addColorStop(0, 'rgba(0,0,0,0.55)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.4)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(cx - 50, cy - 50, 100, 100);
      c.globalCompositeOperation = 'source-over';
      world.fog.texture.needsUpdate = true;
      const mx = ((h[0] - GLASS.x0) * 10) | 0, my = (h[1] * 10) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = mx + dx, yy = my + dy;
        if (xx >= 0 && xx < MW && yy >= 0 && yy < MH && wiped[yy * MW + xx] < 250) wiped[yy * MW + xx] += 12;
      }
      if (++S.wipes === 20) ui.prompt(null);
    }
  }
  for (const tg of TARGETS) {
    if (tg.seen) continue;
    tmp.subVectors(tg.p, camera.position).normalize();
    if (tmp.dot(fwd) < 0.86) continue;
    const h = glassHit(camera.position, tmp);
    if (!h) continue;
    if (wiped[((h[1] * 10) | 0) * MW + (((h[0] - GLASS.x0) * 10) | 0)] > 70) {
      tg.seen = true;
      ui.say(tg.line, 2.6);
      if (TARGETS.every((x) => x.seen)) endingSeen();
    }
  }
}
export function endingSeen() {
  if (allMine()) return endingOwn();
  S.ending = 'seen';
  ui.prompt(null);
  after(4, () => {
    sfx.laughter();
    ui.caption('（笑声。隔着玻璃。）', 5);
  });
  after(11, () => ui.self('他们没有在找我', 4.5));
  after(18, () => {
    ui.doc('你看，他们就在那里。你找到了。');
    ui.doc('那天你很开心。');
    zoneTarget[Z.TERR] = 0.06;
    sfx.clunk();
  });
  after(31, () => finish('三双拖鞋。三个杯子。\n笑声在玻璃的另一边。'));
}
// with everything of mine found: the same three things through the glass, and this time I do not need them to look up
export function endingOwn() {
  S.ending = 'own';
  ui.prompt(null);
  after(3, () => {
    sfx.laughter();
    ui.caption('（笑声。隔着玻璃。）', 5);
  });
  after(9, () => ui.self('他们没有在找我', 3.5));
  after(13.5, () => ui.doc('你看，他们就在那里。你找到了。'));
  after(19, () => ui.self('我找到的不是他们', 3));
  after(22.5, () => ui.self('是我自己的东西', 3));
  after(27, () => {
    zoneTarget[Z.TERR] = 0.9;
    sfx.chime();
  });
  after(31, () => finish('潜水镜，手电筒，口哨，还有那部手机。\n那天没有人来找你。\n这一次，你把自己的东西一样一样找了回来。\n\n那三个小时，不是你的错。'));
}
export function finish(text) {
  sfx.flash();
  ui.fade(1, 0.12, '#fff');
  after(1.4, () => {
    ui.end('水上乐园', text);
    sfx.set('hvac', 0, 3);
    sfx.set('machine', 0, 1);
    sfx.set('lap', 0, 1);
    if (document.pointerLockElement) document.exitPointerLock();
  });
}

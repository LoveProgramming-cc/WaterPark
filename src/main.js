// The level's loop: per-frame rules, triggers, the interaction prompt, scripted movement, pause, boot and the debug handle.
import * as THREE from 'three';
import { HALL, WAVE, PASSAGE, GLASS, WATER0, Z, NZ, RING, DOORS, zoneId, inTunnel, roomAt, baseGround } from './world.js';
import { ui } from './ui.js';
import { sfx } from './sfx.js';
import { t, cfg, D, redrawAll } from './i18n.js';
import { renderer, scene, camera, zoneLevel, zoneTarget, zoneFl, flAmp, flT, bakeZones, G, FOG_AIR, FOG_WATER, ZDARK, world, water, input, player, thing, composer, trail, film, setPR, PR_MAX, S, timers, after, once, inter, clamp, lerp, smooth, P, at, fwd, tmp } from './core.js';
import { goal, askHint, updateWay, nag, initMarks, updateMarks } from './guide.js';
import { startRide, updateVision, startPrologue, endPrologue, updateIntro, startP1, startP3 } from './story.js';
import { updateWarps, takeWheel, mazeGo, updateMaze } from './space.js';
import { caught, glimpse, updateStrobe, startChase, endChase, updateTurn, updateLong, updateLock, updateDunk, lockOn, walkerFollow, updateChaseTwist } from './scares.js';
import { updateMine, showInv, blow } from './mine.js';
import { riverS, riverAt, updateFinale, updateGlass, finish } from './endings.js';

// ---------------- per-frame rules ----------------
// the doctor's version of the day: stand in the wave pool, face the shore, hold still.
// It comes up behind you whenever you are not looking at it, and backs off when you are.
export const POSE_T = 8;
export function updatePose(dt) {
  const p = player.pos, hv = Math.hypot(player.vel.x, player.vel.z);
  S.poseBar = null;
  if (S.long) return;
  const inZone = S.phase === 3 && !S.finale && !S.busy && !S.ending && thing.mode === 'hunt' && p.x > WAVE.x0 && p.x < WAVE.x1 && p.z > WAVE.z0 + 2 && player.mode === 'walk' && world.level - p.y > 0.3;
  if (inZone && !thing.stalk) {
    thing.place(p.x + (p.x < 15 ? 2 : -2), Math.min(p.z + 11, WAVE.z1 - 1.5));
    if (once('stalkHint')) ui.doc('就是这里。面朝岸边，站好。');
  }
  thing.stalk = inZone;
  if (!inZone) {
    if (!S.ending) S.pose = Math.max(0, S.pose - dt);
    return;
  }
  const dx = thing.x - p.x, dz = thing.z - p.z, d = Math.hypot(dx, dz) || 1;
  const looking = (dx * -Math.sin(player.yaw) + dz * -Math.cos(player.yaw)) / d > 0.6;
  if (looking) {
    if (d < 11) thing.moveToward(thing.x + dx / d, Math.min(thing.z + Math.abs(dz / d) + 0.3, WAVE.z1 - 1), 2.4 * dt, true);
  } else {
    thing.moveToward(p.x, p.z, 1.5 * dt, true);
    // the child says out loud what the doctor is telling you not to do
    if (d < 6.5 && once('stalkSeen')) ui.say(['它在我后面', '我一回头看 它就退'], 2.4);
  }
  S.dark = Math.max(S.dark, clamp(1 - d / 5, 0, 0.6));
  if (d < 0.8) return poseCaught();
  if (Math.cos(player.yaw) > 0.72 && hv < 0.25) {
    const b = S.pose;
    S.pose += dt;
    if (b < 1.0 && S.pose >= 1.0) ui.doc('别动。', 1.5);
    if (b < 3.2 && S.pose >= 3.2) ui.doc('别回头。', 1.5);
    if (b < 6.0 && S.pose >= 6.0) ui.doc('笑一个。', 1.5);
    const k = Math.min(8, Math.floor(S.pose));
    S.poseBar = `${t('面朝岸边  别动')}   ${'●'.repeat(k)}${'○'.repeat(8 - k)}`;
    if (S.pose >= POSE_T) posePhoto();
  }
}
export function faceThing(dist) {
  camera.getWorldDirection(fwd);
  thing.pin = new THREE.Vector3(camera.position.x + fwd.x * dist, camera.position.y - 0.35, camera.position.z + fwd.z * dist);
  thing.body.visible = true;
}
export function poseCaught() {
  S.pose = 0;
  thing.stalk = false;
  S.busy = true;
  player.freeze = true;
  sfx.sting();
  faceThing(0.75);
  after(0.55, () => {
    S.busy = false;
    player.freeze = false;
    thing.pin = null;
    thing.body.visible = false;
    caught();
  });
}
export function posePhoto() {
  S.ending = 'photo';
  S.busy = true;
  thing.stalk = false;
  player.freeze = true;
  // the shutter opens, and for that one frame it is in the picture too
  sfx.sting();
  faceThing(0.6);
  after(0.4, () => finish('照片后来压在客厅的玻璃板下面。\n所有人都说，你看笑得多开心。\n没有人问过，你身后那片水为什么是黑的。'));
  after(0.6, () => ((thing.pin = null), (thing.body.visible = false)));
}

export function triggers(dt, t) {
  const p = player.pos;
  // walking into the slide mouth is enough; so is swimming up to a ladder
  const mo = world.slide.mouth;
  if (player.mode === 'walk' && !S.ride && p.y > world.PLAT - 0.3 && Math.abs(p.x - mo.x) < 0.62 && p.z > mo.z) startRide();
  if (player.mode === 'swim' && !S.finale && !S.climb && !player.under)
    for (const l of world.ladders)
      if (Math.hypot(l.x - p.x, l.z - p.z) > l.r + 0.7) l.armed = true;
      else if (l.armed && Math.hypot(l.x - p.x, l.z - p.z) < l.r) {
        l.armed = false;
        player.mode = 'script';
        S.climb = { t: 0, from: p.clone(), to: new THREE.Vector3(l.tx, l.ty, l.tz) };
        break;
      }
  if (player.mode === 'walk') for (const l of world.ladders) l.armed = false;
  if (S.phase === 0.5 && player.mode === 'walk' && player.depth < 0.25) startP1();
  if (S.phase >= 1 && S.phase < 3) {
    if (Math.hypot(p.x - P.fam[0], p.z - P.fam[1]) < 4 && once('here')) ui.say('他们刚才还在这');
    if (p.x > 17 && p.z > 35.5 && p.z < 46 && roomAt(p.x, p.z)?.id === 'WAVE' && once('prints')) ui.say(['三个人的脚印', '到这就干了']);
    if (cfg.diff !== 'h' && player.depth > 0.6 && thing.mode === 'lurk' && once('deepWarn')) ui.say(['水底下有东西', '别在深水里待着'], 2.6);
    if (Math.hypot(p.x - world.SHOWER.x, p.z - world.SHOWER.z) < 3 && once('shower')) ui.say('有人没关水');
  }
  if (S.phase === 2) {
    if (p.y > world.PLAT - 0.3 && once('top')) ui.say('从这里滑下去 就回到造浪池了');
    if (inTunnel(p.x, p.z) && player.mode === 'swim') {
      if (once('tun')) ui.say('好黑');
      if (p.z > 55.6 && p.x < PASSAGE.x1 + 2 && once('glow')) {
        ui.say(['水下面是亮的', '有栏杆 过不去', '那边是儿童池']);
      }
    }
    if (S.flags.door && once('p3wait')) after(12, startP3);
    if (S.flags.log && S.t - S.logT > 210) startP3();
    if (S.t > 60 * 14) startP3();
  }
  if (S.phase === 3) {
    S.p3 += dt;
    world.level = WATER0 + smooth(clamp((S.p3 - 4) / 70, 0, 1)) * 0.26;
    world.waveAmp += (1 - world.waveAmp) * Math.min(1, dt * 0.4);
    if (player.mode === 'walk' && player.grounded && player.depth > 0.03 && p.y > -0.05 && once('flood')) ui.say('水漫上来了');
    if (thing.react > 0.7 && thing.speed > 2 && once('seen')) ui.say('水里有东西', 2);
    if (!world.drain && p.z > 55.6 && p.x < 39.5 && inTunnel(p.x, p.z) && once('grateHint')) {
      ui.say(['栏杆还关着', '旁边就是机房'], 2.2);
      goal('去机房 打开排水闸');
    }
    // it is seen, for a moment, in places that are dry
    if (S.t > S.nextGlimpse) S.nextGlimpse = S.t + (glimpse(6 + Math.random() * 3, 0.45 + Math.random() * 0.4) ? Math.max(18, 48 - S.catches * 8) : 4);
    if (S.gate && thing.mode === 'walk' && Math.hypot(p.x - 41.5, p.z - 21.2) > 13) {
      S.gate = 0;
      thing.mode = 'hunt';
      thing.body.visible = false;
    }
    if (thing.mode === 'hunt' && thing.react > 0.7 && player.mode === 'walk' && once('runHint')) {
      ui.prompt('Shift  跑    站到干的地方 它就找不到你');
      after(5, () => ui.prompt(null));
    }
  } else if (S.phase >= 1) world.waveAmp += (0.35 - world.waveAmp) * Math.min(1, dt * 0.3);
}

export function interactions() {
  S.paperT = ui.paperOpen ? (S.paperT || 0) + 1 / 60 : 0;
  if (ui.paperOpen) {
    if (S.paperT > 0.35 && Object.values(input.edge).some(Boolean)) {
      ui.closePaper();
      S.onPaperClose?.();
      S.onPaperClose = null;
    }
    ui.prompt(S.flags.glassHint && S.wipes < 20 && S.phase === 4 ? '按住鼠标  擦玻璃' : null);
    return;
  }
  if (S.poseBar) return ui.prompt(S.poseBar);
  if (player.mode === 'script' || S.busy || S.phase < 1) {
    if (S.phase >= 1) ui.prompt(null);
    return;
  }
  camera.getWorldDirection(fwd);
  let best = null, bd = 1e9;
  for (const o of inter) {
    if (o.off || (o.enabled && !o.enabled())) continue;
    const d = Math.hypot(o.x - player.pos.x, o.z - player.pos.z);
    if (d > o.r) continue;
    tmp.set(o.x, o.y, o.z).sub(camera.position).normalize();
    if (!o.any && d > 0.7 && tmp.dot(fwd) < 0.55) continue;
    if (d < bd) (bd = d), (best = o);
  }
  if (S.phase === 4 && S.flags.glassHint && S.wipes < 20 && !best) return;
  ui.prompt(best ? `E  ${t(best.label)}` : null);
  if (best && input.hit('KeyE')) {
    sfx.tick();
    best.on();
  }
}

export function scripted(dt) {
  if (S.climb) {
    const c = S.climb;
    c.t = Math.min(1, c.t + dt / 0.85);
    const k = smooth(c.t);
    player.pos.lerpVectors(c.from, c.to, k);
    player.pos.y = lerp(c.from.y, c.to.y, Math.min(1, k * 1.5)) + Math.sin(k * Math.PI) * 0.15;
    if (c.t >= 1) {
      S.climb = null;
      player.mode = 'walk';
      player.grounded = true;
      player.vel.set(0, 0, 0);
    }
  }
  if (S.ride) {
    const r = S.ride;
    r.v = Math.min(r.v + 3.2 * dt, 9);
    r.u = Math.min(1, r.u + (r.v * dt) / r.len);
    const pt = r.s.curve.getPointAt(r.u), tg = r.s.curve.getTangentAt(r.u);
    player.pos.set(pt.x, pt.y - 0.3 - player.eyeH, pt.z);
    player.tyaw = Math.atan2(-tg.x, -tg.z);
    // keep the shortest way round
    while (player.tyaw - player.yaw > Math.PI) player.tyaw -= 2 * Math.PI;
    while (player.tyaw - player.yaw < -Math.PI) player.tyaw += 2 * Math.PI;
    player.tpitch = Math.asin(clamp(tg.y, -1, 1)) * 0.8;
    player.roll = Math.sin(r.u * 40) * 0.05;
    if (r.u >= 1) {
      S.ride = null;
      player.roll = 0;
      player.teleport(r.s.end.x, world.groundAt(r.s.end.x, r.s.end.z, 0, 0), r.s.end.z);
      player.grounded = true;
      player.mode = 'walk';
      sfx.splash(1);
    }
  }
  if (S.pull) {
    S.pull += dt;
    player.pos.y -= 1.6 * dt;
    player.roll = Math.sin(S.pull * 8) * 0.08;
    S.dark = Math.max(S.dark, Math.min(1, S.pull * 1.5));
  }
}

// ---------------- loop ----------------
export const clock = new THREE.Clock();
export let camZone = 1, underK = 0;
export function frame(dt, draw = true) {
  if (S.phase > -1) S.t += dt;
  if (S.prologue && input.hit('Space')) endPrologue();
  const t = S.t;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= t) timers.splice(i, 1)[0].fn();

  S.dark = Math.max(0, S.dark - dt * 0.8);
  if (S.intro) updateIntro(dt, t);
  scripted(dt);
  updateDunk(dt);
  updateLock();
  if (S.lockT > S.t) input.dx = input.dy = 0;
  player.update(dt, t);
  camera.updateMatrixWorld();
  updateVision(dt, t);
  if (S.phase >= 0.5) {
    triggers(dt, t);
    updateLong(dt);
    updateWarps();
    updateMaze();
    updateMarks(t);
    updateTurn();
    if (S.chase && S.strobe?.wait === Infinity && player.pos.x < 43.8) S.strobe.wait = S.t + 0.8;
    // out through the corridors instead: it follows you there too, and only gives up once you are well away
    if (S.chase && !['CCTV', 'LOBBY', 'P2', 'C3', 'C2', 'C1', 'PS'].includes(roomAt(player.pos.x, player.pos.z)?.id)) endChase();
    if (S.chase) walkerFollow(dt), updateChaseTwist();
    updateWay();
    if (input.hit('KeyH')) askHint();
    nag();
    updatePose(dt);
    updateFinale(dt);
    updateGlass();
    updateMine(dt);
    interactions();
  }
  const dThing = thing.update(dt, t, player, camera);
  world.update(t);

  // zone lights easing
  let dirty = false;
  for (let i = 0; i < NZ; i++)
    if (zoneLevel[i] !== zoneTarget[i]) {
      const d = zoneTarget[i] - zoneLevel[i], s = Math.sign(d) * Math.min(Math.abs(d), dt * 0.9);
      zoneLevel[i] += s;
      dirty = true;
    }
  updateStrobe();
  // the whistle: for a moment it stands and looks
  if (S.freezeT > S.t && thing.mode === 'walk') thing.hold = true;
  else if (!S.strobe) thing.hold = false;
  // flicker: at most about one stutter a second per zone and never shorter than a seventh of a second,
  // which keeps it well under the rates that are a risk for photosensitive players. "Reduce flicker" turns it off.
  for (let i = 0; i < NZ; i++) {
    if (flT[i] > 0) {
      if ((flT[i] -= dt) <= 0) (zoneFl[i] = 1), (dirty = true);
    } else if (!cfg.calm && flAmp[i] > 0 && Math.random() < dt * Math.min(0.9, flAmp[i] * 0.5)) {
      flT[i] = 0.15 + Math.random() * 0.3;
      // lit rooms dip; dark rooms come back for a moment
      zoneFl[i] = zoneTarget[i] < 0.3 ? 2.2 + Math.random() * 1.6 : 0.35 + Math.random() * 0.3;
      dirty = true;
    } else if (cfg.calm && zoneTarget[i] < 0.3 && zoneFl[i] !== 1.5) (zoneFl[i] = 1.5), (dirty = true);
  }
  if (dirty) bakeZones();
  const decay = S.phase >= 3 ? Math.min(0.7, 0.18 + S.p3 / 280) : S.flags.door ? 0.12 : 0;
  G.uDecay.value += (Math.min(1, decay + S.catches * 0.08) - G.uDecay.value) * Math.min(1, dt * 0.4);

  // swim ring
  const ring = world.obj.ring;
  if (player.hasRing) {
    const show = player.mode === 'swim' && !player.under;
    ring.visible = show;
    if (show) {
      ring.position.set(player.pos.x, world.surfaceAt(player.pos.x, player.pos.z, t) + 0.0, player.pos.z);
      ring.rotation.set(Math.PI / 2 + Math.sin(t * 1.3) * 0.04, 0, Math.sin(t * 0.9) * 0.04);
      ring.scale.setScalar(1.12);
    }
  }

  // camera medium
  const surfCam = world.surfaceAt(camera.position.x, camera.position.z, t);
  const under = camera.position.y < surfCam - 0.01 && world.level - world.groundAt(camera.position.x, camera.position.z, -5, 0) > 0.3;
  underK += ((under ? 1 : 0) - underK) * Math.min(1, dt * 14);
  if (under !== S.under) sfx.under((S.under = under));
  const cz = zoneId(camera.position.x, camera.position.z);
  if (cz >= 0) camZone += (zoneLevel[cz] * zoneFl[cz] - camZone) * Math.min(1, dt * 3);
  G.uCamZone.value = camZone;
  G.uFogCol.value.copy(FOG_AIR).lerp(FOG_WATER, underK);
  // the big halls are full of the sprinklers' mist; the goggles let you see under the water
  const camRoom = roomAt(camera.position.x, camera.position.z)?.id;
  const fogT = { WAVE: 0.042, SLIDE: 0.036, SNACK: 0.03, LOBBY: 0.024, TERR: 0.03 }[camRoom] ?? 0.018;
  const mistT = { WAVE: 0.85, SLIDE: 0.7, SNACK: 0.6, SHOW: 0.6, W1: 0.6, W2: 0.6, W3: 0.6, T1: 0.7, T2: 0.7, T3: 0.7 }[camRoom] ?? 0.25;
  S.fogD += (fogT - S.fogD) * Math.min(1, dt * 0.8);
  S.mist = (S.mist ?? 0.5) + (mistT - (S.mist ?? 0.5)) * Math.min(1, dt * 0.8);
  G.uMist.value = S.mist * (1 - underK);
  G.uFogD.value = lerp(S.fogD, S.has.goggles ? 0.075 : 0.17, underK);
  G.uTime.value = t;
  G.uWaterY.value = world.level;
  scene.background.copy(G.uFogCol.value).multiply(tmpC.copy(ZDARK).lerp(WHITE, camZone));
  water.setLevel(world.level);
  water.uniforms.uUnder.value = under ? 1 : 0;
  water.uniforms.uWaveAmp.value = world.waveAmp;
  water.uniforms.uThing.value.set(thing.x, thing.z, 1.5, thing.strength);
  film.uniforms.t.value = t;
  film.uniforms.under.value = underK;
  film.uniforms.dark.value = Math.max(S.dark, player.under ? clamp((0.35 - player.breath) * 2.2, 0, 0.7) : 0);
  trail.uniforms.damp.value = Math.pow(lerp(0.42, 0.7, underK), dt * 60);

  // sound that follows the situation
  const nearWave = clamp(1 - Math.hypot(player.pos.x - 15, player.pos.z - 50) / 45, 0, 1);
  sfx.set('wash', 0.02 + 0.1 * world.waveAmp * nearWave, 0.5);
  sfx.set('gurgle', thing.strength * clamp(1 - dThing / 13, 0, 1) * 0.07, 0.3);
  if ((thing.mode === 'hunt' && (thing.react > 0 || thing.stalk) && dThing < 12) || thing.mode === 'walk' || S.finale === 2) {
    S.beat -= dt;
    if (S.beat <= 0) {
      sfx.heartbeat();
      S.beat = clamp(dThing / 12, 0.42, 0.95);
    }
  }
  ui.breath(player.breath, player.mode === 'swim' && player.breath < 0.995 && S.phase >= 0.5);

  if (draw) composer.render(dt);
  input.endFrame();
}
export let paused = false;
export function setPause(on) {
  if (S.phase <= -1 || S.ending || paused === on) return;
  paused = on;
  ui.pause(on);
  sfx.pause(on);
  input.keys = {};
  if (on && document.pointerLockElement) document.exitPointerLock();
  if (!on) input.capture();
}
document.addEventListener('pointerlockchange', () => {
  // Esc drops the pointer lock before the page ever sees the key: losing the lock is the pause
  if (!document.pointerLockElement && !input.drag) setPause(true);
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && (input.drag || paused)) setPause(!paused);
});
window.addEventListener('blur', () => setPause(true));
// keep an eye on the frame rate: if it stays low for a couple of seconds, render fewer pixels; if it has room again, more
let slow = 0, fast = 0;
function adapt(raw) {
  if (paused || raw > 0.25) return;
  slow = raw > 0.024 ? slow + raw : Math.max(0, slow - raw * 0.5);
  fast = raw < 0.0135 ? fast + raw : 0;
  const pr = renderer.getPixelRatio();
  if (slow > 2 && pr > 0.6) setPR(Math.max(0.6, +(pr - 0.15).toFixed(2))), (slow = fast = 0);
  else if (fast > 8 && pr < PR_MAX) setPR(Math.min(PR_MAX, +(pr + 0.15).toFixed(2))), (slow = fast = 0);
}
export function tick() {
  const raw = clock.getDelta(), dt = Math.min(raw, 0.05);
  adapt(raw);
  if (!paused) frame(dt);
  requestAnimationFrame(tick);
}
export const tmpC = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1);

// ---------------- boot ----------------
player.teleport(15, 0, 36.5);
player.face(Math.PI, -0.05);
export const q = new URLSearchParams(location.search);
export function begin() {
  input.capture();
  sfx.start();
  ui.veil(false);
  if (S.phase > -1) return;
  const skip = +q.get('p') || 0;
  if (!skip) return startPrologue();
  dbg.go(skip);
  ui.fade(0, 2.5);
}
ui.initStatic({ onStart: begin, onResume: () => setPause(false), onChange() {
  // language, name or sibling changed: redraw every sign in place and put the goal line back up in the new words
  redrawAll();
  if (S.goalText) ui.goal(S.goalText);
} });
renderer.domElement.addEventListener('click', () => !paused && input.capture());

initMarks();
export const dbg = (window.__wp = {
  S, player, world, thing, zoneTarget, zoneLevel, flAmp, ui, mazeGo, lockOn, blow, showInv, startChase, endChase, setPause, cfg, riverS, riverAt, takeWheel, glimpse, caught, camera, renderer, setPR, composer, input, begin, G, roomAt, scene,
  // run the game forward without drawing; `keys` are held, `each` is called before every step
  step(sec, keys = {}, each) {
    for (let i = 0, n = Math.round(sec * 60); i < n; i++) {
      Object.assign(input.keys, keys);
      if (each && each(i) === false) break;
      frame(1 / 60, false);
    }
    for (const k in keys) input.keys[k] = false;
  },
  look(x, z, yaw, pitch = 0, y) {
    player.teleport(x, y ?? world.groundAt(x, z, 20, 0), z);
    player.mode = 'walk';
    player.grounded = true;
    player.face(yaw, pitch);
  },
  tp(x, z, y = 0) {
    player.teleport(x, y, z);
    player.mode = 'walk';
  },
  go(n) {
    S.phase = n;
    S.intro = null;
    world.waveAmp = 0.35;
    ui.prompt(null);
    thing.mode = n >= 3 ? 'hunt' : 'lurk';
    player.mode = 'walk';
    if (n === 1) player.teleport(15, 0, 38.6), startP1();
    if (n >= 2) (player.hasRing = true), (S.flags.pa = S.flags.towel = S.flags.arm = true);
    if (n === 2) player.teleport(33, 0.2, 22), goal('去服务台问问');
    if (n === 1) S.flags.towel = S.flags.arm = false;
    if (n === 4) (S.flags.glassHint = false), ui.say('他们在玻璃后面', 3);
    if (n === 3 || n === 5 || n === 6 || n === 7) {
      S.phase = 2;
      player.teleport(40, 0, 43.5);
      startP3();
      S.p3 = n > 3 ? 80 : 0;
    }
    // 5: wheel in hand, in the lobby. 6: at the valve. 7: wheel in hand, at the staff door.
    if (n === 7) takeWheel(true), (S.flags.longDone = true), (S.p3 = 80), player.teleport(26.6, 0, 50.6), player.face(-Math.PI / 2);
    if (n === 5 || n === 6) takeWheel(true), player.teleport(n === 5 ? 39.8 : 44.4, 0.2, n === 5 ? 24.2 : 50.4), player.face(n === 5 ? Math.PI : -Math.PI / 2);
    if (n === 4) {
      player.teleport(41.5, 0, 62.5);
      player.face(Math.PI, 0);
      thing.mode = 'off';
    }
  },
});
// build every shader and upload every texture now, including the ones for things that are hidden until they appear:
// otherwise the first sight of it stalls the frame, which is exactly the moment that must not stall
function warm() {
  const hidden = [];
  scene.traverse((o) => {
    if (o.visible) return;
    hidden.push(o);
    o.visible = true;
  });
  renderer.compile(scene, camera);
  scene.traverse((o) => {
    for (const m of [].concat(o.material || []))
      for (const k of ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'roughnessMap'])
        if (m[k]?.isTexture) renderer.initTexture(m[k]);
  });
  for (const o of hidden) o.visible = false;
}
warm();
// the furniture arrives a moment later: warm that too
world.loaded.then(warm);
tick();

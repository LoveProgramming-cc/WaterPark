// Errands of my own. Four things of mine were lost that day, each somewhere it is dangerous to go, and the notice I put up
// for them is on the lobby wall. Every one helps: goggles (see under water, stay down longer), a torch (F), a whistle (Q, it
// stops and looks at you), and the key band that opens the other locker, where the phone is. With all of them the glass
// ends differently.
import * as THREE from 'three';
import { Z, roomAt, inTunnel } from './world.js';
import { ui } from './ui.js';
import { sfx } from './sfx.js';
import { t, cfg, D } from './i18n.js';
import { camera, G, zoneTarget, flAmp, world, input, player, thing, S, after, once, I, fwd } from './core.js';
import { caught } from './scares.js';

const MINE = world.obj.mine;
export const allMine = () => ['goggles', 'torch', 'whistle', 'phone'].every((k) => S.has[k]);
const NAMES = { goggles: '潜水镜', torch: '手电筒 F', whistle: '口哨 Q', phone: '手机' };
export function showInv() {
  ui.inv(Object.keys(NAMES).filter((k) => S.has[k]).map((k) => t(NAMES[k])).join('   ·   '));
}
function take(k) {
  S.has[k] = true;
  MINE[k]?.set(false);
  sfx.tick();
  showInv();
}

// ---------------- the notice ----------------
const ROWS = [
  ['goggles', '潜水镜', '造浪池最深的地方 池底'],
  ['torch', '手电筒', '滑梯最上面'],
  ['whistle', '口哨', '淋浴间后面 有水的走廊'],
  ['band', '手牌 A-218', '漂流河的山洞里'],
];
I({ x: 30.3, y: 1.45, z: 17.45, r: 1.8, label: '寻物启事', on() {
  ui.paper(`<div class="note"><b>${t('寻物启事')}</b><ol>${ROWS.map(([k, n, w]) => `<li class="${S.has[k] ? 'got' : ''}">${t(n)} —— ${t(w)}</li>`).join('')}</ol><p>${t('找到的话 请还给我。')}<br>${t('我在造浪池边上等。')}</p></div>`);
  S.onPaperClose = () => {
    if (once('note')) ui.say(['是我的字', '那天我一直在找东西'], 2.4);
  };
} });

// ---------------- goggles: the bottom of the deep end ----------------
I({ x: 12.4, y: -2.2, z: 60.1, r: 1.7, any: true, label: '潜水镜', enabled: () => !S.has.goggles && player.under && player.pos.y < -1.0, on() {
  take('goggles');
  player.lungs = 1.7;
  ui.say(['我的潜水镜', '戴上它 在水底下能待好久'], 2.4);
} });

// ---------------- torch: the top of the slide ----------------
I({ x: 32.3, y: 6.05, z: 3.0, r: 1.5, label: '手电筒', enabled: () => !S.has.torch, on() {
  take('torch');
  S.torchOn = true;
  ui.say(['我的手电筒', '还亮着'], 2);
  ui.prompt('F  开关手电筒');
  after(4, () => ui.prompt(null));
  if (S.phase < 3) return;
  // the lights in here go, and something is coming up the stairs. The quick way down is the slide.
  zoneTarget[Z.SLIDE] = 0.05;
  flAmp[Z.SLIDE] = 0;
  sfx.clunk();
  after(1.2, () => {
    S.climber = { s: 0 };
    sfx.sting();
    if (cfg.diff !== 'h') ui.say(['楼梯上有东西', '滑下去'], 2);
  });
} });
// the way it comes: up the first flight, along the landing, up the second, then straight at you
const CLIMB = [[21.75, 0, 11.2], [21.75, 3.0, 4.6], [23.0, 3.0, 2.75], [30.2, 6.0, 2.75]].map((p) => new THREE.Vector3(...p));
const CLIMB_LEN = CLIMB.slice(1).map((p, i) => p.distanceTo(CLIMB[i]));
const cv = new THREE.Vector3();
function updateClimber(dt) {
  const c = S.climber;
  if (!c) return;
  const p = player.pos;
  // gone down the slide, or away from the platform: it is not there any more
  if (S.ride || p.y < 4 || S.busy) {
    S.climber = null;
    thing.pin = null;
    thing.body.visible = false;
    zoneTarget[Z.SLIDE] = 0.15;
    flAmp[Z.SLIDE] = 1;
    return;
  }
  c.s += (cfg.diff === 'e' ? 1.7 : cfg.diff === 'h' ? 2.7 : 2.2) * dt;
  let s = c.s, i = 0;
  while (i < CLIMB_LEN.length && s > CLIMB_LEN[i]) s -= CLIMB_LEN[i++];
  if (i < CLIMB_LEN.length) cv.lerpVectors(CLIMB[i], CLIMB[i + 1], s / CLIMB_LEN[i]);
  else {
    // on the platform with you
    const last = CLIMB[CLIMB.length - 1], d = Math.hypot(p.x - last.x, p.z - last.z), k = Math.min(1, s / Math.max(d, 0.01));
    cv.set(last.x + (p.x - last.x) * k, 6.0, last.z + (p.z - last.z) * k);
    if (Math.hypot(p.x - cv.x, p.z - cv.z) < 0.8) {
      S.climber = null;
      thing.pin = null;
      return caught();
    }
  }
  thing.pin = (thing.pin || new THREE.Vector3()).set(cv.x, cv.y + 1.08, cv.z);
  thing.body.visible = true;
}

// ---------------- whistle: the flooded corridor behind the showers ----------------
I({ x: 17.62, y: 1.25, z: 8.2, r: 1.4, label: '口哨', enabled: () => !S.has.whistle, on() {
  take('whistle');
  ui.say(['我的口哨', '体育课用的'], 2);
  ui.prompt('Q  吹口哨');
  after(4, () => ui.prompt(null));
  if (S.phase < 3) return;
  // the lights in here go, and it is standing up out of the water at the far end of the corridor
  zoneTarget[Z.SHOW] = 0.15;
  flAmp[Z.SHOW] = 1.4;
  sfx.clunk();
  const far = player.pos.z > 8.3 ? [14.2, 4.8] : [20.5, 11.8];
  thing.mode = 'walk';
  thing.walkSpeed = D().walk * 1.05;
  thing.pin = null;
  thing.place(...far);
  thing.body.visible = true;
  S.freezeT = S.t + 1.4;
  S.wEvent = true;
  S.wOut = 0;
  sfx.sting();
  after(1.0, () => S.wEvent && cfg.diff !== 'h' && ui.say(['它出来了', '吹哨子'], 2));
} });
export function blow() {
  if (!S.has.whistle || S.busy || S.ending || player.mode === 'script') return;
  if (S.t < (S.whistleCd || 0)) return ui.say('喘不上气 吹不响', 1.2);
  S.whistleCd = S.t + (cfg.diff === 'e' ? 18 : cfg.diff === 'h' ? 40 : 28);
  S.freezeT = S.t + 3;
  sfx.whistle();
  // when it is blown, everyone stops and looks: so does it
  if (thing.mode === 'hunt' || thing.mode === 'lurk') (thing.react = -3), (thing.speed = 0), (thing.hide = Math.max(thing.hide, 3));
  if (once('blew')) after(0.6, () => ui.say('它停下来 看着我', 1.8));
}

// ---------------- the key band: the river tunnel ----------------
I({ x: 49.12, y: 0.12, z: 51.6, r: 1.8, any: true, label: '手牌', enabled: () => !S.has.band && player.mode === 'swim', on() {
  take('band');
  ui.say(['A-218 的手牌', '是爸爸妈妈的柜子'], 2.4);
} });
// the other locker: theirs
I({ x: 13.0, y: 1.6, z: 18.7, r: 1.5, label: 'A-218', enabled: () => !S.has.phone, on() {
  if (!S.has.band) {
    sfx.knock();
    return ui.say(['A-218 锁着', '是我们家另一个柜子'], 2);
  }
  sfx.clunk();
  MINE.lockerB.set(true);
  take('phone');
  ui.paper(`<div class="phone"><b>14:31</b><small>${t('未接来电')} 0</small>
    <p><i>${t('爸爸')} 14:25</i>${t('大的呢')}</p>
    <p><i>${t('妈妈')} 14:26</i>${t('造浪池那边玩呢 不用管')}</p>
    <p><i>${t('爸爸')} 17:12</i>${t('几点了 走吧')}</p>
    <p><i>${t('妈妈')} 17:13</i>${t('嗯 叫上大的')}</p>
    <small>${t('相册 · 今天 · 23 张')}<br>${t('儿童池 · 儿童池 · 儿童池 ……')}</small></div>`);
  S.onPaperClose = () => {
    ui.say(['不用管', '三个小时 不用管'], 2.6);
    after(6, () => ui.doc('那只是随口一句。他们那天很累。'));
  };
} });

// ---------------- each frame ----------------
const tdir = new THREE.Vector3();
export function updateMine(dt) {
  const p = player.pos;
  if (input.hit('KeyF') && S.has.torch && !S.ending) (S.torchOn = !S.torchOn), sfx.tick();
  if (input.hit('KeyQ')) blow();
  // the torch is a toy: it falters when it is close
  let tl = S.has.torch && S.torchOn && !S.ending ? 1 : 0;
  if (tl && thing.body.visible && Math.hypot(thing.x - p.x, thing.z - p.z) < 7) tl *= Math.random() < 0.3 ? 0.15 : 1;
  G.uTorch.value += (tl - G.uTorch.value) * Math.min(1, dt * 20);
  camera.getWorldDirection(tdir);
  G.uTorchPos.value.copy(camera.position);
  G.uTorchDir.value.copy(tdir);
  updateClimber(dt);
  // out of the wet rooms, or well away from it: it goes back under
  if (S.wEvent) S.wOut = ['W1', 'W2', 'W3'].includes(roomAt(player.pos.x, player.pos.z)?.id) ? 0 : (S.wOut || 0) + dt;
  if (S.wEvent && (thing.mode !== 'walk' || S.wOut > 3 || Math.hypot(thing.x - player.pos.x, thing.z - player.pos.z) > 15)) {
    S.wEvent = false;
    if (thing.mode === 'walk') (thing.mode = 'hunt'), (thing.body.visible = false), (thing.hide = 4);
  }
  if (S.phase < 1 || S.busy) return;
  // nudges: what you notice when you are near one of them
  const id = roomAt(p.x, p.z)?.id;
  if (!S.has.goggles && id === 'WAVE' && p.z > 54 && Math.abs(p.x - 12.4) < 6 && once('seeGoggles')) ui.say('池底有东西在反光', 2);
  if (!S.has.band && inTunnel(p.x, p.z) && Math.hypot(p.x - 49.1, p.z - 51.6) < 6 && once('seeBand')) ui.say('墙上挂着什么', 1.6);
  if (!S.has.torch && id === 'SLIDE' && once('seeTorch')) ui.say('滑梯上面 有光', 1.8);
  if (!S.has.whistle && (id === 'W2' || id === 'W3') && once('seeWhistle')) ui.say('灯上挂着个东西', 1.6);
}

// What happens and in what order: every interactable, the flash-cuts, the announcements, the prologue and the phases.
import * as THREE from 'three';
import { HALL, WAVE, PASSAGE, GLASS, WATER0, Z, NZ, RING, DOORS, zoneId, inTunnel, roomAt, baseGround } from './world.js';
import { ui } from './ui.js';
import { sfx } from './sfx.js';
import { t, cfg, D, redrawAll } from './i18n.js';
import { camera, zoneTarget, flAmp, DIM, world, input, player, thing, S, after, once, I, clamp, at } from './core.js';
import { goal } from './guide.js';
import { takeWheel } from './space.js';
import { glimpse, armTurn } from './scares.js';
import { openDrain, gatePush } from './endings.js';

// ---------------- interactions ----------------
at('towel', { label: '毛巾', on() {
  ui.say(['我的毛巾', '只剩这一条了']);
  if (once('towel')) ui.doc('那天你们一家四口都去了。');
  checkPA();
} });
export const ringI = at('ring', { label: '泳圈', on() {
  ui.say('我的泳圈');
  player.hasRing = true;
  ringI.off = true;
} });
at('arm', { label: '臂圈', on() {
  ui.say(['弟弟的臂圈', '他还不会游泳']);
  once('arm');
  checkPA();
} });
at('log', { r: 2.1, label: '登记本', on() {
  const row = (c, ...cells) => `<tr class="${c}">${cells.map((v, k) => `<td${k === 3 && !c ? ' class="mark"' : ''}>${t(v)}</td>`).join('')}</tr>`;
  ui.paper(`<b>${t('走失儿童登记')}</b><table>
    <tr class="faint">${['时间', '姓名', '年龄', '处理'].map((v) => `<th>${t(v)}</th>`).join('')}</tr>
    ${row('faint', '10:05', '刘欣怡', '5岁', '已找到 · 小卖部')}${row('faint', '11:40', '陈浩', '4岁', '已找到 · 更衣室')}${row('faint', '13:15', '王梓萱', '6岁', '已找到 · 滑梯')}
    ${row('', '14:20', '赵子拓', '2岁', '已找到 · 儿童池')}${row('', '&nbsp;', '', '', '')}${row('', '&nbsp;', '', '', '')}</table>`);
  S.onPaperClose = () => {
    goal('去儿童池');
    vision('door', ['儿童池', '没有我的名字']);
    if (once('log')) {
      S.logT = S.t;
      if (S.phase < 2 && once('pa')) after(8, paSequence);
      world.obj.handprints.visible = true;
      after(5, () => ui.doc('他们只是带弟弟去玩了。一会儿就回来。'));
    }
  };
} });
at('mic', { r: 2.1, label: '话筒', on() {
  if (S.micBusy) return;
  S.micBusy = true;
  sfx.chime();
  after(1.9, () => {
    ui.pa('赵———', 5);
    sfx.garble(0.35);
    after(0.4, () => sfx.hiss(1.6));
    after(2.6, () => sfx.garble(0.35));
    after(3.0, () => sfx.hiss(1.6));
  });
  after(12, () => {
    ui.say('没有人来');
    S.micBusy = false;
  });
} });
at('kidsDoor', { r: 1.9, label: '门', on() {
  sfx.knock();
  ui.say(['门锁着', '里面是亮的']);
  if (once('door')) {
    // straight here without stopping: the announcement comes early instead of making you wait for it
    if (S.phase < 2 && once('pa')) after(6, paSequence);
    after(2.2, () => {
      sfx.laughter();
      ui.caption('（门后面有笑声。）', 4);
    });
    after(6, () => {
      ui.say(['他们在里面', '我进不去']);
      goal('找别的路进儿童池');
    });
    after(9.5, () => vision('glow', '水下面 有光', 1.4));
  }
} });
at('locker', { r: 1.6, label: 'A-217', on() {
  ui.say(['四个挂钩', '只有我的衣服还在']);
} });
at('gate', { r: 1.8, label: '闸机', on() {
  if (S.phase === 3 && S.flags.tapes && !S.finale) return gatePush();
  sfx.knock();
  ui.say(['转不动', '外面好亮']);
} });
at('flap', { r: 1.6, label: '挡板', enabled: () => S.phase < 3, on() {
  sfx.knock();
  ui.say(['柜台的挡板 锁着', '里面还有一扇门']);
} });
at('tapes', { r: 1.7, label: '监控', on() {
  ui.say(['14:20 他们带着弟弟走了', '17:30 我还在那张躺椅上', '三个小时 没有人回来看一眼'], 2.8);
  if (once('tapes')) {
    after(11, () => ui.doc('那些画面是坏的。别看。'));
    // while you are reading the screens, something is behind you. It is there when you turn round.
    if (S.phase === 3) armTurn(() => glimpse(1.4, 0.45), 30);
  }
} });
at('wheel', { r: 1.6, label: '手轮', enabled: () => !S.wheel, on: () => takeWheel() });
at('valve', { r: 1.8, label: '排水闸', enabled: () => !world.drain, on() {
  if (S.phase < 3) return ui.say(['一个阀门', '上面少了个轮子']);
  if (!S.wheel) {
    ui.say(['没有手轮 拧不动', '牌子上写 手轮在监控室']);
    goal('去监控室拿手轮（服务台柜台后面）');
    vision('cctv', null, 1.3);
    return;
  }
  openDrain();
} });
at('longDoor', { r: 1.5, label: '门', on() {
  sfx.knock();
  ui.say('打不开');
} });
I({ x: 31.1, y: 1.1, z: 55.3, r: 1.5, label: '门', enabled: () => world.drain, on() {
  sfx.knock();
  ui.say('关死了');
} });
I({ x: 29.5, y: 0.8, z: 42.9, r: 1.6, label: '铁链', enabled: () => S.phase >= 3, on() {
  sfx.knock();
  ui.say(['漂流河关了', '从员工通道走'], 2);
} });
at('receipt', { r: 1.5, label: '小票', on() {
  ui.paper(`<b>${t('欢乐水世界 · 小卖部')}</b><table><tr><td>${t('冰淇淋')}</td><td>× 3</td><td>9.00</td></tr><tr><td>&nbsp;</td><td></td><td></td></tr><tr><td>${t('合计')}</td><td></td><td>9.00</td></tr><tr class="faint"><td>14:02</td><td></td><td>${t('谢谢惠顾')}</td></tr></table>`);
  S.onPaperClose = () => ui.say(['三支', '我们是四个人']);
} });
for (const m of world.maps)
  I({ x: m.x, y: 1.3, z: m.z, r: 2.0, label: '导览图', on() {
    const lie = S.phase >= 3;
    ui.paper(`<img src="${(lie ? world.mapLie : m.canvas).toDataURL('image/jpeg', 0.85)}">`);
    S.onPaperClose = lie ? () => ui.say(['儿童池被涂掉了', '我没有在水里']) : null;
  } });
for (const l of world.ladders)
  I({ x: l.x, y: -0.1, z: l.z, r: 2.0, any: true, label: '抓住梯子', enabled: () => player.mode === 'swim' && S.finale !== 2, on() {
    player.mode = 'script';
    S.climb = { t: 0, from: player.pos.clone(), to: new THREE.Vector3(l.tx, l.ty, l.tz) };
  } });
export const startRide = () => {
  const s = world.slide;
  player.mode = 'script';
  S.ride = { s, u: 0, v: 2.2, len: s.curve.getLength() };
};
I({ x: world.slide.mouth.x, y: world.PLAT + 0.8, z: world.slide.mouth.z - 0.3, r: 1.5, label: '滑下去', enabled: () => player.mode === 'walk' && player.pos.y > world.PLAT - 0.3, on: startRide });


// a dream cuts to somewhere else for a second: this is how it tells you where to go
export const VIS = {
  desk: [38.2, 1.5, 21.6, 0, -0.08], door: [27.0, 1.05, 65.2, -2.9, 0.02], glow: [39.4, -0.62, 56.6, 2.13, -0.06],
  river: [39.8, 1.05, 32.2, 2.37, -0.1], pool: [15, 1.05, 36.6, Math.PI, -0.1], cctv: [38.4, 1.3, 16.6, -Math.PI / 2, 0], svc: [21.6, 1.05, 50.6, -Math.PI / 2, 0.1],
};
export function vision(k, text, dur = 1.15, force) {
  if (S.vision || (S.finale && !force) || S.busy || S.ending || S.long || S.maze || thing.mode === 'walk' || player.mode === 'script' || ui.paperOpen) return;
  const [x, y, z, yaw, pitch] = VIS[k];
  S.vision = { t: 0, dur, x, y, z, yaw, pitch };
  player.freeze = true;
  sfx.hiss(0.5);
  ui.fade(1, 0.04, '#fff').then(() => ui.fade(0, 0.45, '#fff'));
  if (text) ui.say(text, 2.2);
}
export function updateVision(dt, t) {
  const v = S.vision;
  if (!v) return;
  v.t += dt;
  camera.position.set(v.x + Math.sin(t * 31) * 0.004, v.y, v.z);
  camera.rotation.set(v.pitch, v.yaw + (v.t - v.dur / 2) * 0.05, Math.sin(t * 23) * 0.006);
  camera.updateMatrixWorld();
  if (v.t >= v.dur) {
    S.vision = null;
    player.freeze = false;
    ui.fade(1, 0.04, '#fff').then(() => ui.fade(0, 0.4, '#fff'));
  }
}

export function checkPA() {
  if (S.flags.towel && S.flags.arm && once('pa')) after(4, paSequence);
}
export function paSequence() {
  sfx.chime();
  after(2, () => {
    ui.pa('赵子拓小朋友的家长，请到服务台。', 9);
    sfx.garble(5.5);
  });
  after(9, () => ui.say('是弟弟'));
  after(24, () => sfx.chime());
  after(26, () => {
    ui.pa('家长已找到，谢谢。', 6);
    sfx.garble(2.6);
  });
  after(33, () => {
    S.phase = 2;
    flAmp[Z.CORR] = 0.12;
    flAmp[Z.SHOW] = 0.2;
    // if you have already been to the desk or the door, the announcement does not send you back there
    if (S.flags.log || S.flags.door) return ui.say('那我呢');
    ui.say(['那我呢', '去服务台问问']);
    goal('去服务台问问');
    after(2.5, () => vision('desk'));
  });
}

// ---------------- before there is anything to see ----------------
// The child says what happened. The other voice says it did not. Then the dream starts.
export function startPrologue() {
  S.phase = -0.5;
  S.prologue = true;
  player.mode = 'script';
  ui.fade(1, 0.01);
  after(1.0, () => {
    if (!S.prologue) return;
    ui.self('七岁那年 全家唯一一次出门玩', 2.2);
    ui.self('爸爸妈妈带弟弟去了儿童池', 2.2);
    ui.self('把我一个人留在造浪池边 三个小时', 3);
  });
  after(3, () => S.prologue && ui.prompt('空格  跳过'));
  after(13, () => {
    if (!S.prologue) return;
    ui.doc('不是这样的。', 2.2);
    ui.doc('那天你们一家四口都在一起。你玩得很开心。', 3.6);
    ui.doc('闭上眼睛。我们再回去看一次。', 3);
  });
  after(25.5, endPrologue);
}
export function endPrologue() {
  if (!S.prologue) return;
  S.prologue = false;
  ui.clear();
  startIntro();
  ui.fade(0, 2.5);
}

// ---------------- phases ----------------
export function startIntro() {
  S.phase = 0;
  S.intro = { stage: 0, d: -1.2, vy: 0, air: 0, tug: 0 };
  player.mode = 'script';
  player.eyeH = 0.35;
  player.teleport(15, -2, 57);
  player.face(0, 0.45);
  world.waveAmp = 1;
  sfx.set('machine', 0.5);
  sfx.set('wash', 0.06);
  ui.prompt('空格  上浮');
}
export function updateIntro(dt, t) {
  const A = S.intro, surf = world.surfaceAt(15, 57, t);
  if (A.stage === 1) {
    // something has your ankle
    A.tug += dt;
    A.vy = A.d > -1.2 ? -3.4 : 0;
    player.roll = Math.sin(A.tug * 9) * 0.05;
    if (A.tug > 1.9) {
      A.stage = 2;
      A.air = 0;
      player.roll = 0;
      ui.prompt('空格  上浮');
    }
  } else {
    if (input.hit('Space')) A.vy = Math.min(A.vy + 1.5, 2.3);
    A.vy -= (2.4 + Math.max(0, Math.sin(t * 1.9)) * 1.4) * dt;
  }
  A.d = clamp(A.d + A.vy * dt, -1.3, 0.13);
  if ((A.d >= 0.13 && A.vy > 0) || (A.d <= -1.3 && A.vy < 0)) A.vy = 0;
  if (A.d > -0.02) A.air += dt;
  if (A.stage === 0 && A.air > 1.0) {
    A.stage = 1;
    sfx.thud();
    ui.prompt(null);
  }
  if (A.stage === 2 && A.air > 1.5) {
    S.intro = null;
    S.phase = 0.5;
    player.pos.set(15, surf - 0.25, 57);
    player.mode = 'swim';
    player.tpitch = 0;
    ui.prompt('W  往岸上游');
    after(5, () => ui.prompt(null));
    return;
  }
  player.pos.set(15, surf + A.d - 0.35, 57);
  S.dark = clamp(-A.d / 1.6, 0, 0.75);
}
export function startP1() {
  S.phase = 1;
  ui.prompt(null);
  after(2.5, () => goal('看看躺椅上的东西（走近 按 E）'));
  sfx.set('machine', 0.22);
  ui.self('咳 咳', 1.2);
  ui.self('好险 差点淹死', 2.4);
  ui.self('爸爸妈妈去陪弟弟了 让我自己玩一会儿', 3);
  ui.self('我一直觉得水底下有', 0, { erase: 9 });
  after(15, () => {
    ui.doc('水里什么都没有。');
    ui.doc('那天你很开心。');
    thing.mode = 'lurk';
  });
  after(120, () => once('pa') && paSequence());
}
export function startP3() {
  if (S.phase >= 3) return;
  S.phase = 3;
  S.p3 = 0;
  sfx.horn();
  sfx.set('machine', 0.55, 3);
  sfx.set('music', 0, 6);
  thing.mode = 'hunt';
  thing.react = 0;
  after(3.5, () => {
    ui.pa('各位游客，本园即将闭园。', 7);
    sfx.garble(4);
  });
  world.obj.flap.set(false);
  world.obj.cctvDoor.set(false);
  world.obj.flotsam.visible = true;
  world.obj.riverShut.set(true);
  flAmp.fill(0.3);
  flAmp[Z.KIDS] = flAmp[Z.VALVE] = 0;
  flAmp[Z.LONG] = 0.9;
  S.nextGlimpse = S.t + 50;
  after(10, () => {
    sfx.clang();
    vision('glow', '栏杆后面 就是儿童池', 1.3);
  });
  after(13.4, () => {
    goal('从员工通道去隧道尽头');
    vision('svc', '员工通道 通到那边', 1.3);
  });
  // "off" is never black: a dim room whose tubes keep trying to come back on
  const off = (sec, zs, v = 0) => after(sec, () => {
    for (const z of zs) (zoneTarget[z] = Math.max(DIM, v)), (flAmp[z] = 1);
    sfx.clunk();
  });
  off(12, [Z.LOBBY]);
  off(40, [Z.LOCK, Z.SHOW]);
  off(68, [Z.SLIDE]);
  off(96, [Z.CORR], 0.1);
  off(128, [Z.PUMP, Z.BACK], 0.08);
  off(165, [Z.WAVE]);
  off(205, [Z.SNACK], 0.16);
  after(24, () => {
    ui.doc('天黑了。回造浪池去，他们在那里等你。');
    vision('pool', null, 0.8);
  });
  after(78, () => ui.doc('别乱跑。回去。'));
  after(128, () => ui.doc('水里什么都没有。'));
  after(170, () => ui.doc('我没有说过他们在别的地方。'));
}

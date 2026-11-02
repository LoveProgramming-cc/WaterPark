// On-screen controls for phones and tablets. Everything is turned into the same keys, edges and look deltas that the
// keyboard and mouse produce, so nothing else in the game needs to know.
//   left half: a floating stick (appears under the thumb; pushed past its rim it runs)
//   right half: drag to look, faster flicks turn further; hold still with the finger dragged far out and it keeps turning;
//               double tap turns right round; while a finger is down there it also counts as the mouse button (wiping the glass)
//   buttons that only show when they mean something: the thing in front of you, up/down in the water, torch, whistle
//   optional: the gyroscope, so you turn the phone itself to look
import { input, player, S } from './core.js';
import { t, cfg, saveCfg, TOUCH } from './i18n.js';

export { TOUCH };
const K = 0.0021; // radians per unit of look delta (player.look)
const STICK_R = 52;
let root, act, pause, stickEl, knob;
const btn = {};
// keep the finger's moves coming to this element even when it slides off it (a stale pointer id just throws)
const capture = (el, id) => {
  try {
    el.setPointerCapture(id);
  } catch {}
};
const stick = { id: null, x0: 0, y0: 0 };
const look = { id: null, x: 0, y: 0, x0: 0, t: 0, still: 0, tapT: 0, tapX: 0, tapY: 0, moved: 0 };

function el(cls, parent = root, text = '') {
  const e = document.createElement('div');
  e.className = cls;
  if (text) e.textContent = text;
  parent.append(e);
  return e;
}
// a button that holds a key while pressed and gives a single press on touch
function button(name, cls, label, code, hold) {
  const b = el(`tbtn ${cls}`, root, label);
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(b, e.pointerId);
    b.classList.add('held');
    input.edge[code] = true;
    if (hold) input.keys[code] = true;
  });
  const up = () => {
    b.classList.remove('held');
    if (hold) input.keys[code] = false;
  };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  btn[name] = b;
  return b;
}

export function initTouch({ onPause }) {
  if (!TOUCH) return;
  input.touch = true;
  input.touchState = { look, stick }; // for the console
  document.body.classList.add('touch');
  root = el('', document.body);
  root.id = 'touch';
  const left = el('tzone left'), right = el('tzone right');
  stickEl = el('stick');
  knob = el('knob', stickEl);

  // ---- move ----
  left.addEventListener('pointerdown', (e) => {
    if (stick.id !== null) return;
    capture(left, e.pointerId);
    Object.assign(stick, { id: e.pointerId, x0: e.clientX, y0: e.clientY });
    stickEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    stickEl.classList.add('on');
    knob.style.transform = '';
    input.stick = { f: 0, s: 0 };
  });
  left.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.x0, dy = e.clientY - stick.y0;
    const d = Math.hypot(dx, dy);
    // pushed well past the rim: run, and the base follows the thumb so it never has to come back
    const run = d > STICK_R * 1.25;
    if (d > STICK_R * 1.6) {
      const k = (d - STICK_R * 1.6) / d;
      stick.x0 += dx * k;
      stick.y0 += dy * k;
      stickEl.style.transform = `translate(${stick.x0}px, ${stick.y0}px)`;
      dx = e.clientX - stick.x0;
      dy = e.clientY - stick.y0;
    }
    const m = Math.min(1, Math.hypot(dx, dy) / STICK_R), a = Math.atan2(dy, dx);
    // a little dead zone in the middle, so resting the thumb does not creep
    const v = m < 0.15 ? 0 : (m - 0.15) / 0.85;
    input.stick = { f: -Math.sin(a) * v, s: Math.cos(a) * v };
    input.keys.ShiftLeft = run;
    knob.style.transform = `translate(${Math.cos(a) * m * STICK_R}px, ${Math.sin(a) * m * STICK_R}px)`;
    stickEl.classList.toggle('run', run);
  });
  const stickUp = (e) => {
    if (e.pointerId !== stick.id) return;
    stick.id = null;
    input.stick = null;
    input.keys.ShiftLeft = false;
    stickEl.classList.remove('on', 'run');
  };
  left.addEventListener('pointerup', stickUp);
  left.addEventListener('pointercancel', stickUp);

  // ---- look ----
  right.addEventListener('pointerdown', (e) => {
    if (look.id !== null) return;
    capture(right, e.pointerId);
    const now = performance.now();
    // a second quick tap in the same place: turn round
    if (now - look.tapT < 300 && Math.hypot(e.clientX - look.tapX, e.clientY - look.tapY) < 40) {
      input.dx += Math.PI / K;
      look.tapT = 0;
    }
    Object.assign(look, { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, t: now, still: now, moved: 0 });
    input.mouseDown = true;
    input.edge.Mouse = true;
  });
  right.addEventListener('pointermove', (e) => {
    if (e.pointerId !== look.id) return;
    const now = performance.now(), mx = e.clientX - look.x, my = e.clientY - look.y;
    const dt = Math.max(1, now - look.t), speed = Math.hypot(mx, my) / dt; // px per ms
    // slow drags aim; quick flicks are boosted so one swipe can turn you round
    const gain = 3.2 * cfg.sens * (1 + Math.min(2, Math.max(0, speed - 0.5) * 1.6));
    input.dx += mx * gain;
    input.dy += my * gain;
    look.moved += Math.hypot(mx, my);
    if (Math.hypot(mx, my) > 1.5) look.still = now;
    Object.assign(look, { x: e.clientX, y: e.clientY, t: now });
  });
  const lookUp = (e) => {
    if (e.pointerId !== look.id) return;
    // a tap (not a drag) arms the double tap
    if (look.moved < 12) Object.assign(look, { tapT: performance.now(), tapX: e.clientX, tapY: e.clientY });
    look.id = null;
    input.mouseDown = false;
  };
  right.addEventListener('pointerup', lookUp);
  right.addEventListener('pointercancel', lookUp);

  // ---- buttons ----
  act = button('act', 'act', '', 'KeyE', false);
  button('up', 'up', '↑', 'Space', true);
  button('down', 'dive', '↓', 'KeyC', true);
  button('torch', 'torch', t('灯'), 'KeyF', false);
  button('whistle', 'whistle', t('哨'), 'KeyQ', false);
  button('hint', 'hint', '?', 'KeyH', false);
  pause = el('tbtn pause', root, '❚❚');
  pause.addEventListener('pointerdown', (e) => (e.preventDefault(), onPause()));

  // ---- the rest of the screen ----
  // a tap anywhere on a note closes it
  document.getElementById('paper').addEventListener('pointerdown', () => (input.edge.Tap = true));
  el('rotate', document.body, t('请把手机横过来'));
  // turned upright, or sent to the background: stop
  matchMedia('(orientation: portrait)').addEventListener('change', (e) => e.matches && onPause());
  window.addEventListener('devicemotion', onMotion);
}

// ---- gyroscope ----
let gyroOk = false, lastM = 0;
// iOS asks for permission, and only from inside a tap: call this from the start button and the setting
export async function askGyro() {
  if (!TOUCH || !cfg.gyro) return;
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) gyroOk = (await DeviceMotionEvent.requestPermission()) === 'granted';
    else gyroOk = true;
  } catch {
    gyroOk = false;
  }
  if (!gyroOk) saveCfg({ gyro: false });
}
function onMotion(e) {
  const now = performance.now(), dt = Math.min(0.1, (now - lastM) / 1000);
  lastM = now;
  const r = e.rotationRate;
  if (!cfg.gyro || !gyroOk || !r || r.beta == null || !input.locked) return;
  // held sideways the phone's own x axis points up (or down), and its y axis lies along the view's left-right
  const ang = (screen.orientation?.angle ?? window.orientation ?? 90) % 360, sgn = ang === 270 || ang === -90 ? -1 : 1;
  const yawRate = (r.beta * Math.PI) / 180, pitchRate = (r.gamma * Math.PI) / 180;
  input.dx -= (sgn * yawRate * dt) / K;
  input.dy += (sgn * pitchRate * dt) / K;
}

// ---- each frame ----
export function updateTouch() {
  if (!TOUCH) return;
  // dragged far out and held there: keep turning that way, like a stick
  if (look.id !== null && performance.now() - look.still > 150) {
    const off = look.x - look.x0, w = innerWidth * 0.5, over = Math.abs(off) - Math.min(110, w * 0.25);
    if (over > 0) input.dx += (Math.sign(off) * Math.min(1, over / (w * 0.4)) * 2.6 * cfg.sens) / 60 / K;
  }
  const swim = player.mode === 'swim';
  show('act', !!S.near);
  if (S.near && act.dataset.l !== S.near) (act.dataset.l = S.near), (act.textContent = t(S.near));
  show('up', true);
  btn.up.textContent = S.prologue ? t('跳过') : '↑';
  show('down', swim);
  show('torch', !!S.has.torch);
  show('whistle', !!S.has.whistle);
  show('hint', cfg.diff === 'e' && S.phase >= 1);
}
function show(name, on) {
  btn[name].classList.toggle('off', !on);
}
// after a language change
export function relabelTouch() {
  if (!TOUCH) return;
  btn.torch.textContent = t('灯');
  btn.whistle.textContent = t('哨');
  act.dataset.l = '';
  document.querySelector('.rotate').textContent = t('请把手机横过来');
}

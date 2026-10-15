import { face } from './face.js';
import { t, cfg, saveCfg, LANGS } from './i18n.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let gen = 0;

// each channel plays its lines in order; cut() drops everything pending so a new line can start at once
function channel(el, max = 3) {
  let q = Promise.resolve(), cg = 0, pending = 0;
  const run = (fn) => {
    // a line that would have to wait behind too many others is stale by the time it shows: drop the backlog instead
    if (pending >= max) run.cut();
    const g = cg, g0 = gen, dead = () => g !== cg || g0 !== gen;
    pending++;
    q = q.then(() => (dead() ? null : fn(el, dead))).catch(() => {}).then(() => g === cg && pending--);
    return q;
  };
  run.cut = () => {
    cg++;
    pending = 0;
    el.classList.remove('on');
  };
  return run;
}
async function nap(ms, dead) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    if (dead && dead()) return;
    await sleep(Math.min(40, end - performance.now()));
  }
}
const chDoc = channel($('subDoc'), 3), chSelf = channel($('subSelf'), 5), chPA = channel($('subPA'), 2);

async function show(el, text, dur, dead) {
  el.textContent = text;
  el.classList.add('on');
  await nap(dur * 1000, dead);
  if (dead()) return;
  el.classList.remove('on');
  await nap(350, dead);
}

// what you see when it has you. Drawn like a child would draw it; worse every time.
const CRAYON = ['#3a67b0', '#d0567e', '#e08a2c', '#8d8d8d'];
function stick(x, px, py, s, col, R) {
  x.strokeStyle = col;
  x.lineWidth = 5 * s;
  const j = () => (R() - 0.5) * 5 * s;
  for (let k = 0; k < 2; k++) {
    x.beginPath();
    x.arc(px + j(), py - 62 * s + j(), 15 * s, 0, 7);
    x.moveTo(px + j(), py - 46 * s);
    x.lineTo(px + j(), py + j());
    x.moveTo(px - 22 * s, py - 30 * s + j());
    x.lineTo(px + 22 * s, py - 30 * s + j());
    x.moveTo(px, py);
    x.lineTo(px - 14 * s + j(), py + 34 * s);
    x.moveTo(px, py);
    x.lineTo(px + 14 * s + j(), py + 34 * s);
    x.stroke();
  }
}
function scribble(x, cx, cy, rx, ry, n, R, col) {
  x.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    x.lineWidth = 2 + R() * 7;
    x.globalAlpha = 0.4 + R() * 0.6;
    x.beginPath();
    x.moveTo(cx + (R() - 0.5) * 2 * rx, cy + (R() - 0.5) * 2 * ry);
    x.quadraticCurveTo(cx + (R() - 0.5) * rx, cy + (R() - 0.5) * ry, cx + (R() - 0.5) * 2 * rx, cy + (R() - 0.5) * 2 * ry);
    x.stroke();
  }
  x.globalAlpha = 1;
}
const eyes = (x, cx, cy, s) => {
  // the small ones: pinpricks and a slit
  x.fillStyle = '#f4eeda';
  for (const d of [-1, 1]) {
    x.beginPath();
    x.arc(cx + d * 16 * s, cy, Math.max(1.5, 3 * s), 0, 7);
    x.fill();
  }
  x.strokeStyle = '#d6cfb8';
  x.lineWidth = Math.max(1.5, 3 * s);
  x.beginPath();
  x.moveTo(cx - 30 * s, cy + 26 * s);
  x.quadraticCurveTo(cx, cy + 52 * s, cx + 32 * s, cy + 22 * s);
  x.stroke();
};
// What you see when it has you. Four beats, quick:
//   nothing (a held breath) -> its face coming at you -> the drawing, with it in it -> black, and one line.
// Then, just before you are let go, the face again for a fraction of a second.
const LUNGE = 0.14, PIC = 0.66, DARK = 1.2;
function drawScare(x, n, t, T) {
  let seed = 7 + n * 13;
  const R0 = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let live = (Math.random() * 1e9) | 1;
  const R = () => ((live = (live * 16807) % 2147483647) / 2147483647);
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.lineCap = 'round';
  x.fillStyle = '#020203';
  x.fillRect(0, 0, 960, 540);
  const slam = t > T - 0.2;
  if (t < LUNGE || (t >= DARK && !slam)) return;
  if (t < PIC || slam) {
    // It comes at you. Not the same way twice running: its face; out of a crowd; its hand; its mouth.
    const kind = slam ? 0 : n % 4, k = slam ? 1 : Math.pow((t - LUNGE) / (PIC - LUNGE), 0.6), sh = 34;
    x.translate(480 + (R() - 0.5) * sh, 270 + (R() - 0.5) * sh);
    if (kind === 1) {
      // from down here every grown-up is a pair of legs going somewhere else. One of them stops, and bends down.
      x.fillStyle = '#b9bdb6';
      x.fillRect(-520, -310, 1040, 620);
      for (let i = 0; i < 16; i++) {
        const px = ((R0() * 1300 + t * (60 + R0() * 240) * (i % 2 ? 1 : -1)) % 1300 + 1300) % 1300 - 650, w = 46 + R0() * 60, tone = 20 + R0() * 40;
        x.fillStyle = `rgb(${tone},${tone + 2},${tone + 4})`;
        x.beginPath();
        x.moveTo(px - w, -320);
        x.lineTo(px + w, -320);
        x.lineTo(px + w * 0.55, 320);
        x.lineTo(px + w * 0.1, 320);
        x.lineTo(px, -40);
        x.lineTo(px - w * 0.1, 320);
        x.lineTo(px - w * 0.55, 320);
        x.fill();
      }
      scribble(x, 0, -420 + k * 330, 230 + k * 120, 260, 260, R, '#0c1012');
      face(x, 0, -470 + k * 400, 0.5 + k * 1.5, R);
    } else if (kind === 2) {
      // its hand, closing over what you can see
      scribble(x, 0, 0, 520, 320, 120, R, '#0c1012');
      face(x, 0, -30, 0.5 + k * 0.5, R);
      x.strokeStyle = '#050607';
      for (let f = 0; f < 5; f++) {
        const a = -0.9 + f * 0.45 + (R() - 0.5) * 0.05, len = 760 * k;
        for (let q = 0; q < 9; q++) {
          x.lineWidth = 34 + R() * 46;
          x.beginPath();
          x.moveTo(Math.sin(a) * 700 + (R() - 0.5) * 40, 460);
          x.quadraticCurveTo(Math.sin(a) * 500, 200 - len * 0.3, Math.sin(a) * (700 - len * 0.8) + (R() - 0.5) * 30, 460 - len);
          x.stroke();
        }
      }
    } else {
      const s = slam ? 3.4 : 0.45 + k * (kind === 3 ? 4.6 : 2.6);
      scribble(x, 0, 0, 520, 320, 160, R, '#0c1012');
      // the fourth way, the mouth is all there is by the end
      face(x, 0, kind === 3 ? -90 * s * 0.5 : -40 * s * 0.3, s, R);
    }
    return;
  }
  // the drawing
  const g = 1, sh = 14 + n * 4, kz = 1.3;
  x.fillStyle = '#e9e2cf';
  x.fillRect(0, 0, 960, 540);
  x.translate(480 + (R() - 0.5) * sh, 270 + (R() - 0.5) * sh);
  x.scale(kz, kz);
  x.translate(-250, -230);
  x.strokeStyle = '#d8b23a';
  x.lineWidth = 6;
  for (let k = 0; k < 4; k++) x.strokeRect(70 + k * 62 + R0() * 4, 330 + R0() * 4, 44, 84);
  if (n === 1 || n === 3) stick(x, 640, 330, 1.5, CRAYON[0], R0), stick(x, 800, 330, 1.45, CRAYON[1], R0), stick(x, 720, 362, 0.72, CRAYON[2], R0);
  if (n === 2) {
    x.font = '34px "Kaiti SC","STKaiti","KaiTi",serif';
    x.fillStyle = CRAYON[3];
    [['妈', 330, 190], ['爸', 400, 150], ['妈妈', 470, 210], ['爸', 560, 130], ['妈', 640, 180], ['我在这', 720, 120]].forEach(([c, px, py], i) => ((x.globalAlpha = 1 - i * 0.15), x.fillText(c, px, py)));
    x.globalAlpha = 1;
  }
  stick(x, 250, 300, 0.85, CRAYON[3], R0);
  scribble(x, 172, 210, 104 + n * 60, 190 + n * 20, 700, R, '#101416');
  for (let k = 0; k < 14 + n * 6; k++) {
    x.strokeStyle = '#101416';
    x.lineWidth = 3 + R() * 5;
    x.beginPath();
    x.moveTo(190, 150 + R() * 60);
    x.bezierCurveTo(300 + R() * 60, 120 + R() * 80, 340 + R() * 40, 260 + R() * 60, 250 + (R() - 0.5) * 50, 250 + R() * 70);
    x.stroke();
  }
  if (n >= 2) for (let k = 0; k < n * 3; k++) {
    const cx = 420 + R0() * 480, cy = 60 + R0() * 400;
    scribble(x, cx, cy, 56, 98, 50, R, '#101416');
    eyes(x, cx, cy - 30, 0.45);
  }
  if (n >= 3) scribble(x, 250, 320, 60, 70, 240, R, '#101416');
  face(x, 172, 78, 0.44, R, false);
  x.setTransform(1, 0, 0, 1, 0, 0);
  const v = x.createRadialGradient(480, 270, 120, 480, 270, 560);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.9)');
  x.fillStyle = v;
  x.fillRect(0, 0, 960, 540);
}
let scareGen = 0;

export const ui = {
  // `T` is how long it stays up, in seconds
  scare(n, T = 3) {
    const el = $('scare'), g = ++scareGen, cx = el.firstElementChild.getContext('2d'), t0 = performance.now();
    const tx = $('scareText');
    tx.innerHTML = '';
    el.classList.add('on');
    const loop = () => {
      if (g !== scareGen) return;
      const tt = (performance.now() - t0) / 1000;
      drawScare(cx, n, tt, T);
      setTimeout(loop, 45);
    };
    loop();
  },
  scareOff() {
    scareGen++;
    $('scare').classList.remove('on');
  },
  // the doctor: complete sentences, never in a hurry
  doc: (text, dur = 3.8) => chDoc((el, dead) => show(el, t(text), dur, dead)),
  // the child: typed, unpunctuated, sometimes taken back
  self: (text, dur = 2.4, { erase = 0 } = {}) =>
    chSelf(async (el, dead) => {
      el.textContent = '';
      el.classList.add('on');
      for (const ch of t(text)) {
        if (dead()) return;
        el.textContent += ch;
        await nap(cfg.lang === 'en' ? 16 : ch === ' ' ? 110 : 32, dead);
      }
      await nap(erase ? 700 : dur * 1000, dead);
      if (erase) {
        for (let i = 0; i < erase && el.textContent.length && !dead(); i++) {
          el.textContent = el.textContent.slice(0, -1);
          await nap(75, dead);
        }
        await nap(900, dead);
      }
      if (dead()) return;
      el.classList.remove('on');
      await nap(250, dead);
    }),
  // a reaction to something the player just did: interrupts whatever the child was saying
  say(lines, dur = 2.6) {
    chSelf.cut();
    for (const l of [].concat(lines)) this.self(l, dur);
  },
  // `big` puts it up in the middle of the screen for a few seconds as well: a new goal, or the player asking what to do
  goal(text, big) {
    const el = $('goal'), bg = $('goalBig');
    if (text) el.textContent = t(text);
    el.classList.toggle('on', !!text);
    if (!text || !big || cfg.diff === 'h') return bg.classList.remove('on');
    bg.replaceChildren(t(text), ...(cfg.diff === 'e' ? [Object.assign(document.createElement('small'), { textContent: t('H  再看一次提示') })] : []));
    bg.classList.add('on');
    clearTimeout(this._bigT);
    this._bigT = setTimeout(() => bg.classList.remove('on'), 4800);
  },
  // the marker that points at where the goal is: (x, y) in pixels, or off
  way(on, x, y, glyph, dist) {
    const el = $('way');
    el.classList.toggle('on', !!on);
    if (!on) return;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.innerHTML = `${glyph}<small>${dist}m</small>`;
  },
  pa: (text, dur = 6) => chPA((el, dead) => show(el, t('【广播】') + t(text), dur, dead)),
  caption: (text, dur = 4) => chPA((el, dead) => show(el, t(text), dur, dead)),
  clear() {
    gen++;
    for (const id of ['subDoc', 'subSelf', 'subPA']) $(id).classList.remove('on');
  },
  prompt(text) {
    const el = $('prompt');
    if (text) el.textContent = t(text);
    el.classList.toggle('on', !!text);
  },
  breath(v, on) {
    $('breath').classList.toggle('on', on);
    $('breath').firstElementChild.style.width = `${Math.max(0, v) * 100}%`;
  },
  fade(to, sec = 1, color = '#000') {
    const el = $('fade');
    el.style.background = color;
    el.style.transition = `opacity ${sec}s ease`;
    // force a style flush so a colour change does not animate from the old one
    void el.offsetWidth;
    el.style.opacity = to;
    return sleep(sec * 1000);
  },
  paperOpen: false,
  paper(html) {
    $('paperBody').innerHTML = html;
    $('paper').classList.add('on');
    this.paperOpen = true;
  },
  closePaper() {
    $('paper').classList.remove('on');
    this.paperOpen = false;
  },
  inv(text) {
    const el = $('inv');
    el.textContent = text || '';
    el.classList.toggle('on', !!text);
  },
  end(title, text) {
    $('end').querySelector('h2').textContent = t(title);
    $('end').querySelector('p').textContent = t(text);
    $('end').querySelector('.help').textContent = t('如果你也有过被忽视、不被看见的感觉，可以找人说说：12356 心理援助热线 · 12355 青少年服务台');
    $('end').classList.add('on');
  },
  pause(on) {
    $('pause').classList.toggle('on', on);
  },
  // fills in the start screen, the pause screen and the settings both of them carry
  initStatic(cb) {
    const { onStart, onResume, onChange } = (this._cb = cb || this._cb);
    const settings = () => {
      const box = document.createElement('div');
      box.className = 'settings';
      const row = (label, el) => {
        const r = document.createElement('label');
        r.append(t(label), el);
        box.append(r);
        return el;
      };
      const sel = (opts, val) => {
        const e = document.createElement('select');
        for (const [v, l] of opts) e.add(new Option(l, v, false, v === val));
        return e;
      };
      // everything applies at once: signs are redrawn in place, nothing restarts
      const apply = (o, retext) => {
        saveCfg(o);
        document.body.classList.toggle('hard', cfg.diff === 'h');
        if (!retext) return;
        onChange?.();
        setTimeout(() => this.initStatic(), 0);
      };
      row('难度', sel([['e', t('简单')], ['n', t('普通')], ['h', t('困难')]], cfg.diff)).onchange = (e) => apply({ diff: e.target.value });
      row('语言', sel(LANGS, cfg.lang)).onchange = (e) => apply({ lang: e.target.value }, true);
      row('弟弟 / 妹妹', sel([['b', t('弟弟')], ['g', t('妹妹')]], cfg.sib)).onchange = (e) => apply({ sib: e.target.value }, true);
      const name = document.createElement('input');
      name.value = cfg.name;
      name.maxLength = 12;
      name.placeholder = t('留空用默认');
      row('名字', name).onchange = (e) => apply({ name: e.target.value.trim() }, true);
      const calm = document.createElement('input');
      calm.type = 'checkbox';
      calm.checked = cfg.calm;
      row('减少闪烁', calm).onchange = (e) => apply({ calm: e.target.checked });
      for (const el of box.querySelectorAll('select,input')) el.addEventListener('keydown', (e) => e.stopPropagation());
      // folded away until asked for; stays open across the rebuild that a change of language causes
      const fold = document.createElement('details');
      fold.className = 'fold';
      fold.open = !!this._open;
      fold.ontoggle = () => (this._open = fold.open);
      fold.append(Object.assign(document.createElement('summary'), { textContent: t('设置') }), box);
      return fold;
    };
    document.documentElement.lang = { zh: 'zh-CN', hant: 'zh-Hant', en: 'en', ja: 'ja' }[cfg.lang];
    document.body.classList.toggle('en', cfg.lang === 'en');
    document.body.classList.toggle('hard', cfg.diff === 'h');
    document.title = t('水上乐园');
    const btn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = t(label);
      b.onclick = fn;
      return b;
    };
    const p = (text, cls) => {
      const e = document.createElement('p');
      e.textContent = t(text);
      if (cls) e.className = cls;
      return e;
    };
    const h = (tag, text) => {
      const e = document.createElement(tag);
      e.textContent = t(text);
      return e;
    };
    $('veil').replaceChildren(
      h('h1', '水上乐园'),
      p('本游戏含有闪烁的灯光、突然出现的画面和声音，以及溺水、被忽视的童年等内容。', 'warn'), p('如果你对闪光敏感，请勾选“减少闪烁”。', 'warn'),
      settings(), btn('开始', onStart),
      p('WASD 移动 · 鼠标环顾 · Shift 跑 · 空格 跳 / 上浮 · C 下潜 · E 互动 · Esc 暂停', 'keys'), p('简单模式：H 提示 · 方向标记 · 物品发光', 'keys'), p('建议戴耳机', 'keys'),
    );
    // restarting throws the run away, so it asks first
    const restart = btn('重新开始', () => {
      if (restart.dataset.sure) return location.reload();
      restart.dataset.sure = 1;
      restart.textContent = t('确定重新开始？再点一次');
      setTimeout(() => (delete restart.dataset.sure, (restart.textContent = t('重新开始'))), 4000);
    });
    $('pause').replaceChildren(h('h2', '暂停'), btn('继续', onResume), settings(), restart);
    $('paper').querySelector('.hint').textContent = t('任意键关闭');
    $('end').querySelector('a').textContent = t('再来一次');
  },
  veil(on) {
    $('veil').classList.toggle('gone', !on);
  },
  sleep,
};

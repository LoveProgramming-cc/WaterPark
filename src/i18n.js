import { EN } from './lang/en.js';
import { JA } from './lang/ja.js';
import { toHant } from './lang/hant.js';

// Settings and language. The game is written in Chinese; every string that reaches the screen or a texture goes
// through t(): looked up for English and Japanese, converted character by character for Traditional Chinese,
// and then the sibling's name is filled in.
const KEY = 'wp.cfg';
const NAV = (navigator.language || 'zh').toLowerCase();
export const LANGS = [['zh', '简体中文'], ['hant', '繁體中文'], ['en', 'English'], ['ja', '日本語']];
const DEF = { lang: /^zh-(tw|hk|mo|hant)/.test(NAV) ? 'hant' : NAV.startsWith('zh') ? 'zh' : NAV.startsWith('ja') ? 'ja' : 'en', name: '', sib: 'b', calm: false, diff: 'n' };
export const cfg = { ...DEF };
try {
  Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || '{}'));
} catch {}
const q = new URLSearchParams(location.search).get('lang');
if (LANGS.some((l) => l[0] === q)) cfg.lang = q;
export function saveCfg(o) {
  Object.assign(cfg, o);
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {}
}

const zhName = () => cfg.name.trim() || '赵子拓';
const enName = () => cfg.name.trim() || 'Zhao Zituo';
const jaName = () => cfg.name.trim() || 'チャオ・ズートゥオ';
const short = (n) => (n.includes('・') ? n.split('・').pop() : /[一-鿿]/.test(n) ? (n.length >= 3 ? n.slice(1) : n) : n.split(/\s+/).pop());
const girl = () => cfg.sib === 'g';
export const MISSING = new Set();

// difficulty: how fast it is, how long it takes to notice you and to lose you, and how many times in a row it may catch you
const DIFF = {
  e: { hunt: 0.85, react: 1.1, lose: 1.0, walk: 1.9, gate: 1.4, limit: 8, wet: 1.0, river: 3.4 },
  n: { hunt: 1, react: 0.7, lose: 1.5, walk: 2.25, gate: 1.7, limit: 5, wet: 0.45, river: 3.9 },
  h: { hunt: 1.1, react: 0.5, lose: 2.2, walk: 2.6, gate: 2.0, limit: 3, wet: 0.3, river: 4.3 },
};
export const D = () => DIFF[cfg.diff] || DIFF.n;

// every canvas texture with writing on it registers how it was drawn, so a change of language or name can redraw it in place
const REDRAW = [];
export const redrawable = (fn) => (REDRAW.push(fn), fn());
export const redrawAll = () => REDRAW.forEach((fn) => fn());

const DICT = { en: EN, ja: JA };
export function t(s) {
  if (typeof s !== 'string' || !s) return s;
  const dict = DICT[cfg.lang];
  if (dict) {
    let o = dict[s];
    if (o === undefined) {
      if (/[一-鿿]/.test(s)) MISSING.add(s);
      o = s;
    }
    const ja = cfg.lang === 'ja', full = ja ? jaName() : enName();
    return o
      .replaceAll('{NAME}', full).replaceAll('{name}', short(full))
      .replaceAll('{sib}', ja ? (girl() ? '妹' : '弟') : girl() ? 'sister' : 'brother').replaceAll('{kun}', girl() ? 'ちゃん' : 'くん')
      .replaceAll('{he}', girl() ? 'she' : 'he').replaceAll('{He}', girl() ? 'She' : 'He')
      .replaceAll('赵子拓', full).replaceAll('赵———', (ja ? full.split('・')[0] : full.split(/\s+/)[0]) + ' ———');
  }
  let o = s.replaceAll('赵子拓', zhName()).replaceAll('子拓', short(zhName())).replaceAll('赵———', zhName()[0] + '———');
  if (girl()) o = o.replaceAll('弟弟', '妹妹').replaceAll('他还不会游泳', '她还不会游泳');
  return cfg.lang === 'hant' ? toHant(o) : o;
}
if (typeof window !== 'undefined') window.__missing = MISSING;

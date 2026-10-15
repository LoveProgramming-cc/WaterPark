// The floor plan: rooms are nodes, every edge is a doorway or a narrow passage. No rendering in here.
// ---------------- layout (metres; x east, z south) ----------------
// The park is a graph: rooms are nodes, every edge is a doorway or a narrow passage.
export const HALL = { x0: 0, x1: 52, z0: 0, z1: 80, h: 9 };
export const WAVE = { x0: 6.5, x1: 23.5, z0: 39, z1: 62, d: 2.4 };
export const PASSAGE = { x0: 35.6, x1: 37.4, z0: 58, z1: 59.5 };
export const GLASS = { x0: 28.15, x1: 43.85, z: 65.5, h: 3.0 };
export const WATER0 = -0.12;
export const Z = { WAVE: 0, LOCK: 1, SHOW: 2, SLIDE: 3, LOBBY: 4, SNACK: 5, CORR: 6, TUN: 7, TERR: 8, KIDS: 9, PUMP: 10, BACK: 11, CCTV: 12, LONG: 13, MAZE: 14, MN: 15, MW: 16, ME: 17, L1: 18, L2: 19, L3: 20, L4: 21, L5: 22, VALVE: 23 };
export const NZ = 24;
// the long corridor is lit in four-metre stretches that can go out one after another; the corner of the pump room round the valve has its own lamp
export const LONG_ZONES = [Z.LONG, Z.L1, Z.L2, Z.L3, Z.L4, Z.L5];
export const TW = 0.15; // every room builds its own walls, this far inward from its rectangle

export const ROOMS = [], RM = {};
function room(id, zone, x0, x1, z0, z1, h, f, st, label) {
  ROOMS.push((RM[id] = { id, zone, x0, x1, z0, z1, h, f, st, label, subs: [] }));
}
const sub = (id, x0, x1, z0, z1, f, o = {}) => RM[id].subs.push({ x0, x1, z0, z1, f, ...o });

room('WAVE', Z.WAVE, 4, 26, 30, 62, 7.5, 0, 'wave', '造浪池');
sub('WAVE', WAVE.x0, WAVE.x1, WAVE.z0, WAVE.z1, (x, z) => (-WAVE.d * (z - WAVE.z0)) / (WAVE.z1 - WAVE.z0), { pool: 1 });
room('CHIC', Z.CORR, 6, 10, 26, 30, 2.6, 0, 'wet');
sub('CHIC', 6, 10, 26.9, 29.1, -0.3);
room('LOCK', Z.LOCK, 4, 19, 12, 26, 2.7, 0.2, 'lock', '更衣室');
room('SHOW', Z.SHOW, 4, 13, 3, 12, 2.8, 0, 'show', '淋浴');
room('W1', Z.SHOW, 13, 18.4, 4, 5.6, 2.4, -0.3, 'wet');
room('W2', Z.SHOW, 16.8, 18.4, 5.6, 11, 2.4, -0.3, 'wet');
room('W3', Z.SHOW, 16.8, 21, 11, 12.6, 2.4, -0.3, 'wet');
room('SLIDE', Z.SLIDE, 21, 33, 2, 13, 9, 0, 'slide', '滑梯');
sub('SLIDE', 26.5, 32.2, 6, 11.5, -1.1, { pool: 1 });
room('PS', Z.CORR, 30.8, 32.4, 13, 15, 2.5, 0, 'corr');
room('LOBBY', Z.LOBBY, 30, 44, 15, 25.2, 3.0, 0.2, 'lobby', '服务台');
room('C1', Z.CORR, 19, 25.6, 17, 18.6, 2.5, 0, 'corr');
room('C2', Z.CORR, 24, 25.6, 18.6, 23, 2.5, 0, 'corr');
room('C3', Z.CORR, 24, 30, 23, 24.6, 2.5, 0, 'corr');
room('P2', Z.CORR, 39, 40.6, 25.2, 31, 2.5, 0, 'corr');
room('SNACK', Z.SNACK, 28, 44, 31, 48.4, 2.9, 0, 'snack', '小卖部');
// the river cuts the hall in two: out of the west wall, across, down, and out through the tunnel mouth
sub('SNACK', 28, 38, 39.5, 42.5, -1.25, { pool: 1 });
sub('SNACK', 35, 38, 42.5, 48.4, -1.25, { pool: 1 });
sub('SNACK', 38, 44, 45.4, 48.4, -1.25, { pool: 1 });
for (let i = 0; i < 4; i++) sub('SNACK', 28.4, 30.6, 42.2 - i * 0.3, 42.5 - i * 0.3, -0.25 * (i + 1), { mat: 'pool' });
room('P3', Z.CORR, 26, 28, 33, 34.8, 2.5, 0, 'corr');
room('T1', Z.TUN, 44, 49.4, 46, 48.4, 1.7, -1.25, 'tun');
room('T2', Z.TUN, 47, 49.4, 48.4, 55.6, 1.7, -1.25, 'tun');
room('T3', Z.TUN, 30, 49.4, 55.6, 58, 1.7, -1.25, 'tun');
sub('T3', 30, 32.4, 55.6, 56.7, 0, { mat: 'concrete' });
room('PASS', Z.TERR, PASSAGE.x0, PASSAGE.x1, 58, 59.5, -0.3, -1.25, 'tun');
room('PUMP', Z.PUMP, 30, 47, 48.4, 55.6, 3.0, 0.2, 'pump', '机房');
room('SVC', Z.PUMP, 26, 30, 49.8, 51.4, 2.3, 0, 'pump');
room('BACK', Z.BACK, 26, 28, 57, 70, 2.5, 0, 'corr');
room('TERR', Z.TERR, 28, 44, 59.5, 65.5, 3.0, 0, 'terr');
sub('TERR', 33.5, 39.5, 59.5, 63, -1.3, { pool: 1 });
for (let i = 0; i < 3; i++) sub('TERR', 39.1 - i * 0.4, 39.5 - i * 0.4, 59.5, 63, -0.3 * (i + 1), { mat: 'pool' });
// not on any map
room('CCTV', Z.CCTV, 44, 48.6, 15, 18.6, 2.5, 0.2, 'pump');
room('LONG', Z.LONG, 49.8, 51.4, 20, 44, 2.5, -0.9, 'corr');
sub('LONG', 49.8, 51.4, 20, 22.6, 0);
sub('LONG', 49.8, 51.4, 41.6, 44, 0);
room('LEND', Z.LONG, 49.8, 51.4, 44, 45.4, 2.5, 0, 'corr');
// behind the staff door, once you are carrying the wheel: nowhere, and it does not add up.
// A corridor with no far end; a square you can walk round in three turns; a crossing that keeps being the same crossing.
export const RING = { x: 12, z: 71 };
export const CROSS = { x: 22.5, z: 71 };
// It is the back of the children's area: the same coral tiles, low, and on every wall the rule that kept you out.
room('M1', Z.MAZE, 4.6, 6.0, 63.2, 79.4, 2.1, 0.2, 'kback');
room('RN', Z.MAZE, 7.8, 16.2, 66.8, 68.2, 2.1, 0.2, 'kback');
room('RS', Z.MAZE, 7.8, 16.2, 73.8, 75.2, 2.1, 0.2, 'kback');
room('RW', Z.MAZE, 7.8, 9.2, 68.2, 73.8, 2.1, 0.2, 'kback');
room('RE', Z.MAZE, 14.8, 16.2, 68.2, 73.8, 2.1, 0.2, 'kback');
room('MJ', Z.MAZE, 21.8, 23.2, 70.3, 71.7, 2.1, 0.2, 'kback');
room('MS', Z.MAZE, 21.8, 23.2, 71.7, 78.6, 2.1, 0.2, 'kback');
room('MN', Z.MN, 21.8, 23.2, 64.6, 70.3, 2.1, 0.2, 'kback');
room('MW', Z.MW, 16.6, 21.8, 70.3, 71.7, 2.1, 0.2, 'kback');
room('ME', Z.ME, 23.2, 27.6, 70.3, 71.7, 2.1, 0.2, 'kback');
export const HIDDEN = ['PASS', 'CCTV', 'LONG', 'LEND', 'M1', 'RN', 'RS', 'RW', 'RE', 'MJ', 'MS', 'MN', 'MW', 'ME'];
room('KIDS', Z.KIDS, 28, 44, 65.5, 78, 3.4, 0, 'kids', '儿童池');
sub('KIDS', 31, 42, 69, 76.5, -0.35, { pool: 1 });

// openings: [axis that is constant, its value, from, to, top, kind, bottom]
export const DOORS = [
  ['z', 30, 8.3, 9.7, 2.2, 'door'], ['z', 26, 6.3, 7.7, 2.2, 'door'], ['z', 12, 5.0, 6.3, 2.2, 'door'],
  ['x', 13, 4.2, 5.4, 2.1, 'arch'], ['z', 5.6, 16.8, 18.4, 99, 'open'], ['z', 11, 16.8, 18.4, 99, 'open'], ['x', 21, 11.25, 12.45, 2.1, 'arch'],
  ['z', 13, 31, 32.2, 2.2, 'door'], ['z', 15, 31, 32.2, 2.2, 'door'],
  ['x', 19, 17.2, 18.4, 2.2, 'door'], ['z', 18.6, 24, 25.6, 99, 'open'], ['z', 23, 24, 25.6, 99, 'open'], ['x', 30, 23.2, 24.4, 2.2, 'door'],
  ['z', 25.2, 39.2, 40.4, 2.2, 'door'], ['z', 31, 39.2, 40.4, 2.2, 'door'],
  ['x', 26, 33.2, 34.6, 2.2, 'door'], ['x', 28, 33.2, 34.6, 2.2, 'door'],
  ['x', 44, 46.15, 48.25, 1.25, 'open'], ['z', 48.4, 47, 49.4, 99, 'open'], ['z', 55.6, 47, 49.4, 99, 'open'],
  ['z', 55.6, 30.5, 31.7, 2.0, 'door'], ['x', 30, 50, 51.2, 2.0, 'door'], ['x', 26, 50, 51.2, 2.0, 'door'],
  ['x', 26, 57.6, 59, 2.2, 'door'],
  ['z', 58, PASSAGE.x0, PASSAGE.x1, -0.3, 'open'], ['z', 59.5, PASSAGE.x0, PASSAGE.x1, -0.3, 'open'],
  ['z', GLASS.z, GLASS.x0, GLASS.x1, GLASS.h, 'open', 0],
  ['x', 44, 15.9, 16.9, 2.0, 'door'], ['z', 44, 50, 51.2, 2.2, 'door'],
  ['z', 68.2, 7.8, 9.2, 99, 'open'], ['z', 68.2, 14.8, 16.2, 99, 'open'], ['z', 73.8, 7.8, 9.2, 99, 'open'], ['z', 73.8, 14.8, 16.2, 99, 'open'],
  ['z', 70.3, 21.8, 23.2, 99, 'open'], ['z', 71.7, 21.8, 23.2, 99, 'open'], ['x', 21.8, 70.3, 71.7, 99, 'open'], ['x', 23.2, 70.3, 71.7, 99, 'open'],
  ['z', 13, 26.8, 28.4, 4.6, 'open', 3.0], ['z', 30, 19.7, 21.3, 4.3, 'open', 2.6],
].map(([ax, at, a, b, y1, kind, y0 = -9]) => ({ ax, at, a, b, y0, y1, kind }));

let lastRoom = ROOMS[0];
const inRm = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
export function roomAt(x, z) {
  if (inRm(lastRoom, x, z)) return lastRoom;
  for (const r of ROOMS) if (inRm(r, x, z)) return (lastRoom = r);
  return null;
}
function floorOf(r, x, z) {
  let f = r.f;
  for (const s of r.subs) if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) f = typeof s.f === 'function' ? s.f(x, z) : s.f;
  return f;
}
// outside every room the ground is "high": nothing walks or swims there
export function baseGround(x, z) {
  const r = roomAt(x, z);
  return r ? floorOf(r, x, z) : 1;
}
export function zoneId(x, z) {
  const r = roomAt(x, z);
  if (!r) return -1;
  if (r.id === 'LONG') return LONG_ZONES[Math.max(0, Math.min(5, Math.floor((z - 20) / 4)))];
  if (r.id === 'PUMP' && x > 43.8 && z < 52.6) return Z.VALVE;
  return r.zone;
}
export const inTunnel = (x, z) => roomAt(x, z)?.st === 'tun';
export const inRiver = (x, z) => inTunnel(x, z) || (roomAt(x, z)?.id === 'SNACK' && baseGround(x, z) < -1);
export const FAM = [9.6, 10.9, 12.2, 13.5];

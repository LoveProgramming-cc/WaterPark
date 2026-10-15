import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { rng } from './rng.js';
import { WAVE, GLASS, WATER0, Z, RM, FAM, roomAt, baseGround } from './layout.js';
import { patch } from './shade.js';
import { bakeLight } from './bake.js';
import { makeMaterials } from './materials.js';
import { makeKit } from './kit.js';
import { dress } from './dress.js';
import { placeProps } from './props.js';

// Puts the park together and answers questions about it (where is the floor, is this blocked, which way does the water run).
//   layout.js     floor plan: rooms, doors, zones
//   materials.js  surface materials        shade.js   the shader patch they all share
//   kit.js        builders + room shells   dress.js   static furniture, room by room
//   props.js      signs and story objects  maptex.js  canvas textures      bake.js  light bake
export * from './layout.js';
export { patch };

export function buildWorld(scene, G) {
  const R = rng(2026);
  G.uLM = { value: null };
  const { M, STYLE } = makeMaterials(G);
  const K = makeKit(STYLE, R);
  const { bins, solids, occluders, lights, models } = K;
  const { PLAT, slide, MATS } = dress(K, R);

  // ---------------- flush everything static ----------------
  for (const [name, geos] of Object.entries(bins)) {
    const geo = mergeGeometries(geos.map((g) => {
      const n = g.index ? g.toNonIndexed() : g;
      for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
      return n;
    }));
    const mesh = new THREE.Mesh(geo, M[name]);
    scene.add(mesh);
  }


  const { mine, maps, towel, ring, arm, grate, grateSolid, fog, fogMesh, handprints, footprints, sprayTex, SHOWER, fallTex, drips, flotsam, foam, riverShut, floats, t3Door, flap, cctvDoor, svcDoor, monitors, cams, wheelItem, valveWheel, mapLie } = placeProps(scene, G, K, M, R, PLAT, MATS);

  // ---------------- models (CC0, Poly Haven) ----------------
  const loader = new GLTFLoader(), byId = {};
  for (const m of models) (byId[m.id] ||= []).push(m);
  const loads = [];
  for (const [id, list] of Object.entries(byId))
    loads.push(loader.loadAsync(`/models/${id}/${id}_1k.gltf`).then((g) => {
      const src = g.scene;
      src.traverse((o) => {
        if (!o.isMesh) return;
        // real refraction (the clock glass) makes three draw the whole park a second time whenever it is in view: plain see-through is enough
        if (o.material.transmission > 0) Object.assign(o.material, { transmission: 0, transparent: true, opacity: 0.18, depthWrite: false });
        patch(o.material, G);
      });
      if (id === 'metal_trash_can') {
        for (const c of [...src.children]) if (/rust|lid/.test(c.name)) src.remove(c);
        src.children.forEach((c) => (c.position.x -= 0.5));
      }
      for (const p of list) {
        const o = src.clone();
        const holder = new THREE.Group();
        holder.add(o);
        holder.position.set(p.x, p.y, p.z);
        holder.rotation.set(0, p.ry, p.rz || 0, 'YXZ');
        holder.scale.setScalar(p.s);
        scene.add(holder);
      }
    }));

  // ---------------- light ----------------
  scene.add(new THREE.HemisphereLight('#e8eeec', '#8f9a96', 1.0));
  const key = new THREE.DirectionalLight('#fffaf0', 0.22);
  key.position.set(0.5, 1, 0.35);
  scene.add(key);
  G.uLM.value = bakeLight(lights, occluders, solids);

  // ---------------- collision ----------------
  const CELL = 4, hash = new Map();
  for (const s of solids)
    for (let cx = Math.floor(s.x0 / CELL); cx <= Math.floor(s.x1 / CELL); cx++)
      for (let cz = Math.floor(s.z0 / CELL); cz <= Math.floor(s.z1 / CELL); cz++) {
        const k = cx * 1000 + cz;
        (hash.get(k) || hash.set(k, []).get(k)).push(s);
      }
  const near = (x, z) => hash.get(Math.floor(x / CELL) * 1000 + Math.floor(z / CELL));
  const SAMPLES = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const inR = (r, x, z) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;

  const world = {
    M, slide, PLAT, GLASS, fog, maps, rooms: RM, SHOWER,
    MATS, mapLie, drain: false,
    ladders: [{ x: 41, z: 45.7, tx: 41, tz: 44.7, ty: 0, r: 0.6 }, { x: 32.8, z: 56.4, tx: 31.1, tz: 56.2, ty: 0, r: 1.2 }, { x: 26.8, z: 8.6, tx: 25.8, tz: 8.6, ty: 0, r: 1.0 }],
    P: {
      start: [15, 53], towel: [FAM[1], 0.35, 34.95], ring: [FAM[1] - 0.62, 0.3, 35.5], arm: [FAM[3], 0.34, 34.9], fam: [11.5, 34.8],
      log: [38.2, 1.3, 18.2], mic: [40.6, 1.45, 18.2], gate: [41.5, 1.1, 21.2], kidsDoor: [27.8, 1.1, 68.2], locker: [12.6, 1.6, 18.7], receipt: [41.5, 1.0, 38.3],
      flap: [36.25, 1.0, 16.5], cctvDoor: [43.9, 1.2, 16.4], tapes: [45.8, 1.8, 15.4], wheel: [47.5, 1.0, 15.6], valve: [46.1, 1.2, 50.6], grate: [36.5, 0, 57.4], longDoor: [50.6, 1.2, 20.3],
    },
    respawn: [[11.5, 0, 32.5], [5.2, 0, 51], [24.9, 0, 45], [6.2, 0.2, 18.6], [17.6, 0.2, 20], [33, 0.2, 21.5], [39.8, 0.2, 23.8], [38, 0.2, 50.6], [31.3, 0.2, 54.5], [40, 0, 43.5], [27, 0, 60.5], [46, 0.2, 17.4], [24, 0, 8]],
    obj: { mine, towel, ring, arm, grate, grateSolid, handprints, footprints, fogMesh, riverShut, floats, t3Door, flap, cctvDoor, svcDoor, monitors, camAfter: cams[6], wheelItem, valveWheel, flotsam },
    level: WATER0, waveAmp: 1, currentScale: 1,
    update(t) {
      sprayTex.offset.y = t * 1.7;
      fallTex.offset.y = -t * 0.55;
      foam.position.y = this.level + 0.015;
      foam.scale.setScalar(1 + Math.sin(t * 3.1) * 0.06);
      for (const d of drips) {
        const tau = (t + d.ph) % d.per, y = d.y1 - 4.9 * tau * tau;
        d.m.visible = y > Math.max(d.y0, this.level);
        d.m.position.y = y;
      }
      if (flotsam.visible) flotsam.children.forEach((m, i) => (m.position.y = this.level + 0.03 + Math.sin(t * 1.1 + i) * 0.012));
    },
    waveH(x, z, t) {
      if (!inR(WAVE, x, z)) return 0;
      const dz = (z - WAVE.z0) / (WAVE.z1 - WAVE.z0);
      return this.waveAmp * (0.08 + 0.32 * dz) * Math.sin(z * 0.55 + t * 1.9 + Math.sin(x * 0.2) * 0.6);
    },
    surfaceAt(x, z, t) {
      return this.level + this.waveH(x, z, t);
    },
    // highest thing to stand on at (x,z) that is not above knee height
    groundAt(x, z, y, step) {
      let g = baseGround(x, z);
      const list = near(x, z);
      if (list) for (const s of list) if (!s.off && x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1 && s.y1 <= y + step && s.y1 > g) g = s.y1;
      return g;
    },
    // (px,pz) is where the mover is now: anything it already overlaps there may be moved away from, so nobody is ever wedged
    blocked(x, z, y, h, step, r, px, pz) {
      const esc = px !== undefined;
      for (const [sx, sz] of SAMPLES)
        if (baseGround(x + sx * r, z + sz * r) > y + step && !(esc && baseGround(px + sx * r, pz + sz * r) > y + step)) return true;
      for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++)
        for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++) {
          const list = hash.get(cx * 1000 + cz);
          if (!list) continue;
          for (const s of list) {
            if (s.off || !(x + r > s.x0 && x - r < s.x1 && z + r > s.z0 && z - r < s.z1 && s.y1 > y + step && s.y0 < y + h)) continue;
            if (esc && px + r > s.x0 && px - r < s.x1 && pz + r > s.z0 && pz - r < s.z1) {
              const mx = (s.x0 + s.x1) / 2, mz = (s.z0 + s.z1) / 2, hx = (s.x1 - s.x0) / 2, hz = (s.z1 - s.z0) / 2;
              if (Math.max(Math.abs(x - mx) - hx, Math.abs(z - mz) - hz) >= Math.max(Math.abs(px - mx) - hx, Math.abs(pz - mz) - hz)) continue;
            }
            return true;
          }
        }
      return false;
    },
    // the river runs one way: along the snack bar, into the tunnel, round two corners, and stops
    currentAt(x, z, out) {
      out.x = out.z = 0;
      const v = 2.2 * this.currentScale;
      if (this.drain && z > 55.6 && x > 32 && x < 42) {
        // the open drain pulls everything in the tunnel toward the hole
        if (z < 58) (out.x = Math.max(-1.9, Math.min(1.9, (36.5 - x) * 1.4))), (out.z = Math.abs(x - 36.5) < 0.8 ? 1.7 : (57 - z) * 0.6);
        else if (z < 60.5) (out.z = 1.7), (out.x = (36.5 - x) * 1.5);
      } else if (x > 47 && x < 49.4 && z > 46 && z < 55.6) (out.z = v), (out.x = (48.2 - x) * 0.6);
      else if (z > 55.6 && z < 58 && x > 32.5 && x < 49.4) (out.x = -v * Math.min(1, (x - 32.5) / 3)), (out.z = (56.8 - z) * 0.6);
      else if (z > 45.4 && z < 48.4 && x > 35 && x <= 47) (out.x = v), (out.z = ((x > 43 ? 47.2 : 46.9) - z) * 0.6);
      else if (x > 35 && x < 38 && z > 39.5 && z <= 45.4) (out.z = v), (out.x = (36.5 - x) * 0.6);
      else if (z > 39.5 && z < 42.5 && x > 29 && x <= 35) (out.x = v * Math.min(1, (x - 29) / 2.5)), (out.z = (41 - z) * 0.6);
      return out;
    },
    // places it never goes: the pool by the glass, and the warm room
    noThing(x, z) {
      const r = roomAt(x, z);
      return !r || r.zone === Z.TERR || r.zone === Z.KIDS || r.zone >= Z.MAZE;
    },
    isWet(x, z) {
      if (this.noThing(x, z)) return false;
      return this.level - this.groundAt(x, z, this.level + 0.05, 0.02) > 0.03;
    },
  };
  world.loaded = Promise.allSettled(loads);
  return world;
}


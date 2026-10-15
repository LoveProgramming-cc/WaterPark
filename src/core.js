// What every other part of the level shares: the renderer and post-processing, the lighting zones, the world, the player,
// the thing, the state object `S`, timers, and the list of things that can be interacted with.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildWorld, HALL, WAVE, PASSAGE, GLASS, WATER0, Z, NZ, LONG_ZONES, zoneId } from './world.js';
import { createWater } from './water.js';
import { Player, Input } from './player.js';
import { Thing } from './thing.js';
import { sfx } from './sfx.js';

// ---------------- renderer ----------------
export const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.64;
document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color();
export const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 300);
camera.rotation.order = 'YXZ';

// ---------------- lighting zones ----------------
export const ZK = 2, ZW = HALL.x1 * ZK, ZH = HALL.z1 * ZK;
export const zoneIds = new Int8Array(ZW * ZH);
for (let z = 0; z < ZH; z++) for (let x = 0; x < ZW; x++) zoneIds[z * ZW + x] = zoneId((x + 0.5) / ZK, (z + 0.5) / ZK);
export const zoneLevel = new Float32Array(NZ).fill(1), zoneTarget = new Float32Array(NZ).fill(1);
for (const [k, v] of [[Z.TUN, 0.5], [Z.TERR, 0.55], [Z.PUMP, 0.9], [Z.BACK, 0.9], [Z.CCTV, 0.75], [Z.MAZE, 0.62], [Z.MN, 0.1], [Z.MW, 0.1], [Z.ME, 0.1], ...LONG_ZONES.map((z) => [z, 0.6])]) zoneLevel[k] = zoneTarget[k] = v;
// lamps that cannot make up their minds: zoneFl is the multiplier this instant, flAmp how often a zone stutters
export const zoneFl = new Float32Array(NZ).fill(1), flAmp = new Float32Array(NZ), flT = new Float32Array(NZ);
export const DIM = 0.2;
export const zonePix = new Uint8Array(ZW * ZH);
export const zoneTex = new THREE.DataTexture(zonePix, ZW, ZH, THREE.RedFormat);
zoneTex.magFilter = zoneTex.minFilter = THREE.LinearFilter;
export function bakeZones() {
  for (let z = 0; z < ZH; z++)
    for (let x = 0; x < ZW; x++) {
      let s = 0, n = 0;
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, zz = z + dz;
          if (xx < 0 || xx >= ZW || zz < 0 || zz >= ZH) continue;
          const id = zoneIds[zz * ZW + xx];
          if (id >= 0) (s += zoneLevel[id] * zoneFl[id]), n++;
        }
      zonePix[z * ZW + x] = n ? (s / n) * 255 : 0;
    }
  zoneTex.needsUpdate = true;
}
bakeZones();

export const G = {
  uZone: { value: zoneTex }, uHall: { value: new THREE.Vector4(0, 0, 1 / HALL.x1, 1 / HALL.z1) }, uWaterY: { value: WATER0 },
  uTime: { value: 0 }, uFogCol: { value: new THREE.Color(0.36, 0.43, 0.41) }, uMist: { value: 0 }, uFogD: { value: 0.015 }, uCamZone: { value: 1 }, uDecay: { value: 0 },
  uTorch: { value: 0 }, uTorchPos: { value: new THREE.Vector3() }, uTorchDir: { value: new THREE.Vector3(0, 0, -1) },
};
export const FOG_AIR = new THREE.Color(0.36, 0.43, 0.41), FOG_WATER = new THREE.Color(0.025, 0.19, 0.22), ZDARK = new THREE.Color(0.022, 0.03, 0.042);

// ---------------- world ----------------
export const world = buildWorld(scene, G);
export const water = createWater(renderer, scene, camera, G);
export const input = new Input(renderer.domElement);
export const player = new Player(world, input, camera);
export const thing = new Thing(world, scene);
player.on.step = (wet, hard) => sfx.step(wet, hard);
player.on.splash = (v) => sfx.splash(v);
player.on.gasp = () => sfx.gasp();

// ---------------- post ----------------
export const composer = new EffectComposer(renderer);
composer.addPass(water.pass);
export const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.85, 0.95);
composer.addPass(bloom);
export const trail = new AfterimagePass(0.5);
composer.addPass(trail);
composer.addPass(new OutputPass());
export const film = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, t: { value: 0 }, res: { value: new THREE.Vector2(1, 1) }, under: { value: 0 }, dark: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float t, under, dark; uniform vec2 res; varying vec2 vUv;
    float h(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    void main(){
      vec2 c = vUv - 0.5; float r2 = dot(c,c);
      vec2 uv = 0.5 + c * (0.962 + 0.07*r2);
      uv += under * 0.006 * vec2(sin(uv.y*17.0 + t*2.3), cos(uv.x*13.0 + t*1.9));
      uv.x += sin(uv.y*3.0 + t*0.35) * 0.0008;
      vec2 ca = c * (0.002 + 0.012*r2 + under*0.006);
      vec3 col = vec3(texture2D(tDiffuse, uv + ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - ca).b);
      vec2 px = 1.0 / res; float k = smoothstep(0.08, 0.5, r2) * 2.5 + under * 1.5;
      col = mix(col, 0.25*(texture2D(tDiffuse, uv+px*vec2(k,k)).rgb + texture2D(tDiffuse, uv+px*vec2(-k,k)).rgb + texture2D(tDiffuse, uv+px*vec2(k,-k)).rgb + texture2D(tDiffuse, uv+px*vec2(-k,-k)).rgb), 0.6*step(0.01,k));
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, 0.88);
      col = col*vec3(0.985,1.0,0.985) + vec3(0.012,0.018,0.018);
      col = mix(col, col*col*(3.0-2.0*col), 0.22);
      col *= 1.0 - (0.68 + 0.8*dark)*smoothstep(0.06 - 0.05*dark, 0.55 - 0.3*dark, r2);
      col *= 1.0 - 0.55*dark;
      col += (h(vUv*res*0.75 + fract(t)*91.7) - 0.5) * 0.07 * (1.15 - l);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
composer.addPass(film);
export function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  film.uniforms.res.value.set(w, h);
}
window.addEventListener('resize', resize);
resize();
// render resolution: starts at up to 1.25x and steps down when frames keep running long (big or external screens)
export const PR_MAX = Math.min(window.devicePixelRatio, 1.25);
export function setPR(pr) {
  renderer.setPixelRatio(pr);
  composer.setPixelRatio(pr);
  resize();
}

// ---------------- state ----------------
export const S = { phase: -1, t: 0, flags: {}, busy: false, finale: 0, pull: 0, pose: 0, catches: 0, streak: 0, wheel: false, long: false, gate: 0, nextGlimpse: 1e9, ride: null, climb: null, intro: null, p3: 0, dark: 0, beat: 0, wipes: 0, has: {}, freezeT: 0, lockT: 0, fogD: 0.015 };
export const timers = [];
export const after = (sec, fn) => timers.push({ at: S.t + sec, fn });
export const once = (k) => (S.flags[k] ? false : (S.flags[k] = true));


export const inter = [];
export const I = (o) => (inter.push({ r: 1.7, ...o }), inter[inter.length - 1]);


export const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
export const smooth = (x) => x * x * (3 - 2 * x);
export const P = world.P;
export const byKey = {};
export const at = (k, o) => (byKey[k] = I({ x: P[k][0], y: P[k][1], z: P[k][2], ...o }));
export const fwd = new THREE.Vector3(), tmp = new THREE.Vector3();

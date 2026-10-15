import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { HALL, WAVE } from './world.js';

const VERT = /* glsl */ `
uniform mat4 uTexMat; uniform float uTime, uWaveAmp; uniform vec4 uWaveRect;
varying vec3 vW; varying vec4 vRefl; varying float vWaveMask;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vRefl = uTexMat * w;
  float m = step(uWaveRect.x, w.x) * step(w.x, uWaveRect.y) * step(uWaveRect.z, w.z) * step(w.z, uWaveRect.w);
  float dz = (w.z - uWaveRect.z) / (uWaveRect.w - uWaveRect.z);
  w.y += m * uWaveAmp * (0.08 + 0.32 * dz) * sin(w.z * 0.55 + uTime * 1.9 + sin(w.x * 0.2) * 0.6);
  vWaveMask = m;
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tRefl, tScene, tDepth, uZone, uLM;
uniform vec2 uRes; uniform float uTime, uNear, uFar, uUnder, uFogD, uCamZone, uWaveAmp;
uniform vec4 uThing, uHall; uniform vec3 uFogCol; uniform float uDecay;
varying vec3 vW; varying vec4 vRefl; varying float vWaveMask;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float height(vec2 p, float t){
  return noise(p * 0.9 + vec2(t * 0.30, t * 0.18)) * 0.55
       + noise(p * 2.3 - vec2(t * 0.36, -t * 0.27)) * 0.28
       + noise(p * 5.7 + vec2(-t * 0.55, t * 0.45)) * 0.12
       ;
}
void main(){
  vec2 suv = gl_FragCoord.xy / uRes;
  float sd = texture2D(tDepth, suv).x;
  if (gl_FragCoord.z > sd) discard;

  vec3 toCam = cameraPosition - vW;
  float dist = length(toCam);
  vec3 V = toCam / dist;

  // surface normal from an animated height field; rougher where the machine is running
  float e = 0.07, t = uTime;
  float h0 = height(vW.xz, t), hx = height(vW.xz + vec2(e, 0.0), t), hz = height(vW.xz + vec2(0.0, e), t);
  float amp = 0.10 + 0.08 * vWaveMask * uWaveAmp;
  vec2 g = vec2(hx - h0, hz - h0) / e * amp;
  // something moving just under the surface pushes rings outward
  vec2 tv = vW.xz - uThing.xy; float td = length(tv);
  g += uThing.w * 0.5 * sin(td * 5.0 - t * 4.5) * exp(-td * 0.55) * tv / max(td, 0.001);
  // detail the eye cannot resolve at a distance only turns into sparkle: flatten it
  g *= 1.0 / (1.0 + dist * 0.16);
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

  vec2 zuv = (vW.xz - uHall.xy) * uHall.zw;
  float zl = texture2D(uZone, zuv).r;
  vec3 zdark = vec3(0.022, 0.03, 0.042);
  vec3 zc = mix(zdark, texture2D(uLM, zuv).rgb * 2.0, zl);

  float fz = perspectiveDepthToViewZ(gl_FragCoord.z, uNear, uFar);
  vec3 col;
  if (uUnder > 0.5) {
    // looking up through the surface
    vec3 above = texture2D(tScene, suv + n.xz * 0.07).rgb;
    float k = pow(1.0 - abs(V.y), 3.0);
    col = mix(above * vec3(0.75, 0.95, 0.95) + vec3(0.05, 0.16, 0.17) * zc, vec3(0.02, 0.10, 0.12) * zc, k);
    col += vec3(0.5, 0.7, 0.7) * zc * pow(max(n.x * 3.0 + 0.5, 0.0), 6.0) * 0.08;
  } else {
    float sz = perspectiveDepthToViewZ(sd, uNear, uFar);
    float th0 = max(fz - sz, 0.0);
    vec2 off = n.xz * 0.05 * clamp(th0 * 1.6, 0.0, 1.0) / (1.0 + dist * 0.12);
    float sd2 = texture2D(tDepth, suv + off).x;
    if (sd2 < gl_FragCoord.z) off = vec2(0.0);
    float th = max(fz - perspectiveDepthToViewZ(texture2D(tDepth, suv + off).x, uNear, uFar), 0.0);
    vec3 refr = texture2D(tScene, suv + off).rgb;
    // red goes first, then the rest; deep water turns the colour of old glass
    vec3 scat = mix(vec3(0.035, 0.27, 0.30), vec3(0.02, 0.36, 0.72), uDecay * (1.0 - step(65.6, vW.z))) * zc;
    col = refr * exp(-th * vec3(0.55, 0.13, 0.10)) + scat * (1.0 - exp(-th * 0.33));
    float dark = uThing.w * smoothstep(uThing.z, uThing.z * 0.2, td);
    col *= 1.0 - 0.93 * dark;
    vec2 ruv = vRefl.xy / vRefl.w + n.xz * 0.05, rp = 2.5 / uRes;
    vec3 refl = 0.25 * (texture2D(tRefl, ruv + rp).rgb + texture2D(tRefl, ruv - rp).rgb + texture2D(tRefl, ruv + vec2(rp.x, -rp.y)).rgb + texture2D(tRefl, ruv + vec2(-rp.x, rp.y)).rgb);
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(V, n), 0.0), 5.0);
    col = mix(col, refl, clamp(F, 0.0, 0.8) * (1.0 - 0.6 * dark));
    col += smoothstep(0.06, 0.0, th) * 0.07 * zc;
    float ff = 1.0 - exp(-dist * dist * uFogD * uFogD);
    col = mix(col, uFogCol * mix(zdark, vec3(1.0), 0.5 * (zl + uCamZone)), ff);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export function createWater(renderer, scene, camera, G) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const sceneRT = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(size.x, size.y) });
  const reflRT = new THREE.WebGLRenderTarget(size.x >> 1, size.y >> 1, { type: THREE.HalfFloatType });
  const texMat = new THREE.Matrix4();

  const W = HALL.x1 - HALL.x0, D = HALL.z1 - HALL.z0;
  const geo = new THREE.PlaneGeometry(W, D, W, D);
  geo.rotateX(-Math.PI / 2);
  geo.translate(W / 2, 0, D / 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
    uniforms: {
      ...G,
      tRefl: { value: reflRT.texture }, tScene: { value: sceneRT.texture }, tDepth: { value: sceneRT.depthTexture },
      uTexMat: { value: texMat }, uRes: { value: size.clone() }, uNear: { value: camera.near }, uFar: { value: camera.far },
      uUnder: { value: 0 }, uThing: { value: new THREE.Vector4(0, 0, 1.4, 0) },
      uWaveAmp: { value: 1 }, uWaveRect: { value: new THREE.Vector4(WAVE.x0, WAVE.x1, WAVE.z0, WAVE.z1) },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const waterScene = new THREE.Scene();
  waterScene.add(mesh);

  // planar reflection (same construction as three's Reflector, but for a scene the mesh is not part of)
  const vcam = new THREE.PerspectiveCamera();
  const plane = new THREE.Plane(), nrm = new THREE.Vector3(0, 1, 0), rp = new THREE.Vector3(), cp = new THREE.Vector3();
  const rot = new THREE.Matrix4(), look = new THREE.Vector3(), view = new THREE.Vector3(), target = new THREE.Vector3();
  const clip = new THREE.Vector4(), q = new THREE.Vector4();
  function renderReflection() {
    rp.set(0, mesh.position.y, 0);
    cp.setFromMatrixPosition(camera.matrixWorld);
    view.subVectors(rp, cp);
    if (view.dot(nrm) > 0) return;
    view.reflect(nrm).negate().add(rp);
    rot.extractRotation(camera.matrixWorld);
    look.set(0, 0, -1).applyMatrix4(rot).add(cp);
    target.subVectors(rp, look).reflect(nrm).negate().add(rp);
    vcam.position.copy(view);
    vcam.up.set(0, 1, 0).applyMatrix4(rot).reflect(nrm);
    vcam.lookAt(target);
    vcam.far = camera.far;
    vcam.updateMatrixWorld();
    vcam.projectionMatrix.copy(camera.projectionMatrix);
    texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    texMat.multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
    plane.setFromNormalAndCoplanarPoint(nrm, rp).applyMatrix4(vcam.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const pm = vcam.projectionMatrix.elements;
    q.x = (Math.sign(clip.x) + pm[8]) / pm[0];
    q.y = (Math.sign(clip.y) + pm[9]) / pm[5];
    q.z = -1;
    q.w = (1 + pm[10]) / pm[14];
    clip.multiplyScalar(2 / clip.dot(q));
    pm[2] = clip.x;
    pm[6] = clip.y;
    pm[10] = clip.z + 1 - 0.003;
    pm[14] = clip.w;
    renderer.setRenderTarget(reflRT);
    renderer.clear();
    renderer.render(scene, vcam);
  }

  const copy = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { t: { value: sceneRT.texture } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }',
  }));

  class WorldPass extends Pass {
    constructor() {
      super();
      this.needsSwap = false;
    }
    setSize() {
      const s = renderer.getDrawingBufferSize(new THREE.Vector2());
      sceneRT.setSize(s.x, s.y);
      reflRT.setSize(s.x >> 1, s.y >> 1);
      mat.uniforms.uRes.value.copy(s);
    }
    render(r, writeBuffer, readBuffer) {
      const ac = r.autoClear;
      r.autoClear = true;
      renderReflection();
      r.setRenderTarget(sceneRT);
      r.render(scene, camera);
      r.setRenderTarget(readBuffer);
      copy.render(r);
      r.autoClear = false;
      r.render(waterScene, camera);
      r.autoClear = ac;
    }
  }

  return {
    mesh, uniforms: mat.uniforms, pass: new WorldPass(),
    setLevel(y) {
      mesh.position.y = y;
    },
  };
}

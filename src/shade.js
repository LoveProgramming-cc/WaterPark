// Lighting zones, baked light, decay, fog and underwater caustics: injected into every material.
const FRAG_HEAD = /* glsl */ `
varying vec3 vWPos; varying float vUp;
uniform sampler2D uZone, uLM; uniform vec4 uHall; uniform float uWaterY, uTime, uFogD, uCamZone, uDecay, uTorch, uMist; uniform vec3 uFogCol, uTorchPos, uTorchDir;
float wpCaustic(vec2 uv, float t){
  vec2 p = mod(uv * 1.7, 6.28318) - 250.0; vec2 i = p; float c = 1.0;
  for (int n = 0; n < 4; n++) {
    float tt = t * 0.5 * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.005), p.y / (cos(i.y + tt) / 0.005)));
  }
  c = 1.17 - pow(c / 4.0, 1.4);
  return pow(abs(c), 8.0);
}`;
const FRAG_BODY = /* glsl */ `
{
  vec2 zuv = (vWPos.xz - uHall.xy) * uHall.zw;
  float zl = texture2D(uZone, zuv).r;
  vec4 lm = texture2D(uLM, zuv);
  vec3 zdark = vec3(0.022, 0.03, 0.042);
  #ifdef NO_ZONE
    vec3 zc = vec3(1.0);
  #else
    vec3 zc = mix(zdark, lm.rgb * 2.0, zl) * mix(1.0, lm.a, vUp);
    // the lamps hang low: above head height the light gives out, and the roof is in the dark
    zc *= mix(1.0, 0.22, smoothstep(2.6, 6.2, vWPos.y));
  #endif
  outgoingLight *= zc;
  #ifndef NO_ZONE
  // the park ages as the dream goes on: algae creeping up from the waterline, run-off down the walls. Never in the warm room.
  float dk = uDecay * (1.0 - step(65.6, vWPos.z) * step(28.0, vWPos.x));
  if (dk > 0.0) {
    vec2 q = vWPos.xz * 0.9 + vWPos.y * 0.7;
    float nz = sin(q.x * 1.7 + sin(q.y * 2.3)) * sin(q.y * 1.3 + sin(q.x * 1.9)) * 0.5 + 0.5;
    float low = 1.0 - smoothstep(0.0, 1.7, vWPos.y - uWaterY);
    float m = dk * clamp(nz * 0.9 + low * 0.9 - 0.4, 0.0, 1.0);
    outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.4, 0.6, 0.32) + vec3(0.0, 0.01, 0.004) * zl, m);
    float st = step(0.9, fract(sin(floor((vWPos.x + vWPos.z) * 3.0) * 91.7) * 43758.5)) * (1.0 - vUp);
    outgoingLight *= 1.0 - dk * 0.5 * st * smoothstep(3.2, 0.4, vWPos.y);
  }
  #endif
  // the toy torch: a small warm cone from the eyes, weak, and it does not reach far
  if (uTorch > 0.0) {
    vec3 tv = vWPos - uTorchPos; float td = length(tv) + 1e-4;
    float c = dot(tv / td, uTorchDir), cone = smoothstep(0.8, 0.985, c) * 0.8 + smoothstep(0.6, 0.85, c) * 0.2;
    outgoingLight += diffuseColor.rgb * vec3(1.0, 0.88, 0.66) * (uTorch * cone * 0.5 / (1.0 + td * td * 0.2));
  }
  float cd = uWaterY - vWPos.y;
  if (cd > 0.0) {
    outgoingLight += diffuseColor.rgb * wpCaustic(vWPos.xz + vWPos.y * 0.6, uTime) * zl * lm.g * exp(-cd * 0.3) * smoothstep(0.0, 0.06, cd);
  }
  float fd = length(vWPos - cameraPosition);
  float ff = 1.0 - exp(-fd * fd * uFogD * uFogD);
  // mist lying on the water and the wet floor: thick low down, thin by head height, and it swallows the far side
  ff = max(ff, uMist * exp(-max(0.0, vWPos.y - uWaterY) * 0.8) * (1.0 - exp(-fd * 0.09)));
  outgoingLight = mix(outgoingLight, uFogCol * mix(zdark, vec3(1.0), 0.5 * (zl + uCamZone)) * mix(1.0, 0.3, smoothstep(2.4, 6.5, vWPos.y)), ff);
}`;
export function patch(mat, G, noZone = false) {
  mat.fog = false;
  const basic = !!mat.isMeshBasicMaterial;
  if (noZone) mat.defines = { ...(mat.defines || {}), NO_ZONE: '' };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, G);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying float vUp;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 wp_ = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp_ = instanceMatrix * wp_;
        #endif
        vWPos = (modelMatrix * wp_).xyz;
        vUp = ${basic ? '0.0' : 'max(0.0, (modelMatrix * vec4(objectNormal, 0.0)).y)'}; }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_HEAD)
      .replace('#include <opaque_fragment>', FRAG_BODY + '\n#include <opaque_fragment>');
  };
  return mat;
}

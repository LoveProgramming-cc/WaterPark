import * as THREE from 'three';
import * as T from './tex.js';
import { patch } from './shade.js';
import { mottled } from './maptex.js';


// Every surface material in the park, and which of them each kind of room is finished in.
export function makeMaterials(G) {
  // ---------------- materials ----------------
  const rel = T.tileRelief();
  const tileMat = (opts, size, extra = {}) =>
    new THREE.MeshStandardMaterial({
      map: T.rep(T.tileColor(opts), 1 / size), normalMap: T.rep(rel.normal, 1 / size), roughnessMap: T.rep(rel.rough, 1 / size),
      roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6), ...extra,
    });
  const std = (color, roughness = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const flat = (tex, size, roughness = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ map: T.rep(tex, 1 / size), roughness, ...extra });
  const M = {
    deck: tileMat({ tile: [222, 220, 208], vary: 5, grout: [160, 160, 150], seed: 4, grime: 0.9 }, 1.8),
    deckG: tileMat({ tile: [186, 194, 192], vary: 7, grout: [128, 136, 134], seed: 14, grime: 0.8 }, 0.8),
    wall: tileMat({ tile: [236, 239, 236], vary: 4, grout: [178, 184, 182], seed: 5 }, 1.2),
    mosaic: tileMat({ tile: [232, 238, 238], vary: 6, grout: [170, 180, 180], seed: 15, grime: 0.5 }, 0.6),
    pool: tileMat({ tile: [146, 204, 212], vary: 13, grout: [214, 228, 228], seed: 6, grime: 0.3 }, 0.8),
    cope: tileMat({ tile: [58, 108, 148], vary: 9, grout: [200, 208, 208], seed: 7, grime: 0.3 }, 1.2),
    mint: tileMat({ tile: [168, 208, 190], vary: 8, grout: [206, 218, 212], seed: 16, grime: 0.4 }, 1.2),
    coral: tileMat({ tile: [240, 178, 146], vary: 8, grout: [224, 214, 204], seed: 17, grime: 0.4 }, 1.2),
    yellow: tileMat({ tile: [240, 214, 130], vary: 9, grout: [232, 226, 206], seed: 18, grime: 0.3 }, 1.2),
    cream: tileMat({ tile: [228, 218, 192], vary: 6, grout: [176, 170, 152], seed: 19, grime: 0.5 }, 2.4),
    tunnel: tileMat({ tile: [120, 138, 140], vary: 10, grout: [70, 80, 80], seed: 9, grime: 1 }, 1.2),
    paint: flat(mottled('#e6e4d6', 31), 3.2, 0.9),
    green: flat(mottled('#6f9f88', 32, { dark: 0.1 }), 2.6, 0.5),
    terrazzo: flat(mottled('#b9b6aa', 33, { speck: 2600, blot: 20 }), 1.4, 0.45),
    concrete: flat(mottled('#8f928e', 34, { speck: 500, dark: 0.12 }), 3, 0.92),
    ceil: new THREE.MeshStandardMaterial({ map: T.rep(T.ceilTex(), 1 / 1.2), roughness: 0.95 }),
    ceilP: flat(mottled('#8d918c', 35, { dark: 0.2 }), 4, 0.95),
    panel: std('#222', 0.5, { emissive: '#f4fbff', emissiveIntensity: 2.4 }),
    panelW: std('#222', 0.5, { emissive: '#ffd9a0', emissiveIntensity: 2.4 }),
    panelOff: std('#8f9596', 0.5),
    day: std('#222', 0.5, { emissive: '#ffffff', emissiveIntensity: 5 }),
    frame: std('#cfd4d2', 0.4, { metalness: 0.3 }),
    plastic: std('#ecebe4', 0.42),
    steel: std('#aab3b5', 0.34, { metalness: 0.15 }),
    steelD: std('#59646a', 0.5, { metalness: 0.2 }),
    tread: std('#7d898c', 0.6, { metalness: 0.15 }),
    dark: std('#15191a', 0.8),
    wood: std('#c9a878', 0.6),
    lam: std('#e9e4d2', 0.45),
    partition: std('#b7d2d8', 0.4),
    red: std('#c8473d', 0.4),
    blue: std('#3f78a8', 0.45),
    yel: std('#e8c532', 0.38),
    org: std('#e8742a', 0.4),
    tank: std('#5d7f93', 0.45, { metalness: 0.1 }),
    pipeG: std('#6f8f7a', 0.5),
    locker: new THREE.MeshStandardMaterial({ map: T.rep(T.lockerTex(), 1 / 0.8, 1 / 1.9), roughness: 0.45, metalness: 0.2 }),
    mirror: std('#c3d2d4', 0.18, { metalness: 0.35 }),
    slide: new THREE.MeshStandardMaterial({ map: T.rep(T.tubeTex('#f0c22e'), 70, 1), roughness: 0.3, side: THREE.DoubleSide, emissive: '#7a5c10', emissiveIntensity: 0.6 }),
    warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.9, 1.0) }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.0, 1.8) }),
    exit: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.2, 0.7) }),
    awning: new THREE.MeshStandardMaterial({ map: T.rep(T.stripeTex('#c8473d', '#eeeadd'), 1), roughness: 0.8, side: THREE.DoubleSide }),
    glassTop: std('#cfe3e0', 0.1, { transparent: true, opacity: 0.22 }),
    // the slides that loop through the halls overhead, lit by whatever lamps are still on
    tubeR: new THREE.MeshStandardMaterial({ map: T.rep(T.tubeTex('#c43a2e'), 40, 1), roughness: 0.3 }),
    tubeG: new THREE.MeshStandardMaterial({ map: T.rep(T.tubeTex('#58a04a'), 40, 1), roughness: 0.3 }),
    tubeB: new THREE.MeshStandardMaterial({ map: T.rep(T.tubeTex('#3a6fb8'), 40, 1), roughness: 0.3 }),
  };
  for (const k in M) patch(M[k], G, k === 'warm' || k === 'glow' || k === 'exit' || k === 'slide');
  const STYLE = {
    wave: { dado: 'cope', dh: 1.5, up: 'wall', trim: 'frame', floor: 'deck', ceil: 'ceilP' },
    lock: { dado: 'mint', dh: 1.4, up: 'wall', trim: 'frame', floor: 'deckG', ceil: 'ceil', skirt: 'steelD' },
    show: { dado: 'mosaic', dh: 1.6, up: 'mosaic', trim: 'cope', floor: 'deckG', ceil: 'ceilP' },
    wet: { dado: 'pool', dh: 1.3, up: 'mosaic', trim: 'cope', floor: 'pool', ceil: 'ceilP' },
    slide: { dado: 'yellow', dh: 1.5, up: 'wall', trim: 'frame', floor: 'deck', ceil: 'ceilP' },
    lobby: { dado: 'cream', dh: 1.2, up: 'paint', trim: 'wood', floor: 'terrazzo', ceil: 'ceil', skirt: 'steelD' },
    snack: { dado: 'coral', dh: 1.2, up: 'wall', trim: 'frame', floor: 'deck', ceil: 'ceil' },
    corr: { dado: 'green', dh: 1.25, up: 'paint', trim: 'steelD', floor: 'terrazzo', ceil: 'ceilP', skirt: 'steelD' },
    tun: { dado: 'tunnel', dh: 9, up: 'tunnel', floor: 'tunnel', ceil: 'tunnel' },
    pump: { dado: 'concrete', dh: 9, up: 'concrete', floor: 'concrete', ceil: 'concrete' },
    terr: { dado: 'wall', dh: 1.2, up: 'wall', trim: 'cope', floor: 'deck', ceil: 'ceilP' },
    kids: { dado: 'yellow', dh: 1.0, up: 'wall', trim: 'coral', floor: 'deck', ceil: 'ceilP' },
    kback: { dado: 'coral', dh: 1.0, up: 'wall', trim: 'yellow', floor: 'deckG', ceil: 'ceilP', skirt: 'steelD' },
  };

  return { M, STYLE };
}

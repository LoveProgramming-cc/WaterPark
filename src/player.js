import * as THREE from 'three';
import { inRiver } from './world.js';

const R = 0.25, H_WALK = 1.15, H_SWIM = 0.5, EYE_WALK = 1.05, EYE_SWIM = 0.35, FLOAT = 0.1;
const clamp = THREE.MathUtils.clamp;

export class Input {
  constructor(el) {
    this.keys = {};
    this.edge = {};
    this.locked = false;
    this.drag = false;
    this.mouseDown = false;
    this.dx = 0;
    this.dy = 0;
    this.el = el;
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this.edge[e.code] = true;
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => (this.keys[e.code] = false));
    window.addEventListener('blur', () => (this.keys = {}));
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) (this.mouseDown = true), (this.edge.Mouse = true);
    });
    document.addEventListener('mouseup', () => (this.mouseDown = false));
    document.addEventListener('mousemove', (e) => {
      if (!this.locked || (this.drag && !this.mouseDown)) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => {
      if (!this.drag) this.locked = document.pointerLockElement === el;
    });
    document.addEventListener('pointerlockerror', () => this.useDrag());
  }
  useDrag() {
    // embedded webviews refuse pointer lock: hold the button and drag instead
    this.drag = this.locked = true;
  }
  capture() {
    if (this.drag) return;
    try {
      const p = this.el.requestPointerLock();
      if (p && p.catch) p.catch(() => this.useDrag());
    } catch {
      this.useDrag();
    }
  }
  hit(code) {
    const v = this.edge[code];
    this.edge[code] = false;
    return !!v;
  }
  endFrame() {
    this.dx = this.dy = 0;
    this.edge = {};
  }
}

export class Player {
  constructor(world, input, camera) {
    Object.assign(this, { world, input, camera });
    this.pos = new THREE.Vector3(23, 0, 50);
    this.vel = new THREE.Vector3();
    this.yaw = this.tyaw = 0;
    this.pitch = this.tpitch = 0;
    this.mode = 'walk'; // walk | swim | script
    this.eyeH = EYE_WALK;
    this.grounded = true;
    this.under = false;
    this.breath = 1;
    this.depth = 0;
    this.hasRing = false;
    this.lungs = 1;
    this.forcedUnder = false;
    this.freeze = false;
    this.bob = 0;
    this.stepN = 0;
    this.roll = 0;
    this.camY = 0;
    this.on = {}; // callbacks: step(wet), splash(v), gasp()
    this._cur = { x: 0, z: 0 };
    this._wasWet = false;
  }
  get eye() {
    return this.camY + this.eyeH;
  }
  look(dt) {
    const i = this.input;
    this.tyaw -= i.dx * 0.0021;
    this.tpitch = clamp(this.tpitch - i.dy * 0.0021, -1.35, 1.35);
    const e = 1 - Math.exp(-dt * 22);
    this.yaw += (this.tyaw - this.yaw) * e;
    this.pitch += (this.tpitch - this.pitch) * e;
  }
  face(yaw, pitch = 0) {
    this.yaw = this.tyaw = yaw;
    this.pitch = this.tpitch = pitch;
  }
  teleport(x, y, z) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
  }
  tryMove(dx, dz, h, step) {
    const w = this.world, p = this.pos;
    if (dx && !w.blocked(p.x + dx, p.z, p.y, h, step, R, p.x, p.z)) p.x += dx;
    else if (dx) this.vel.x = 0;
    if (dz && !w.blocked(p.x, p.z + dz, p.y, h, step, R, p.x, p.z)) p.z += dz;
    else if (dz) this.vel.z = 0;
  }
  update(dt, t) {
    this.look(dt);
    const w = this.world, p = this.pos, v = this.vel, k = this.input.keys;
    if (this.mode !== 'script') {
      let f = 0, s = 0;
      if (this.input.locked && !this.freeze) {
        f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
        s = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      }
      const n = Math.hypot(f, s) || 1, sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      const surf = w.surfaceAt(p.x, p.z, t);
      const gBase = w.groundAt(p.x, p.z, p.y, 0.32);
      this.depth = surf - gBase;

      if (this.mode === 'walk' && this.depth > 0.95 && p.y < surf - 0.5) this.setMode('swim');
      else if (this.mode === 'walk' && this.depth > 0.95 && !this.grounded && v.y < 0 && p.y < surf + 0.2) this.setMode('swim');
      else if (this.mode === 'swim' && this.depth < 0.8 && !this.forcedUnder) this.setMode('walk');

      if (this.mode === 'walk') {
        const wade = clamp(this.depth / 0.9, 0, 1);
        const sp = (k.ShiftLeft || k.ShiftRight ? 3.7 : 2.0) * (1 - 0.55 * wade) * (this.depth > 0.02 ? 0.88 : 1);
        const wx = ((-sin * f + cos * s) / n) * sp, wz = ((-cos * f - sin * s) / n) * sp;
        const a = 1 - Math.exp(-dt * (this.grounded ? 11 : 2.5));
        v.x += (wx - v.x) * a;
        v.z += (wz - v.z) * a;
        // a jump pressed a moment after running off an edge still counts
        this.coyote = this.grounded ? 0.16 : (this.coyote || 0) - dt;
        if ((this.grounded || (this.coyote > 0 && v.y <= 0)) && this.input.hit('Space') && wade < 0.6 && !this.freeze) {
          v.y = 3.3;
          this.grounded = false;
          this.coyote = 0;
        }
        this.tryMove(v.x * dt, 0, H_WALK, this.grounded ? 0.32 : 0.1);
        this.tryMove(0, v.z * dt, H_WALK, this.grounded ? 0.32 : 0.1);
        if (this.grounded) {
          // glued to the floor: steps and kerbs are taken instantly, the camera smooths them out
          const g = w.groundAt(p.x, p.z, p.y, 0.34);
          if (g >= p.y - 0.4) p.y = g;
          else this.grounded = false;
          v.y = Math.max(v.y, 0);
          if (v.y > 0) this.grounded = false;
        }
        if (!this.grounded) {
          v.y -= 11 * dt;
          p.y += v.y * dt;
          const g = w.groundAt(p.x, p.z, p.y, 0.06);
          if (p.y <= g && v.y <= 0) {
            if (v.y < -2.5) this.on.step?.(this.depth > 0.02, true);
            p.y = g;
            v.y = 0;
            this.grounded = true;
          }
        }
        const hv = Math.hypot(v.x, v.z);
        this.bob += hv * dt * (3.6 + 0.5 * hv);
        if (this.grounded && hv > 0.5 && Math.floor(this.bob / Math.PI) !== this.stepN) {
          this.stepN = Math.floor(this.bob / Math.PI);
          this.on.step?.(this.depth > 0.02, false);
        }
        this.under = false;
      } else {
        // swimming
        const dive = (((k.KeyC || k.ControlLeft) && this.breath > 0) || this.forcedUnder) && !this.freeze;
        const cur = w.currentAt(p.x, p.z, this._cur);
        const sp = this.under ? 2.6 : 1.5;
        let wx = ((-sin * f + cos * s) / n) * sp, wz = ((-cos * f - sin * s) / n) * sp, wy = 0;
        if (dive) {
          const cp = Math.cos(this.pitch);
          wx = ((-sin * f * cp + cos * s) / n) * sp;
          wz = ((-cos * f * cp - sin * s) / n) * sp;
          wy = f ? Math.sin(this.pitch) * f * sp : -0.7;
          if (!f && this.forcedUnder) wy = 0;
        }
        // waves shove you toward the beach
        const wh = w.waveH(p.x, p.z, t);
        if (wh !== 0) wz -= 0.5 * w.waveAmp;
        const a = 1 - Math.exp(-dt * 4);
        v.x += (wx + cur.x - v.x) * a;
        v.z += (wz + cur.z - v.z) * a;
        const before = p.x * p.x + p.z * p.z;
        this.tryMove(v.x * dt, 0, H_SWIM, 0.12);
        this.tryMove(0, v.z * dt, H_SWIM, 0.12);
        const top = surf - (this.forcedUnder ? 0.95 : this.hasRing ? 0.02 : FLOAT);
        if (dive) {
          let ny = clamp(p.y + wy * dt, gBase, top);
          // duck under a lintel instead of bumping along it
          if (f && before === p.x * p.x + p.z * p.z && p.y > gBase + 0.02) ny = Math.max(gBase, p.y - 1.6 * dt);
          if (!w.blocked(p.x, p.z, ny, H_SWIM, 0.02, R * 0.8) || ny < p.y) p.y = ny;
        } else p.y += (top - p.y) * Math.min(1, dt * 3.2);
        p.y = Math.max(p.y, gBase);
        v.y = 0;
        this.grounded = false;
        const wasUnder = this.under;
        this.under = p.y + EYE_SWIM < surf - 0.03;
        if (wasUnder && !this.under) this.on.gasp?.();
        if (!wasUnder && this.under) this.on.splash?.(0.3);
        this.bob += dt * 2.2;
      }
      this.breath = clamp(this.breath + (this.under ? -dt / (14 * this.lungs) : dt / 2.5), 0, 1);
      const wet = this.depth > 0.4;
      if (wet && !this._wasWet && this.mode === 'swim') this.on.splash?.(1);
      this._wasWet = wet;
    }
    this.eyeH += ((this.mode === 'swim' ? EYE_SWIM : EYE_WALK) - this.eyeH) * Math.min(1, dt * 5);
    if (Math.abs(p.y - this.camY) > 0.6 || this.mode === 'script') this.camY = p.y;
    else this.camY += (p.y - this.camY) * Math.min(1, dt * 13);
    this.apply(t);
  }
  setMode(m) {
    if (this.mode === m) return;
    if (m === 'swim') this.on.splash?.(Math.min(1, Math.abs(this.vel.y) / 4 + 0.35));
    this.mode = m;
    if (m === 'walk') this.grounded = false;
  }
  apply(t) {
    const c = this.camera, p = this.pos;
    const hv = Math.hypot(this.vel.x, this.vel.z);
    let bx = 0, by = 0, roll = 0;
    if (this.mode === 'walk' && this.grounded) {
      const amp = Math.min(hv / 2, 1.5);
      bx = Math.cos(this.bob) * 0.011 * amp;
      by = Math.abs(Math.sin(this.bob)) * 0.03 * amp;
      roll = Math.cos(this.bob) * 0.004 * amp;
    } else if (this.mode === 'swim') {
      by = Math.sin(this.bob) * 0.025;
      roll = Math.sin(this.bob * 0.7) * 0.02;
    }
    c.position.set(p.x + bx, this.camY + this.eyeH + by, p.z);
    c.rotation.set(this.pitch + Math.sin(t * 0.41) * 0.003, this.yaw + Math.sin(t * 0.27) * 0.004, roll + this.roll + Math.sin(t * 0.33) * 0.005);
  }
  inRiver() {
    return inRiver(this.pos.x, this.pos.z);
  }
}

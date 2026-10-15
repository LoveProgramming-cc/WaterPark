import * as THREE from 'three';
import { baseGround } from './world.js';
import { D } from './i18n.js';

const STEP = [[1, 1], [1, 0], [0, 1]];
import { scribbleFrames } from './tex.js';

// Whatever is under the water. Mostly it is a darker patch that is always in the pool nearest to you.
export class Thing {
  constructor(world, scene) {
    this.world = world;
    this.x = 15;
    this.z = 55;
    this.strength = 0;
    this.want = 0;
    this.mode = 'off'; // off | lurk | hunt | chase
    this.passive = false;
    this.gaze = 0;
    this.hide = 0;
    this.think = 0;
    this.react = 0;
    this.dry = 0;
    this.speed = 0;
    this.tx = this.x;
    this.tz = this.z;
    this.onCatch = null;
    this.walkSpeed = 2.2;
    this.pin = null;
    this.frames = scribbleFrames();
    this.mat = new THREE.MeshBasicMaterial({ map: this.frames[0], transparent: true, depthWrite: false, fog: false, color: new THREE.Color(0.8, 0.8, 0.78) });
    this.body = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.25), this.mat);
    this.body.visible = false;
    this.body.renderOrder = 9;
    scene.add(this.body);
    this.y = -2;
    this.frameT = 0;
  }
  deepNear(px, pz) {
    // closest spot of real water to the player
    let best = null, bd = 1e9;
    for (const r of [2.5, 4, 6, 9, 13, 18])
      for (let a = 0; a < 6.283; a += 0.45) {
        const x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r;
        if (this.world.noThing(x, z)) continue;
        if (this.world.level - baseGround(x, z) > 0.6 && r < bd) (bd = r), (best = [x, z]);
      }
    return best;
  }
  place(x, z) {
    this.x = this.tx = x;
    this.z = this.tz = z;
  }
  moveToward(tx, tz, d, wetOnly) {
    const dx = tx - this.x, dz = tz - this.z, l = Math.hypot(dx, dz);
    if (l < 0.001) return;
    const sx = (dx / l) * Math.min(d, l), sz = (dz / l) * Math.min(d, l);
    if (!wetOnly || this.world.isWet(this.x + sx, this.z + sz)) (this.x += sx), (this.z += sz);
    else if (this.world.isWet(this.x + Math.sign(sx) * d, this.z)) this.x += Math.sign(sx) * d;
    else if (this.world.isWet(this.x, this.z + Math.sign(sz) * d)) this.z += Math.sign(sz) * d;
  }
  update(dt, t, player, camera) {
    const p = player.pos, w = this.world;
    const dist = Math.hypot(p.x - this.x, p.z - this.z);
    const playerWet = player.mode !== 'script' && player.depth > 0.03 && (player.mode === 'swim' || player.grounded);

    if (this.mode === 'lurk') {
      this.think -= dt;
      if (this.hide > 0) {
        this.hide -= dt;
        this.want = 0;
      } else if (player.depth > 0.45 && !this.passive) {
        // you are in its water
        this.want = 1;
        this.tx = p.x;
        this.tz = p.z;
        if (this.strength < 0.05 && dist > 16) {
          const s = this.deepNear(p.x - Math.sin(player.yaw) * -9, p.z - Math.cos(player.yaw) * -9);
          if (s) this.place(s[0], s[1]);
        }
        this.moveToward(p.x, p.z, 1.25 * dt, true);
        if (dist < 0.8) this.onCatch?.();
      } else {
        if (this.think <= 0) {
          this.think = 0.6;
          const s = this.deepNear(p.x, p.z);
          if (s) {
            if (Math.hypot(s[0] - this.x, s[1] - this.z) > 14 && this.strength < 0.1) this.place(s[0], s[1]);
            this.tx = s[0];
            this.tz = s[1];
            this.want = 0.85;
          } else this.want = 0;
        }
        this.moveToward(this.tx, this.tz, 1.5 * dt, false);
        // it does not like being looked at
        const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
        const facing = dist > 0.5 ? ((this.x - p.x) * fx + (this.z - p.z) * fz) / dist : 0;
        if (facing > 0.95 && dist < 28 && this.strength > 0.4) this.gaze += dt;
        else this.gaze = Math.max(0, this.gaze - dt * 0.5);
        if (this.gaze > 1.1) {
          this.hide = 5 + Math.random() * 5;
          this.gaze = 0;
        }
      }
    } else if (this.mode === 'hunt') {
      this.want = this.lost ? 0.15 : 1;
      if (this.stalk) {
        // the wave pool at closing time: main.js moves it
        this.react = 0;
        this.speed = 0;
      } else if (playerWet && !this.passive) {
        this.dry = 0;
        this.react += dt;
        if (dist > 34 || this.lost) {
          this.lost = false;
          // come up somewhere behind them instead of crossing the whole park
          const bx = p.x + Math.sin(player.yaw) * 13, bz = p.z + Math.cos(player.yaw) * 13;
          let best = null, bd = 1e9;
          for (let a = 0; a < 6.283; a += 0.4)
            for (const r of [0, 3, 6]) {
              const x = bx + Math.cos(a) * r, z = bz + Math.sin(a) * r;
              const d = Math.hypot(x - p.x, z - p.z);
              if (w.isWet(x, z) && d > 9 && r < bd) (bd = r), (best = [x, z]);
            }
          if (best) this.place(best[0], best[1]);
        }
        if (this.react > D().react) {
          const deep = w.level - baseGround(this.x, this.z) > 0.5;
          this.speed += ((deep ? 3.0 : 3.3) * D().hunt - this.speed) * Math.min(1, dt * 2.2);
          this.moveToward(p.x, p.z, this.speed * dt, true);
          if (dist < 0.75) this.onCatch?.();
        }
      } else {
        this.react = 0;
        this.speed *= 1 - Math.min(1, dt * 3);
        this.dry += dt;
        // out of the water for a moment and it loses you: it has to come up again from somewhere behind
        if (this.dry > D().lose) this.lost = true;
        if (this.passive && dist > 1.6) {
          // circles the legs of someone standing still for the camera
          const a = t * 0.9;
          this.moveToward(p.x + Math.cos(a) * 1.3, p.z + Math.sin(a) * 1.3, 1.6 * dt, true);
        } else if (this.dry > 3.5) {
          const s = this.deepNear(this.x, this.z);
          if (s) this.moveToward(s[0], s[1], 1.2 * dt, true);
        }
      }
    } else if (this.mode === 'walk') {
      // out of the water and on its feet. Furniture stops it; you can put a tank between you and it.
      this.want = 0;
      // under the strobe it only moves while you cannot see it
      const l = dist || 1, d = (this.hold ? 0 : this.walkSpeed) * dt, dx = ((p.x - this.x) / l) * d, dz = ((p.z - this.z) / l) * d, fy = baseGround(this.x, this.z);
      for (const [kx, kz] of STEP)
        if (!w.blocked(this.x + dx * kx, this.z + dz * kz, fy, 1.6, 0.3, 0.3, this.x, this.z)) {
          this.x += dx * kx;
          this.z += dz * kz;
          break;
        }
      this.y = fy + 1.08;
      this.body.visible = true;
      if (dist < 0.85) this.onCatch?.();
    } else if (this.mode === 'off') this.want = 0;
    if (this.mode === 'hunt' && !this.pin) {
      // when it is coming for you, you can see it: its head, to the eyes, above the water
      const show = (this.stalk || (playerWet && !this.passive && this.react > D().react)) && this.strength > 0.3 && w.isWet(this.x, this.z);
      this.body.visible = show;
      if (show) this.y = w.level - 0.52;
    }

    this.strength += (this.want - this.strength) * Math.min(1, dt * (this.want > this.strength ? 0.7 : 1.6));

    if (this.body.visible) {
      this.frameT -= dt;
      if (this.frameT <= 0) {
        this.frameT = 0.085;
        this.mat.map = this.frames[(Math.random() * this.frames.length) | 0];
      }
      if (this.pin) this.body.position.copy(this.pin);
      else this.body.position.set(this.x, this.y, this.z);
      this.body.rotation.y = Math.atan2(camera.position.x - this.body.position.x, camera.position.z - this.body.position.z);
    }
    return dist;
  }
}

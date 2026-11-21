// Guard: a patrolling archive warden with a visible vision cone and a
// suspicion meter that fills when the player is seen and drains when hidden.
// At full suspicion the guard chases; lose sight of the player and it
// searches the last seen spot, then walks back to its patrol.

import { TILE, isSolidTile } from './levels.js';
import { canSeePlayer, playerInShadow } from './vision.js';

export const GUARD_RADIUS = 14;
const CHASE_SPEED_MULT = 1.65;
const LOSE_SIGHT_AFTER = 2.5;
const SEARCH_SECONDS = 3.0;
const FILL_BASE = 52; // suspicion per second at point blank, standing in light
const DRAIN_RATE = 20; // suspicion per second while unseen

export class Guard {
  constructor(def) {
    this.path = def.path.map(([tx, ty]) => ({
      x: (tx + 0.5) * TILE,
      y: (ty + 0.5) * TILE,
    }));
    this.speed = def.speed;
    this.range = def.range;
    this.halfAngle = 0.62; // ~35 degrees each side of the facing
    this.pauseAtPoint = def.pause;
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.facing = 0;
    this.waypoint = 1 % this.path.length;
    this.pauseTimer = 0;
    this.state = 'patrol'; // patrol | investigate | chase | search | return
    this.suspicion = 0;
    this.lastSeen = null;
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.stepTimer = 0;
    this.alertedOnce = false; // so the sting plays once per chase
    this.facing = this.faceToward(this.path[this.waypoint]);
  }

  faceToward(p) {
    return Math.atan2(p.y - this.y, p.x - this.x);
  }

  reset() {
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.waypoint = 1 % this.path.length;
    this.pauseTimer = 0;
    this.state = 'patrol';
    this.suspicion = 0;
    this.lastSeen = null;
    this.loseSightTimer = 0;
    this.searchTimer = 0;
    this.alertedOnce = false;
    this.facing = this.faceToward(this.path[this.waypoint]);
  }

  // A thrown pebble: guards close enough walk over to look.
  hearNoise(px, py) {
    const d = Math.hypot(px - this.x, py - this.y);
    if (d > 300) return;
    if (this.state === 'chase') return; // a chasing guard ignores pebbles
    this.state = 'investigate';
    this.lastSeen = { x: px, y: py };
    this.suspicion = Math.max(this.suspicion, 45);
  }

  update(dt, player, world, onStep, onAlert) {
    const seen = canSeePlayer(world, this, player);
    if (seen.seen) {
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
      // Fill faster up close, in the light, and when the player runs.
      const closeness = 1 - (seen.dist / this.range) * 0.6;
      const shadow = playerInShadow(world, player) ? 0.35 : 1;
      const sneak = player.sneaking ? 0.5 : 1;
      const speed = player.moving ? (player.sneaking ? 0.9 : 1.2) : 0.8;
      this.suspicion = Math.min(
        100,
        this.suspicion + FILL_BASE * closeness * shadow * sneak * speed * dt,
      );
      if (this.suspicion >= 100 && this.state !== 'chase') {
        this.state = 'chase';
        if (!this.alertedOnce) {
          this.alertedOnce = true;
          if (onAlert) onAlert();
        }
      } else if (this.suspicion >= 55 && this.state === 'patrol') {
        this.state = 'investigate';
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - DRAIN_RATE * dt);
      if (this.state === 'chase') {
        this.loseSightTimer += dt;
        if (this.loseSightTimer >= LOSE_SIGHT_AFTER) {
          this.state = 'search';
          this.searchTimer = SEARCH_SECONDS;
        }
      } else if (this.state === 'investigate' && this.suspicion < 30) {
        this.state = 'return';
      }
    }

    if (this.state === 'patrol') this.patrol(dt);
    else if (this.state === 'investigate' || this.state === 'search') {
      this.walkToward(this.lastSeen, this.speed * 1.15, dt, world);
      if (this.lastSeen && Math.hypot(this.lastSeen.x - this.x, this.lastSeen.y - this.y) < 10) {
        if (this.state === 'search') {
          this.searchTimer -= dt;
          this.lookAround(dt);
          if (this.searchTimer <= 0) this.state = 'return';
        } else {
          this.state = 'return';
        }
      }
    } else if (this.state === 'chase') {
      this.walkToward({ x: player.x, y: player.y }, this.speed * CHASE_SPEED_MULT, dt, world);
    } else if (this.state === 'return') {
      const target = this.nearestWaypoint();
      this.walkToward(target, this.speed, dt, world);
      if (Math.hypot(target.x - this.x, target.y - this.y) < 8) {
        this.state = 'patrol';
        this.alertedOnce = false;
      }
    }

    // Footsteps while walking, so the player hears the patrol coming.
    const walking =
      this.state === 'patrol'
        ? this.pauseTimer <= 0
        : this.state === 'chase' || this.state === 'investigate' || this.state === 'return';
    if (walking) {
      const interval = this.state === 'chase' ? 0.3 : 0.48;
      this.stepTimer += dt;
      if (this.stepTimer >= interval) {
        this.stepTimer = 0;
        if (onStep) onStep(this.x - player.x, this.y - player.y);
      }
    }
  }

  patrol(dt) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      return;
    }
    const target = this.path[this.waypoint];
    const d = Math.hypot(target.x - this.x, target.y - this.y);
    if (d < 6) {
      this.waypoint = (this.waypoint + 1) % this.path.length;
      this.pauseTimer = this.pauseAtPoint;
      return;
    }
    const step = Math.min(d, this.speed * dt);
    this.x += ((target.x - this.x) / d) * step;
    this.y += ((target.y - this.y) / d) * step;
    this.facing = Math.atan2(target.y - this.y, target.x - this.x);
  }

  // Walk toward a point, sliding along walls (axis by axis, like the player).
  walkToward(target, speed, dt, world) {
    if (!target) return;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) return;
    const step = Math.min(d, speed * dt);
    const nx = (dx / d) * step;
    const ny = (dy / d) * step;
    if (this.canStand(this.x + nx, this.y, world)) this.x += nx;
    if (this.canStand(this.x, this.y + ny, world)) this.y += ny;
    this.facing = Math.atan2(dy, dx);
  }

  canStand(x, y, world) {
    const r = GUARD_RADIUS;
    const minTx = Math.floor((x - r) / TILE);
    const maxTx = Math.floor((x + r) / TILE);
    const minTy = Math.floor((y - r) / TILE);
    const maxTy = Math.floor((y + r) / TILE);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!isSolidTile(world, tx, ty)) continue;
        const cx = Math.max(tx * TILE, Math.min(x, (tx + 1) * TILE));
        const cy = Math.max(ty * TILE, Math.min(y, (ty + 1) * TILE));
        const ddx = x - cx;
        const ddy = y - cy;
        if (ddx * ddx + ddy * ddy < r * r) return false;
      }
    }
    return true;
  }

  // Slowly sweep the cone while searching a spot.
  lookAround(dt) {
    this.facing += dt * 1.6;
  }

  nearestWaypoint() {
    let best = this.path[0];
    let bestD = Infinity;
    for (const p of this.path) {
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    this.waypoint = this.path.indexOf(best);
    return best;
  }

  // Caught: the guard is on top of the player while fully alert.
  touchesPlayer(player) {
    return (
      this.suspicion >= 90 &&
      Math.hypot(player.x - this.x, player.y - this.y) < GUARD_RADIUS + 13
    );
  }
}

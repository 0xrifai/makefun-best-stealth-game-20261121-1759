// Player: Wren, the courier. Moves with WASD or arrows, Shift to sneak.
// Collision is a circle against solid tiles, resolved axis by axis so the
// player slides along walls instead of sticking to them.

import { TILE, isSolidTile } from './levels.js';

export const PLAYER_RADIUS = 13;
const WALK_SPEED = 132;
const SNEAK_SPEED = 72;

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.sneaking = false;
    this.moving = false;
    this.stepTimer = 0;
    this.stepInterval = 0.34;
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.sneaking = false;
    this.moving = false;
    this.stepTimer = 0;
  }

  // keys: {up, down, left, right, sneak}. Returns true when a footstep sounds.
  update(dt, keys, world, onStep) {
    let mx = 0;
    let my = 0;
    if (keys.left) mx -= 1;
    if (keys.right) mx += 1;
    if (keys.up) my -= 1;
    if (keys.down) my += 1;
    this.moving = mx !== 0 || my !== 0;
    this.sneaking = !!keys.sneak;
    if (!this.moving) return;
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const speed = this.sneaking ? SNEAK_SPEED : WALK_SPEED;
    this.moveAxis(mx * speed * dt, 0, world);
    this.moveAxis(0, my * speed * dt, world);
    // Footsteps: slower and quieter while sneaking.
    this.stepInterval = this.sneaking ? 0.52 : 0.34;
    this.stepTimer += dt;
    if (this.stepTimer >= this.stepInterval) {
      this.stepTimer = 0;
      if (onStep) onStep(this.sneaking);
    }
  }

  // Move along one axis, stopping at the first solid tile the circle touches.
  moveAxis(dx, dy, world) {
    const nx = this.x + dx;
    const ny = this.y + dy;
    const r = PLAYER_RADIUS;
    const minTx = Math.floor((nx - r) / TILE);
    const maxTx = Math.floor((nx + r) / TILE);
    const minTy = Math.floor((ny - r) / TILE);
    const maxTy = Math.floor((ny + r) / TILE);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!isSolidTile(world, tx, ty)) continue;
        const cx = Math.max(tx * TILE, Math.min(nx, (tx + 1) * TILE));
        const cy = Math.max(ty * TILE, Math.min(ny, (ty + 1) * TILE));
        const ddx = nx - cx;
        const ddy = ny - cy;
        if (ddx * ddx + ddy * ddy < r * r) return; // blocked on this axis
      }
    }
    this.x = nx;
    this.y = ny;
  }
}

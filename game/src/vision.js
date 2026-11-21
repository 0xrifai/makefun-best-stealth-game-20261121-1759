// Vision: line of sight and vision-cone tests for Shadowline.
// Walls and crates block sight; shadow patches do not block sight,
// they only make the player harder to notice (see guard.js).

import { TILE, isSolidTile } from './levels.js';

// True when no wall or crate lies between two points (sampled every 4 px).
export function hasLineOfSight(world, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (isSolidTile(world, tx, ty)) return false;
  }
  return true;
}

// True when the player sits inside the guard's vision cone and sight is clear.
// Returns an object so the caller can use the distance for fill-rate scaling.
export function canSeePlayer(world, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.range) return { seen: false, dist };
  if (dist < 26) {
    // Close enough to bump into: always spotted, cone or not.
    return { seen: hasLineOfSight(world, guard.x, guard.y, player.x, player.y), dist };
  }
  const toPlayer = Math.atan2(dy, dx);
  let diff = toPlayer - guard.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > guard.halfAngle) return { seen: false, dist };
  if (!hasLineOfSight(world, guard.x, guard.y, player.x, player.y)) return { seen: false, dist };
  return { seen: true, dist };
}

// True when the player's tile is a shadow patch.
export function playerInShadow(world, player) {
  const tx = Math.floor(player.x / TILE);
  const ty = Math.floor(player.y / TILE);
  return world.shadows.has(tx + ',' + ty);
}

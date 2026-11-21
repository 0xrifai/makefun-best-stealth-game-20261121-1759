// Render: every pixel of Shadowline is drawn on one canvas — floor tiles,
// walls, crates, shadow patches, vision cones, guards, the player, the HUD
// and the title / caught / level-clear screens. No images are loaded.

import { TILE, COLS, ROWS } from './levels.js';

const HUD_H = 64;
export const CANVAS_W = COLS * TILE; // 880
export const CANVAS_H = ROWS * TILE + HUD_H; // 680

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, world) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const x = tx * TILE;
      const y = HUD_H + ty * TILE;
      const key = tx + ',' + ty;
      if (world.walls.has(key)) {
        ctx.fillStyle = '#2b3245';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#39415a';
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = '#232839';
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
      } else {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? '#171c28' : '#151a25';
        ctx.fillRect(x, y, TILE, TILE);
        if (world.shadows.has(key)) {
          ctx.fillStyle = 'rgba(32, 96, 84, 0.55)';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(120, 220, 190, 0.25)';
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(x + 10 + i * 12, y + 12 + (i % 2) * 18, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (world.crates.has(key)) {
          ctx.fillStyle = '#6b4a26';
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.strokeStyle = '#8a6234';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + TILE - 4, y + TILE - 4);
          ctx.moveTo(x + TILE - 4, y + 4);
          ctx.lineTo(x + 4, y + TILE - 4);
          ctx.stroke();
        }
      }
    }
  }
}

function drawChips(ctx, chips) {
  for (const chip of chips) {
    if (chip.taken) continue;
    const y = HUD_H + chip.y;
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 280);
    ctx.save();
    ctx.translate(chip.x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = `rgba(255, 199, 60, ${pulse})`;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = '#fff2c0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
  }
}

function drawExit(ctx, exit, unlocked) {
  const y = HUD_H + exit.y;
  const glow = unlocked ? 'rgba(74, 222, 128, 0.9)' : 'rgba(248, 113, 113, 0.8)';
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(exit.x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#0b1220';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(unlocked ? 'EXIT' : 'LOCK', exit.x, y);
}

function drawCone(ctx, guard) {
  const y = HUD_H + guard.y;
  const hot = guard.suspicion >= 100;
  const warm = guard.suspicion >= 55;
  const color = hot
    ? 'rgba(239, 68, 68, 0.34)'
    : warm
      ? 'rgba(249, 115, 22, 0.30)'
      : 'rgba(250, 204, 21, 0.22)';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(guard.x, y);
  ctx.arc(guard.x, y, guard.range, guard.facing - guard.halfAngle, guard.facing + guard.halfAngle);
  ctx.closePath();
  ctx.fill();
}

function drawGuard(ctx, guard) {
  const y = HUD_H + guard.y;
  const alert = guard.suspicion >= 100;
  ctx.fillStyle = alert ? '#ef4444' : guard.state === 'patrol' ? '#f97316' : '#fb923c';
  ctx.beginPath();
  ctx.arc(guard.x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c1206';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing tick.
  ctx.strokeStyle = '#fff7ed';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(guard.x, y);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * 18, y + Math.sin(guard.facing) * 18);
  ctx.stroke();
  // Suspicion arc above the guard.
  if (guard.suspicion > 2) {
    ctx.strokeStyle = guard.suspicion >= 100 ? '#ef4444' : '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, y - 22, 10, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * guard.suspicion) / 100);
    ctx.stroke();
  }
  // "!" when chasing, "?" when suspicious.
  if (guard.state === 'chase') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, y - 30);
  } else if (guard.suspicion >= 55) {
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, y - 30);
  }
}

function drawPlayer(ctx, player, inShadow) {
  const y = HUD_H + player.y;
  ctx.save();
  if (inShadow) {
    ctx.shadowColor = 'rgba(45, 212, 191, 0.8)';
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = player.sneaking ? '#22d3ee' : '#67e8f9';
  ctx.beginPath();
  ctx.arc(player.x, y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#083344';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, y, 13, 0, Math.PI * 2);
  ctx.stroke();
  // Small hood point showing the sneaking pose.
  ctx.fillStyle = '#083344';
  ctx.beginPath();
  ctx.arc(player.x, y - 4, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPebbles(ctx, pebbles) {
  for (const p of pebbles) {
    const y = HUD_H + p.y;
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(p.x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
    ctx.beginPath();
    ctx.arc(p.x, y, 3.5 + p.age * 40, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, game) {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, HUD_H - 2, CANVAS_W, 2);
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(game.levelDef.name, 16, 20);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#9ca3af';
  const taken = game.world.chips.filter((c) => c.taken).length;
  const total = game.world.chips.length;
  ctx.fillText(
    `Chips ${taken}/${total}  ·  Pebbles ${game.pebblesLeft} (click to throw)  ·  Shift sneak  ·  M mute`,
    16,
    44,
  );
  // Alert meter: the highest suspicion of any guard.
  const alert = Math.max(0, ...game.guards.map((g) => g.suspicion));
  const alerted = game.guards.filter((g) => g.state === 'chase').length;
  const bx = CANVAS_W - 250;
  ctx.fillStyle = '#374151';
  roundRect(ctx, bx, 18, 220, 16, 8);
  ctx.fill();
  const fillColor = alert >= 100 ? '#ef4444' : alert >= 55 ? '#f97316' : '#facc15';
  if (alert > 0) {
    ctx.fillStyle = fillColor;
    roundRect(ctx, bx, 18, (220 * alert) / 100, 16, 8);
    ctx.fill();
  }
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(alerted > 0 ? `ALERT x${alerted}` : 'UNSEEN', bx + 110, 26);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(game.statusText, CANVAS_W - 16, 48);
}

function drawOverlay(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(5, 8, 15, 0.78)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2 - 70);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#cbd5e1';
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, CANVAS_H / 2 - 18 + i * 26);
  });
  if (hint) {
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(hint, CANVAS_W / 2, CANVAS_H / 2 + 70);
  }
}

export function render(ctx, game) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#0b0f16';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawFloor(ctx, game.world);
  drawChips(ctx, game.world.chips);
  drawExit(ctx, game.world.exit, game.chipsDone);
  for (const g of game.guards) drawCone(ctx, g);
  drawPebbles(ctx, game.pebbles);
  for (const g of game.guards) drawGuard(ctx, g);
  drawPlayer(ctx, game.player, game.playerInShadow);
  drawHud(ctx, game);

  if (game.phase === 'title') {
    drawOverlay(
      ctx,
      'SHADOWLINE',
      [
        'You are Wren, a courier slipping through the Meridian Archive.',
        'Collect every data chip, then reach the green EXIT unseen.',
        'WASD / arrows to move · hold Shift to sneak · click to toss a pebble',
        'Stay out of the yellow cones. Shadows hide you. A full meter means a chase.',
      ],
      'Press Enter or click to begin',
    );
  } else if (game.phase === 'caught') {
    drawOverlay(
      ctx,
      'CAUGHT',
      ['A warden grabbed you under the lights.', 'The run restarts from this floor.'],
      'Press R to try again',
    );
  } else if (game.phase === 'levelClear') {
    drawOverlay(
      ctx,
      'FLOOR CLEAR',
      ['Every chip secured. The exit is open behind you.', game.levelDef.subtitle],
      'Press Enter for the next floor',
    );
  } else if (game.phase === 'won') {
    drawOverlay(
      ctx,
      'THE VAULT IS YOURS',
      [
        'All three floors cleared. Wren vanishes into the night,',
        'chips in pocket, no alarm ever raised that stuck.',
      ],
      'Press Enter to play again',
    );
  }
}

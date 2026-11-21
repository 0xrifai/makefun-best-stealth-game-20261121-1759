// Level data for Shadowline: three hand-built archive floors.
// Each grid is 20 columns x 14 rows. Legend:
//   '#' wall   '.' open floor   'C' crate (blocks movement and sight)
//   'S' shadow patch (walkable, hides you)   'E' exit door
//   'P' player start   '1' '2' '3' data chips to collect
// Guards patrol tile waypoints listed per level; they never spawn inside walls.

export const TILE = 44;
export const COLS = 20;
export const ROWS = 14;

export const LEVELS = [
  {
    name: 'Level 1 — The Lobby',
    subtitle: 'Two guards. One chip. Learn the patrols.',
    pebbles: 3,
    grid: [
      '####################',
      '#P....S.....C.....#',
      '#.................#',
      '#..C.....S.....1..#',
      '#.................#',
      '#....S.....C......#',
      '#.................#',
      '#..C.....S.....C..#',
      '#.................#',
      '#....S.....C......#',
      '#.................#',
      '#..C.....S.....C..#',
      '#.............E...#',
      '####################',
    ],
    guards: [
      { path: [[3, 3], [16, 3]], speed: 58, range: 185, pause: 1.2 },
      { path: [[10, 5], [10, 11]], speed: 52, range: 180, pause: 1.0 },
    ],
  },
  {
    name: 'Level 2 — The Gallery',
    subtitle: 'Three guards, two chips, and a wall with only three gaps.',
    pebbles: 3,
    grid: [
      '####################',
      '#P....#.....S....1#',
      '#.....#...........#',
      '#..S..#..C.....C..#',
      '#.................#',
      '#..C..#..S....S...#',
      '#.....#...........#',
      '#..S..#..C.....C..#',
      '#.................#',
      '#..C..#..S....S...#',
      '#.....#...........#',
      '#..S..#..C.....C..#',
      '#.....#.....2..E..#',
      '####################',
    ],
    guards: [
      { path: [[8, 2], [17, 2]], speed: 66, range: 200, pause: 1.0 },
      { path: [[8, 8], [17, 8]], speed: 62, range: 195, pause: 1.2 },
      { path: [[14, 4], [14, 11]], speed: 58, range: 190, pause: 0.8 },
    ],
  },
  {
    name: 'Level 3 — The Vault',
    subtitle: 'Four guards, three chips, nowhere to dawdle.',
    pebbles: 4,
    grid: [
      '####################',
      '#P..S.#....C...1..#',
      '#.....#...........#',
      '#.C...#..S....C...#',
      '#.................#',
      '#.S...#..C....S...#',
      '#.....#...........#',
      '#.C...#..S....C...#',
      '#.................#',
      '#.S...#..C....S...#',
      '#.....#...........#',
      '#.C...#..S....2...#',
      '#.....#......E.3..#',
      '####################',
    ],
    guards: [
      { path: [[8, 2], [17, 2]], speed: 74, range: 210, pause: 0.8 },
      { path: [[8, 6], [17, 6]], speed: 70, range: 205, pause: 1.0 },
      { path: [[10, 3], [10, 10]], speed: 66, range: 200, pause: 0.8 },
      { path: [[3, 4], [3, 11]], speed: 60, range: 190, pause: 1.0 },
    ],
  },
];

// Parse one level grid into the pieces the game logic needs.
export function parseLevel(def) {
  const walls = new Set();
  const crates = new Set();
  const shadows = new Set();
  let playerStart = { x: 1.5 * TILE, y: 1.5 * TILE };
  let exit = { x: 18.5 * TILE, y: 12.5 * TILE };
  const chips = [];
  def.grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      const key = x + ',' + y;
      if (ch === '#') walls.add(key);
      else if (ch === 'C') crates.add(key);
      else if (ch === 'S') shadows.add(key);
      else if (ch === 'P') playerStart = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      else if (ch === 'E') exit = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      else if (ch === '1' || ch === '2' || ch === '3') {
        chips.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
      }
    }
  });
  return { walls, crates, shadows, playerStart, exit, chips };
}

export function tileAt(x, y) {
  return { tx: Math.floor(x / TILE), ty: Math.floor(y / TILE) };
}

export function isSolidTile(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const key = tx + ',' + ty;
  return world.walls.has(key) || world.crates.has(key);
}

# makefun-best-stealth-game-20261121-1759
[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/0xrifai/makefun-best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/0xrifai/makefun-best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Shadowline** — a top-down stealth game built by an AI agent for make.fun's
[Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759)
bounty ($50 in USDC).

You are Wren, a courier slipping through the Meridian Archive. Collect every
data chip on the floor, then reach the green EXIT unseen. Guards patrol
waypoints with visible vision cones; step into a cone and their suspicion
meter fills — faster up close, in the light, and while you run. At full meter
a guard chases you; break line of sight and it searches your last seen spot,
then returns to its patrol. Crates block sight, shadow patches hide you,
and a tossed pebble pulls a nearby guard off its route to investigate.

## How to play

- **WASD / arrow keys** — move
- **Hold Shift** — sneak (slower, quieter, harder to spot)
- **Click** — toss a pebble to distract a guard (limited per floor)
- **M** — mute · **R** — retry after being caught · **Enter** — start / next floor

Three floors of rising difficulty: The Lobby (2 guards, 1 chip), The Gallery
(3 guards, 2 chips), The Vault (4 guards, 3 chips). All sound — footsteps
panned by direction, the alert sting, the exit chime — is synthesized live
with the WebAudio API; no audio files are loaded.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

The game is static files under `game/` with no build step: `game/index.html`
opens in desktop Chrome and plays with no network request.

## Source layout

| File | Job |
| --- | --- |
| `game/index.html` | Page shell and canvas |
| `game/src/main.js` | Boot, game loop, phases, input |
| `game/src/levels.js` | The three floor layouts and guard patrols |
| `game/src/guard.js` | Patrol, suspicion, chase, search, return |
| `game/src/player.js` | Movement and wall collision |
| `game/src/vision.js` | Line of sight and vision cones |
| `game/src/audio.js` | Synthesized footsteps, stings and chimes |
| `game/src/render.js` | All canvas drawing, HUD and screens |

## License

MIT — see [LICENSE](LICENSE).

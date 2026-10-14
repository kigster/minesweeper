# Minesweeper

A full-viewport, framework-free Minesweeper in TypeScript, bundled and served by [Bun](https://bun.sh).

## Requirements

- Bun 1.4 or newer
- [`just`](https://just.systems) (optional; every recipe maps to a `bun run` script)

## Usage

```bash
just install   # bun install
just dev       # dev server with hot reload: bun ./index.html
just start     # Bun.serve on PORT (default 3000): bun server.ts
just build     # static files in dist/, ready for any static host
```

URL parameters:

- `?level=beginner|intermediate|expert` picks the board (9×9/10, 16×16/40, 30×16/99).
- `?seed=<integer>` makes mine placement deterministic (used by the end-to-end tests).

## Controls

- Left click: reveal. The first click is always safe and always opens an area.
- Right click: flag or unflag.
- Middle click, or both buttons together, on a satisfied number: chord (open every unflagged neighbour).
- The face button starts a new game; the select box changes the level.

## Layout

| Path | What |
| :-- | :-- |
| `src/engine/` | Pure game engine: board, mine placement, flood fill, chording, seeded RNG |
| `src/ui/` | Board view and controller (DOM only) |
| `src/main.ts` | Entry point loaded by `index.html` |
| `server.ts` | `Bun.serve` serving the bundled page |
| `tests/` | `bun test` unit tests (happy-dom preloaded) |
| `cypress/` | End-to-end tests against the real server |

## Checks

```bash
just lint   # Biome + tsc --noEmit
just test   # bun test with coverage, 95% threshold
just e2e    # starts bun server.ts on :3000 and runs Cypress against it
```

GitHub Actions runs `ci.yml` (lint, unit tests) and `e2e.yml` (Cypress) on every push and pull request.

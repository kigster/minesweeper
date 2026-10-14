# Implementation plan — 000.00 Minesweeper

Owner: `luke-backend`. Contract between `luke-backend` (B1–B3) and `rey-frontend` (F1–F4). No code here; signatures only.

## Baseline

- Recorded 2026-10-13 22:43 PDT, before any work: the repository has no commits and no files. No test suite exists, so the baseline is **0 tests, 0 failures**.

## 1. Interfaces rey calls

### 1.1 Engine (`src/engine/`, B2)

Imports: `import { Game } from '../engine/game'`, `import { DIFFICULTIES } from '../engine/difficulty'`, `import { mulberry32 } from '../engine/rng'`, `import type { Cell, Status, Level, BoardConfig, Rng } from '../engine/types'`.

- `types.ts`
  - `Cell = { mine: boolean; adjacent: number; revealed: boolean; flagged: boolean }`
  - `Status = 'ready' | 'playing' | 'won' | 'lost'`
  - `Level = 'beginner' | 'intermediate' | 'expert'`
  - `BoardConfig = { cols: number; rows: number; mines: number }`
  - `Rng = () => number`, values in `[0, 1)`
  - `LEVELS: readonly Level[]` = `['beginner', 'intermediate', 'expert']` (exported from `difficulty.ts`, not `types.ts`), plus `isLevel(value: unknown): value is Level` for parsing `?level=`.
- `rng.ts`: `mulberry32(seed: number): Rng`. Same seed, same sequence.
- `difficulty.ts`: `DIFFICULTIES: Record<Level, BoardConfig>` — beginner `{cols: 9, rows: 9, mines: 10}`, intermediate `{16, 16, 40}`, expert `{cols: 30, rows: 16, mines: 99}`.
- `game.ts`: `class Game`
  - `constructor(config: BoardConfig, rng: Rng = Math.random)`. Throws `RangeError` when `cols`/`rows` < 1, or `mines` < 0, or `mines > cols*rows - 1`.
  - `readonly cols, rows, mines: number`; `readonly cells: Cell[]` (flat, `i = row * cols + col`, length `cols*rows`). Treat cells as read-only from the UI.
  - getters: `status: Status`, `flagCount: number`, `minesRemaining: number` (= mines − flags, may be negative), `explodedIndex: number | null`.
  - `neighbors(i): number[]` — 3..8 in-bounds indices, excluding `i`.
  - `reveal(i): number[]` — indices whose state changed (revealed cells; on a loss, only the hit cell). `[]` when no-op.
  - `toggleFlag(i): number[]` — `[i]` or `[]`.
  - `chord(i): number[]` — indices revealed, `[]` when no-op.
- Errors: out-of-range or non-integer index passed to `reveal`/`toggleFlag`/`chord`/`neighbors` → `RangeError`. Every other invalid action (flagged, revealed, game over) is a silent no-op returning `[]`.
- Behaviour:
  - Mines are placed on the first `reveal`, avoiding the clicked cell and its neighbours (when the board is too dense to avoid all neighbours, only the clicked cell is guaranteed safe). `status` goes `ready` → `playing`.
  - Before the first reveal, `toggleFlag` works and `status` stays `ready`; `chord` is a no-op.
  - Flood fill is iterative, never opens flagged cells.
  - Mine revealed → `status = 'lost'`, `explodedIndex = i`. Last safe cell revealed → `status = 'won'`. The engine does **not** auto-flag mines on win; the controller does that visually (F3).
  - After `won`/`lost`, every action returns `[]`.

### 1.2 Server (`server.ts`, B3)

- `startServer(port: number = Number(process.env.PORT ?? 3000)): Server` — `Bun.serve({ port, routes: { '/': index }, fetch: () => 404 })` with `import index from './index.html'`.
- `GET /` → 200 `text/html` (the HTML bundle). Bun-generated asset URLs (`/_bun/...`) → 200 with JS / CSS content types. Anything else → 404 `text/plain` `Not Found`.
- `bun server.ts` (i.e. `import.meta.main`) starts on `PORT` or 3000 and logs `Minesweeper running at <url>`.
- Dev mode (HMR) is on only when `NODE_ENV !== 'production'`.

### 1.3 Scripts (`package.json`, B1)

`dev`, `start` (= `bun server.ts`, port 3000), `build`, `test`, `lint`, `cypress:run`, `e2e` (= `start-server-and-test start http://localhost:3000 cypress:run`). `just` recipes: `install`, `dev`, `start`, `build`, `lint`, `test`, `e2e`.

### 1.4 Test environment (B1)

- `bunfig.toml` preloads `tests/setup/happy-dom.ts`, so `document`/`window` exist in every `bun test` file.
- `bun test` is scoped to `tests/` (`root = "tests"`), so Cypress specs are not picked up.
- Coverage threshold 0.95 (lines and functions), test files excluded.
- Biome ignores `dist/`, `coverage/`, `node_modules/`, `cypress/videos`, `cypress/screenshots`.

## 2. File ownership

| Path | Owner |
| :-- | :-- |
| `package.json`, `bun.lock`, `tsconfig.json`, `bunfig.toml`, `biome.json`, `justfile`, `.gitignore`, `.envrc`, `.github/workflows/ci.yml`, `README.md`, `tests/setup/**`, `tests/scaffold.test.ts` | luke (B1) |
| `src/engine/**`, `tests/engine/**` | luke (B2) |
| `server.ts`, `tests/server.test.ts`, `tests/build.test.ts` | luke (B3) |
| `index.html`, `src/styles.css`, `tests/ui/layout.test.ts` | rey (F1) |
| `src/ui/view.ts`, `tests/ui/view.test.ts` | rey (F2) |
| `src/ui/controller.ts`, `src/main.ts`, `tests/ui/controller.test.ts` | rey (F3) |
| `cypress.config.ts`, `cypress/**`, `.github/workflows/e2e.yml` | rey (F4) |

Shared files: none are written by both. `package.json` is written once by luke; rey asks by mail for any new dependency or script. `tsconfig.json` includes `cypress/**` exclusion (rey owns `cypress/tsconfig.json`).

## 3. Build order

1. B1 (luke) — unblocks everything.
2. B2 (luke) ∥ F1 (rey).
3. B3 (luke, needs F1's `index.html`) ∥ F2 (rey, needs B2).
4. F3 (rey).
5. F4 (rey) — integration.

## 4. Integration proof

- `just e2e`: `start-server-and-test` launches the real `bun server.ts` on :3000 and Cypress drives `cypress/e2e/game.cy.ts` against it — no intercepts, no stubs (F4 list in `plan-frontend.md`).
- Back-end half of the proof, `tests/server.test.ts`: real `Bun.serve` on an ephemeral port, real `fetch` of `/`, then of every script and stylesheet the served HTML references.

## Amendments

- amended: 1.2 — `server.ts` also exports `main(log = console.log): Server`, which `import.meta.main` calls, so the entry point is unit-tested.
- amended: 1.4 — happy-dom's preload replaces the global `Response` and `fetch`, which `Bun.serve` rejects. `tests/server.test.ts` unregisters happy-dom in `beforeAll` and re-registers it in `afterAll`. Any future test that runs the server must do the same.
- amended: 1.2 — no `/_bun/` paths in production: with `NODE_ENV=production`, Bun serves hashed `/chunk-*.js` / `/chunk-*.css`. The server test reads the URLs from the served HTML instead of assuming a prefix.

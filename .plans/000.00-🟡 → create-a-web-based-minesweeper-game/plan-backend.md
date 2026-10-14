# Back-end units — 000.00 Minesweeper

Built by `luke-backend`. Read `plan.md` for the order and the shared contracts. The repository is empty: B1 creates everything the other units build on.

"Back end" here means everything that runs without a DOM: tooling, the pure game engine, and the Bun server that serves the bundle.

## B1 Project scaffold and tooling

- **Discipline:** back end
- **Owns:**
  - `package.json`, `bun.lock`
  - `tsconfig.json` (strict, `"lib": ["ESNext", "DOM"]`, `"types": ["bun-types"]`)
  - `bunfig.toml` (`[test]` preload of `tests/setup/happy-dom.ts`, `coverage = true`, `coverageThreshold = 0.95`, `coverageSkipTestFiles = true`)
  - `tests/setup/happy-dom.ts` (registers `@happy-dom/global-registrator`)
  - `biome.json`
  - `justfile`
  - `.gitignore` (`node_modules/`, `dist/`, `coverage/`, `/log/*`, `cypress/videos/`, `cypress/screenshots/`, `.env`)
  - `.envrc` (`PATH_add bin` only if `bin/` exists; otherwise just `PATH_add node_modules/.bin`)
  - `.github/workflows/ci.yml` (lint + unit tests on push and pull request)
  - `README.md`
  - `tests/scaffold.test.ts`
- **Must not touch:** `src/**`, `index.html`, `server.ts`, `cypress/**`, `cypress.config.ts`, `.github/workflows/e2e.yml`, any other `tests/**` file.
- **Depends on:** nothing
- **What it sets up, all at once, so no later unit edits `package.json`:**
  - devDependencies: `typescript`, `bun-types`, `@biomejs/biome`, `happy-dom`, `@happy-dom/global-registrator`, `cypress`, `start-server-and-test`
  - scripts: `dev` → `bun ./index.html`, `start` → `bun server.ts`, `build` → `bun build ./index.html --outdir dist --minify`, `test` → `bun test --coverage`, `lint` → `biome check . && tsc --noEmit`, `cypress:run` → `cypress run`, `e2e` → `start-server-and-test start http://localhost:3000 cypress:run`
  - `justfile` recipes: `install`, `dev`, `start`, `build`, `lint`, `test`, `e2e`
- **Done when:** `tests/scaffold.test.ts` passes (asserts `document` exists under the happy-dom preload and that `package.json` declares the scripts above), and `just lint && just test` exit 0 on the scaffold alone.

## B2 Game engine

- **Discipline:** back end (pure TypeScript, no DOM access)
- **Owns:**
  - `src/engine/types.ts`
  - `src/engine/rng.ts`
  - `src/engine/difficulty.ts`
  - `src/engine/game.ts`
  - `tests/engine/rng.test.ts`
  - `tests/engine/game.test.ts`
- **Must not touch:** `src/ui/**`, `src/main.ts`, `src/styles.css`, `index.html`, `server.ts`, B1's files.
- **Depends on:** B1
- **Shape:**
  - `types.ts`: `Cell = { mine: boolean; adjacent: number; revealed: boolean; flagged: boolean }`, `Status = 'ready' | 'playing' | 'won' | 'lost'`, `Level = 'beginner' | 'intermediate' | 'expert'`, `BoardConfig = { cols: number; rows: number; mines: number }`, `Rng = () => number` (returns `[0, 1)`).
  - `rng.ts`: `mulberry32(seed: number): Rng`.
  - `difficulty.ts`: `DIFFICULTIES: Record<Level, BoardConfig>`. Beginner 9×9/10, intermediate 16×16/40, expert 30 cols × 16 rows/99.
  - `game.ts`: `class Game` with a flat `cells: Cell[]` (index `i = row * cols + col`).
    - `constructor(config: BoardConfig, rng: Rng = Math.random)`
    - readonly `cols`, `rows`, `mines`; getters `status: Status`, `flagCount: number`, `minesRemaining: number` (mines − flags, may go negative), `explodedIndex: number | null`
    - `neighbors(i: number): number[]`
    - `reveal(i: number): number[]` — returns the indices whose state changed
    - `toggleFlag(i: number): number[]`
    - `chord(i: number): number[]`
- **Behaviour the tests pin down** (the rules are in `spec.md`):
  - Mines are placed on the first `reveal`, never on the clicked cell or its neighbours. Status goes `ready` → `playing`.
  - Zero cells flood-fill outward, iteratively (no recursion; expert must not overflow the stack). Flood fill never opens a flagged cell.
  - `reveal` on a flagged or revealed cell is a no-op. `toggleFlag` on a revealed cell is a no-op.
  - Revealing a mine sets `lost` and `explodedIndex`. Revealing the last safe cell sets `won`.
  - `chord` on a revealed number whose flagged-neighbour count equals `adjacent` reveals every unflagged covered neighbour (and can lose). Any other `chord` is a no-op.
  - Every action after `won` or `lost` is a no-op returning `[]`.
  - The same seed produces the same board.
- **Done when:** `tests/engine/rng.test.ts` and `tests/engine/game.test.ts` pass, covering each bullet above for all three difficulties, with `src/engine/**` at ≥ 95% line coverage.

## B3 Bun server and static build

- **Discipline:** back end
- **Owns:**
  - `server.ts`
  - `tests/server.test.ts`
  - `tests/build.test.ts`
- **Must not touch:** `index.html`, `src/**`, B1's files.
- **Depends on:** B1, F1 (imports `index.html`; it cannot be tested before the shell exists)
- **Shape:**
  - `server.ts` exports `startServer(port: number = Number(process.env.PORT ?? 3000)): Server`, built on `Bun.serve({ routes: { '/': index } })` with `import index from './index.html'`. Run directly (`import.meta.main`), it starts and logs the URL.
  - Any path other than `/` and the bundled assets Bun generates returns 404.
- **Done when:**
  - `tests/server.test.ts`: `startServer(0)`, `GET /` returns 200 `text/html` containing `id="board"`; the `<script>` and stylesheet URLs it references each return 200 with a JavaScript and CSS content type; `GET /nope` returns 404; the server stops cleanly.
  - `tests/build.test.ts`: running `bun build ./index.html --outdir <tmpdir>` exits 0 and writes an `index.html` plus a `.js` and a `.css` asset.

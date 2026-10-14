# Front-end units — 000.00 Minesweeper

Built by `rey-frontend`. Read `plan.md` for the order and the shared contracts. No frameworks: vanilla TypeScript, CSS grid, one `index.html` (spec, "Features").

## F1 Page shell and styles

- **Discipline:** front end
- **Owns:**
  - `index.html`
  - `src/styles.css`
  - `tests/ui/layout.test.ts`
- **Must not touch:** `src/engine/**`, `src/ui/view.ts`, `src/ui/controller.ts`, `src/main.ts`, `server.ts`, B1's files.
- **Depends on:** B1
- **Shape (the DOM contract F2, F3 and F4 rely on):**
  - `index.html` links `./src/styles.css` and loads `./src/main.ts` with `<script type="module">`.
  - Header: `#mine-counter`, `#reset` (a face button), `#timer`, and `select#difficulty` with options `beginner`, `intermediate`, `expert`.
  - `#board`: a CSS grid using `grid-template-columns: repeat(var(--cols), var(--cell))` and `grid-auto-rows: var(--cell)`.
  - Cell classes: `.cell`, `.revealed`, `.flagged`, `.mine`, `.exploded`, `.wrong-flag`, `.n1` … `.n8`. Face states via `data-face="smile|ohh|dead|cool"` on `#reset`.
  - Look: the classic Windows Minesweeper, raised/sunken bevels, the classic number colours, LED-style three-digit counters. The page fills the viewport (`100vw` × `100vh`, no scrollbars); the board is centred.
- **Done when:** `tests/ui/layout.test.ts` loads `index.html` into happy-dom and asserts every id above exists, the script and stylesheet references are correct, and `src/styles.css` defines `.n1`–`.n8`, the grid template on `#board`, and `overflow: hidden` on the page.

## F2 Board view

- **Discipline:** front end
- **Owns:**
  - `src/ui/view.ts`
  - `tests/ui/view.test.ts`
- **Must not touch:** `src/engine/**`, `src/ui/controller.ts`, `src/main.ts`, `index.html`, `src/styles.css`, `server.ts`.
- **Depends on:** B2 (the `Game` type), F1 (the DOM contract)
- **Shape:**
  - `fitCellSize(cols: number, rows: number, availWidth: number, availHeight: number): number` — the largest whole-pixel cell that fits, clamped to a minimum of 16 px.
  - `class BoardView`
    - `constructor(board: HTMLElement, counter: HTMLElement, timer: HTMLElement, face: HTMLElement)`
    - `mount(game: Game): void` — builds one `<button class="cell" data-index="i">` per cell, sets `--cols`, `--rows`.
    - `update(game: Game, indices: number[]): void` — toggles classes on existing buttons only; never rebuilds.
    - `revealAll(game: Game): void` — on loss, shows every mine, `.exploded` on the hit, `.wrong-flag` on bad flags.
    - `fit(availWidth: number, availHeight: number): void` — sets `--cell`.
    - `setCounter(n: number)`, `setTimer(seconds: number)` — three digits, zero-padded, negative counter shown as `-NN`, both capped at 999.
    - `setFace(face: 'smile' | 'ohh' | 'dead' | 'cool')`
- **Done when:** `tests/ui/view.test.ts` passes: `mount` creates `cols × rows` buttons, `update` touches only the given cells and keeps the same button nodes, numbers get `.nK`, `revealAll` marks mines, explosion and wrong flags, counter/timer formatting (including negative and 999 cap), and `fitCellSize` for all three levels at 1280×800 and 1920×1080. `src/ui/view.ts` at ≥ 95% line coverage.

## F3 Controller and entry point

- **Discipline:** front end
- **Owns:**
  - `src/ui/controller.ts`
  - `src/main.ts`
  - `tests/ui/controller.test.ts`
- **Must not touch:** `src/engine/**`, `src/ui/view.ts`, `index.html`, `src/styles.css`, `server.ts`.
- **Depends on:** B2, F2
- **Shape:**
  - `class Controller`
    - `constructor(doc: Document, options: { level?: Level; seed?: number; now?: () => number })`
    - `start(): void` — wires the events below and mounts a new game.
    - `newGame(level?: Level): void`
    - `dispose(): void` — removes listeners and stops the timer.
  - `main.ts` reads `?level=` and `?seed=` from `location.search`, builds a `Controller` with `mulberry32(seed)` when a seed is given, and calls `start()`. Nothing else.
- **Behaviour:**
  - Left click a cell → `reveal`. Right click → `toggleFlag`, with `contextmenu` `preventDefault()` on the board.
  - Chord: middle-button `auxclick`, or releasing a mouse button while both left and right are held (`buttons === 3` on `mousedown`).
  - Face shows `ohh` while a cell button is held, `dead` on loss, `cool` on win; clicking `#reset` starts a new game at the current level.
  - The timer starts on the first reveal, ticks once a second, stops on win or loss, caps at 999.
  - Changing `#difficulty` starts a new game at that level. On win, every mine is shown flagged and the counter reads `000`.
  - `resize` re-runs `view.fit` against the viewport minus the header.
- **Done when:** `tests/ui/controller.test.ts` passes, driving real DOM events in happy-dom with a fixed seed and a fake `now`: first click never loses, right click flags and the counter drops, `contextmenu` is prevented, chord opens neighbours, a forced loss shows `dead` and stops the timer, a win shows `cool`, reset and difficulty change rebuild the board at the right size. `src/ui/controller.ts` at ≥ 95% line coverage.

## F4 Integration check (end to end, nothing stubbed)

- **Discipline:** front end
- **Owns:**
  - `cypress.config.ts`
  - `cypress/tsconfig.json`
  - `cypress/e2e/game.cy.ts`
  - `.github/workflows/e2e.yml`
- **Must not touch:** everything outside the files above.
- **Depends on:** B3, F3
- **How it runs:** `just e2e` → `start-server-and-test` starts the real `bun server.ts` on port 3000 and runs Cypress against it. The browser loads the HTML and the Bun-bundled `main.ts` through `Bun.serve`; no request is intercepted and no module is stubbed. `.github/workflows/e2e.yml` runs the same command on push and pull request.
- **Must show:**
  1. `GET /` renders 81 covered cells, counter `010`, timer `000`, face `smile`.
  2. With `?seed=<fixed>`, clicking the centre cell on the first move never loses and opens more than one cell (flood fill reached the browser).
  3. Right click flags a cell, the counter reads `009`, and no browser context menu appears.
  4. The timer is above `000` after two seconds of play.
  5. A known mine under the fixed seed, clicked, shows `dead`, `.exploded` and every other mine.
  6. `#reset` restores 81 covered cells and `smile`.
  7. Selecting `expert` renders 480 cells in 30 columns.
  8. At 1280×800 and 1920×1080, on expert, the page has no scrollbars and the board fits inside the viewport.
- **Done when:** `cypress/e2e/game.cy.ts` passes locally via `just e2e` and in the `e2e.yml` workflow.

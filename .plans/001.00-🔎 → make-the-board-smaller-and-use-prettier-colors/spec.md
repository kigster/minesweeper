---
lane: full
---

# Make the Board Smaller and Use Prettier Colors

Make the board smaller, and use prettier colors and transparency.

<!-- cmd:01M4WF77R49EDM7QPD0QW7JEKX -->

## What we are trying to achieve


## Why it matters


## What already exists


## What research needs to settle

None listed. Research answers the three implicit questions: what sets the board size, where the colours live, and what the repository state is.

## Research

Anchors: `000` = `/Users/kig/github/kigster/minesweeper.worktrees/000.00-create-a-web-based-minesweeper-game` at commit `36340fa` (its content matches what was read; the branch was clean at re-check).

### Current board sizing

- Cell size is computed, not set: `fitCellSize` picks the largest whole-pixel cell that fits, minimum 16 px (`000/src/ui/view.ts:10-19`). Controller subtracts an 80 px header (`000/src/ui/controller.ts:14, 84-89`) and re-fits on every `resize` (`controller.ts:58`) and every new game (`controller.ts:75`).
- Measured with that function (run 2026-10-13):

| Viewport | Beginner 9×9 | Intermediate 16×16 | Expert 30×16 |
| :-- | :-- | :-- | :-- |
| 1280×800 | 79 px, board 711² | 44 px, board 704² | 42 px, board 1260×672 |
| 1920×1080 | 110 px, board 990² | 62 px, board 992² | 62 px, board 1860×992 |

- So the board fills the viewport at every level. Making it smaller means changing this policy (a cap or a fraction of the viewport), not the CSS.
- `--cell: 24px` in `000/src/styles.css:2` is overwritten at runtime by `fit`, so it is never seen in use.

### Current colours and transparency

- Palette is the classic Windows set: face `#c0c0c0`, bevels `#fff` / `#7b7b7b` (`styles.css:6-8`), LED red on black (`styles.css:44-45`), exploded cell `#f00` (`styles.css:124`), numbers 1–8 as fixed hex (`styles.css:130-151`).
- No transparency anywhere: header and board backgrounds are opaque (`styles.css:37`, `styles.css:92-93`). `rg 'rgba|hsl|color-mix|opacity|oklch' src` returns nothing.
- Colours are plain values in CSS, so a palette change is confined to `src/styles.css`.

### Tests that constrain a change

- Unit: `000/tests/ui/view.test.ts:124-141` checks `fitCellSize` for all levels at 1280×800 and 1920×1080, min 16, and `view.fit` sets `--cell`.
- Layout: `000/tests/ui/layout.test.ts:41-46` asserts the grid template and `grid-auto-rows: var(--cell)`; `:48-50` asserts `overflow: hidden`; `:37-39` asserts `.n1`–`.n8` exist.
- E2E: `000/cypress/e2e/game.cy.ts:70-95` asserts 30 columns and that expert fits 1280×800 and 1920×1080 with no scrollbars.
- Baseline: `bun test` in `000` (bun 1.4.2): 99 pass, 0 fail, 100% lines, 2026-10-13. It rewrote files under `000/coverage/` as a side effect.

### Repository state

- `main` in `/Users/kig/github/kigster/minesweeper` has no commits. The only commit in the repo is `36340fa` on `kig/000.00-create-a-web-based-minesweeper-game`.
- This worktree (`kig/001.00-…`) has no commits and no tracked files. It cannot be based on `main` as it stands.
- Earlier, the game existed as 16 untracked top-level entries in `000`. By re-check it was committed as `36340fa`.

### Contradictions

1. **Look.** `.plans/000.00-…/plan-frontend.md:19` asks for "the classic Windows Minesweeper … classic number colours". This plan asks for "prettier colors and transparency". Code runs the classic look. Which one wins is a product call (see open question 2).
2. **Sizing.** `.plans/000.00-…/spec.md:55` example uses fixed `32px` cells. Shipped code fits to the viewport (`view.ts:10-19`), and `plan-frontend.md:19` says the same. The shipped code is what runs.
3. **Base.** A worktree is meant to hold the project's tracked files. Here the branch for this plan has no base commit, because `main` has none.
4. **Production.** No deployed production is evidenced. The running artifact is `bun server.ts` (`000/package.json` `start`) from the `000` tree.

### Findings, Conclusion & References

Findings:

- Board size is set by viewport fit, so "smaller" is a sizing-policy change in `view.ts` and `controller.ts`.
- Colours and opacity are plain CSS values in `src/styles.css`. No transparency exists today.
- Existing tests pin `fitCellSize`, the grid template, and the expert fit. A cap that keeps those invariants (cells ≥ 16 px, board inside viewport) keeps them green. A new signature breaks `view.test.ts:124-141`.
- The 001 branch cannot be built or tested until a base commit exists.

Conclusion: the change is small in code (one sizing rule plus CSS values), but the product choices (target size, palette, where transparency goes) and the missing base commit are not research-settled.

Open questions (for yoda):

1. Target size: a cap in px per cell (e.g. 24–32 px, as the old spec's example) or a fraction of the viewport?
2. Palette: keep the classic look, or a new palette? Which colours?
3. Transparency: header only, board cells, or the page background? What opacity?
4. Base: commit `000`'s tree to `main`, or seed this branch from `kig/000…`? Which one does the team want?
5. Whether the 16 px minimum and the 80 px header allowance stay.

References:

- Local only; no web search was run, since no external claim is made.
- `000/src/ui/view.ts`, `000/src/ui/controller.ts`, `000/src/styles.css`, `000/tests/ui/view.test.ts`, `000/tests/ui/layout.test.ts`, `000/cypress/e2e/game.cy.ts`, `000/plan-frontend.md` (in `.plans/000.00-…`), `000/spec.md` (in `.plans/000.00-…`).


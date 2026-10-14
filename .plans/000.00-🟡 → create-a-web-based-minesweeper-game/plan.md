> [!NOTE]
>
> [2026-10-13 10:39:54 PM PDT] [ agent: palpatine-planner   status: **Interrupted, round 1 (harness died)** ]

# Plan — 000.00 Create a Web Based Minesweeper Game

A full-viewport, framework-free Minesweeper in vanilla TypeScript, bundled and served by Bun (spec frontmatter: `use bun`). Seven units, one pull request.

- Back-end units (tooling, engine, server): `plan-backend.md`, built by `luke-backend`.
- Front-end units (shell, view, controller, end-to-end): `plan-frontend.md`, built by `rey-frontend`.

## Units

| Id | Unit | Discipline | Depends on | Done when |
| :-- | :-- | :-- | :-- | :-- |
| B1 | Project scaffold and tooling | back end | nothing | `tests/scaffold.test.ts`, `just lint && just test` green |
| B2 | Game engine (`src/engine/`) | back end | B1 | `tests/engine/rng.test.ts`, `tests/engine/game.test.ts` |
| B3 | Bun server and static build (`server.ts`) | back end | B1, F1 | `tests/server.test.ts`, `tests/build.test.ts` |
| F1 | Page shell and styles (`index.html`, `src/styles.css`) | front end | B1 | `tests/ui/layout.test.ts` |
| F2 | Board view (`src/ui/view.ts`) | front end | B2, F1 | `tests/ui/view.test.ts` |
| F3 | Controller and entry point (`src/ui/controller.ts`, `src/main.ts`) | front end | B2, F2 | `tests/ui/controller.test.ts` |
| F4 | **Integration check**: Cypress against the real Bun server | front end | B3, F3 | `cypress/e2e/game.cy.ts` via `just e2e` |

## Dependency graph

```text
B1 ──► B2 ──► F2 ──► F3 ──► F4 (integration)
 │             ▲             ▲
 └──► F1 ──────┤             │
       └──────► B3 ──────────┘
```

Edges: B1→B2, B1→F1, B1→B3, F1→B3, B2→F2, F1→F2, B2→F3, F2→F3, B3→F4, F3→F4.

## Order

1. **B1** alone. Every other unit needs its `package.json`, `tsconfig.json` and `bunfig.toml`.
2. **B2 ∥ F1.**
3. **B3 ∥ F2.** B3 waits on F1 because `server.ts` imports `index.html`.
4. **F3.**
5. **F4**, the integration check.

## File ownership and sequencing

- Every file has exactly one owner; the owns lists in the two unit files are disjoint.
- `package.json` is owned by B1 only. B1 declares every dependency and script up front (including Cypress and `start-server-and-test`), so no later unit edits it.
- CI is split: `.github/workflows/ci.yml` (B1, lint + unit) and `.github/workflows/e2e.yml` (F4), so B1 and F4 never write the same file.
- `index.html` (F1) is read, not written, by B3, F2 and F4. `src/engine/**` (B2) is read, not written, by F2 and F3.

## Shared contracts

- **Engine API** (B2 → F2, F3): `class Game` with `reveal`, `toggleFlag`, `chord`, `neighbors`, `status`, `minesRemaining`, `explodedIndex`, flat `cells: Cell[]`; `DIFFICULTIES`; `mulberry32(seed)`. Signatures in `plan-backend.md` B2.
- **DOM contract** (F1 → F2, F3, F4): ids `#board`, `#mine-counter`, `#timer`, `#reset`, `#difficulty`; cell classes `.cell .revealed .flagged .mine .exploded .wrong-flag .n1`–`.n8`; `data-face` on `#reset`. Details in `plan-frontend.md` F1.
- **URL parameters** (F3 → F4): `?level=beginner|intermediate|expert` and `?seed=<integer>`. The seed exists so the end-to-end test is deterministic; it changes nothing else.

## Integration check

F4 owns it. `just e2e` starts the real `bun server.ts`, and Cypress drives the page Bun bundles and serves: no intercepts, no stubbed modules. It must show a first click that never loses and flood-fills, flagging with the counter dropping and no context menu, the timer running, a loss revealing every mine, reset, the expert board at 30 × 16, and the board fitting a 1280×800 and a 1920×1080 viewport without scrollbars. The full list is in `plan-frontend.md` F4.

## Quality gates

- `just lint` (Biome + `tsc --noEmit`) and `just test` (`bun test --coverage`, threshold 0.95 in `bunfig.toml`) green after every unit.
- `just e2e` green after F4.
- GitHub Actions: `ci.yml` (lint, unit) and `e2e.yml` (Cypress).

## Out of scope

Not in the spec, so not built: touch and long-press controls, custom board sizes, best-time persistence, sound, the `?` mark state.

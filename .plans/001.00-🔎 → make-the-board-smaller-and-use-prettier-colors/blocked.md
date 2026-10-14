# Blocked, round 1 (product)

The research settled what sets size and colour (`000/src/ui/view.ts:10-19`, `000/src/styles.css`). The target values are product choices; a spec built on a guess would look decided and not be.

## B1 Target board size
Today the board fills the viewport (704² on 1280×800 at Intermediate, `view.ts:10-19`). "Smaller" needs a number.

- A. Cap cell size at 32 px (the old 000 spec example). Beginner 288², Intermediate 512², Expert 960×512.
- B. Cap at 24 px. Expert 720×384.
- C. Fraction of the viewport (e.g. 60%), cells still scale with the window.

Recommendation: A. Applied as a max inside `fitCellSize`, the signature is kept and `view.test.ts:124-141` needs only new expected values.

## B2 Palette
The 000 plan asked for the classic Windows look (`plan-frontend.md:19`); this plan asks for "prettier". Which?

- A. New soft palette (muted slate/blue face, pastel number colours).
- B. Keep classic grey, soften only number colours and add transparency.

Recommendation: A, hex values chosen by rey-frontend and listed in the plan, keeping `.n1`–`.n8` classes (`layout.test.ts:37-39`).

## B3 Transparency
None exists today (`rg` for rgba/opacity in `src` is empty). Where, and how much?

- A. Header and board panel translucent (~85%) over a gradient page background.
- B. Revealed cells only.
- C. Header only.

Recommendation: A, ~0.85 so number contrast stays readable.

## B4 Base commit
`main` has no commits; this branch has no tracked files. The game exists only as `36340fa` on `kig/000.00-create-a-web-based-minesweeper-game`.

- A. Merge 000 into `main` first, then rebase 001 onto it.
- B. Seed 001 from the 000 branch and target it (stacked PR).

Recommendation: A. Stacked PRs retarget badly on merge.

## B5 Keep the 16 px minimum and 80 px header allowance?
answers: yes, no

Recommendation: yes. A cap does not conflict, and the e2e fit tests (`game.cy.ts:70-95`) rely on them.

## A1

C

Answered by kig on 2026-10-13
<!-- cmd:01M4WFB6NVY4ZVXTNRZCJMGK8F -->

## A2

A

Answered by kig on 2026-10-13
<!-- cmd:01M4WFC5MMHGXXMRWET8GD9J3W -->

## A3

A

Answered by kig on 2026-10-13
<!-- cmd:01M4WFCF55KP985NXWP806NXP8 -->

## A4

A

Answered by kig on 2026-10-13
<!-- cmd:01M4WFCX713WG18JCSRSSJA15N -->

## A5

yes

Answered by kig on 2026-10-13
<!-- cmd:01M4WFD4GDBM7GRY66VWR9WYJE -->

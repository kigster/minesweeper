---
lane: plan
implmentation_suggestion:
  use bun
---
# Create a Web Based Minesweeper Game

## What we are trying to achieve

Build an HTML/JavaScript game that uses the full browser width and height to create an experience similar to playing a famous Windows Game called "MineSweeper".  It could be static HTML/JS or it could be served by a server such as bun, vite, etc.

## Minesweeper Rules

Minesweeper is played on a grid of covered squares. Some of them hide mines, and your job is to uncover every square that doesn't.

### How a turn works

You click a square to reveal it. If it's a mine, you lose. If it's safe, it shows a number from 1 to 8 telling you how many mines touch that square, counting all eight neighbors including diagonals. A safe square with no neighboring mines shows nothing, and the game automatically opens all the squares around it. That's why your first few clicks sometimes clear a big chunk of the board at once.

### Flags

Right-click a square to put a flag on it. A flag marks a square you think is a mine and stops you from clicking it by accident. Flags are only notes for yourself. The game doesn't check them, and you don't need to flag every mine to win.

### Chording

On most versions, if a numbered square already has the right number of flags around it, clicking it with both buttons or the middle button opens all its remaining unflagged neighbors in one move. It's a big time saver, and it's dangerous if one of your flags is wrong.

### Winning and losing

You win when every non-mine square is uncovered. You lose the moment you reveal a mine. The counter at the top shows total mines minus flags placed, and a timer tracks how long you take.

**Standard boards**

- Beginner: 9×9 with 10 mines
- Intermediate: 16×16 with 40 mines
- Expert: 30×16 with 99 mines

Most modern versions guarantee your first click is safe. The game moves the mine elsewhere if you hit one on click one.

The fun part is the logic:

> A "1" next to exactly one covered square means that square is a mine. A "1" whose one mine you've already found means all its other neighbors are safe. Chaining those deductions gets you through most of a board. Sometimes, usually near the end, you hit a spot where the numbers can't tell you anything and you just have to guess. Plenty of people find that last coin flip maddening.

## Features

The game should be well designed from the graphics standpoint, and any CSS or JS framework is allowed.

Skip frameworks entirely. Minesweeper is a grid of buttons and about 150 lines of state logic, and React or Vue would add a build step and a virtual DOM to solve problems you don’t have.

## Implementation Suggestion

The stack I’d use:

- **One `index.html`** with a `<div id="board">`.
- **CSS grid** for the board. `grid-template-columns: repeat(var(--cols), 32px)` lets you switch between beginner, intermediate and expert by changing one custom property from JS.
- **Vanilla JS or TypeScript** in a single `game.ts`. Keep the board as a flat array of cell objects like `{ mine, adjacent, revealed, flagged }`, write a `reveal(i)` function with a flood fill for zero cells, and re-render by toggling classes on the existing buttons. Use `contextmenu` with `preventDefault()` for flags.

Bun handles the rest without any config. `bun ./index.html` starts a dev server that bundles the TypeScript your HTML references and reloads on save. When you’re done, `bun build ./index.html --outdir dist` produces plain static files you can drop on GitHub Pages, Netlify, S3 or any nginx box. If you’d rather keep a Bun process running in production, `Bun.serve` with the HTML file imported as a route serves the same bundle in about five lines.

If you want zero tooling at all, write `game.js` instead of `.ts`, load it with `<script type="module">`, and open the file in a browser. Bun only earns its place once you want TypeScript or a dev server with reload.

The trickiest parts are the flood fill and making the first click safe, which you handle by placing mines after that first click and excluding the clicked cell and its neighbors.

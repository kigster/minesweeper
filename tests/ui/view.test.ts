import { beforeEach, describe, expect, test } from 'bun:test';
import { DIFFICULTIES } from '../../src/engine/difficulty';
import { Game } from '../../src/engine/game';
import { mulberry32 } from '../../src/engine/rng';
import { BoardView, fitCellSize } from '../../src/ui/view';

let board: HTMLElement;
let counter: HTMLElement;
let timer: HTMLElement;
let face: HTMLElement;
let view: BoardView;

beforeEach(() => {
  document.body.innerHTML =
    '<div id="board"></div><div id="c"></div><div id="t"></div><button id="f"></button>';
  board = document.getElementById('board') as HTMLElement;
  counter = document.getElementById('c') as HTMLElement;
  timer = document.getElementById('t') as HTMLElement;
  face = document.getElementById('f') as HTMLElement;
  view = new BoardView(board, counter, timer, face);
});

const cells = () => [...board.querySelectorAll('button.cell')] as HTMLButtonElement[];

describe('mount', () => {
  test.each(['beginner', 'intermediate', 'expert'] as const)(
    '%s builds cols x rows buttons',
    (level) => {
      const game = new Game(DIFFICULTIES[level], mulberry32(1));
      view.mount(game);
      expect(cells().length).toBe(game.cols * game.rows);
      expect(board.style.getPropertyValue('--cols')).toBe(String(game.cols));
      expect(board.style.getPropertyValue('--rows')).toBe(String(game.rows));
      expect(cells()[5]?.dataset.index).toBe('5');
    },
  );

  test('remount replaces the previous board', () => {
    view.mount(new Game(DIFFICULTIES.expert, mulberry32(1)));
    view.mount(new Game(DIFFICULTIES.beginner, mulberry32(1)));
    expect(cells().length).toBe(81);
  });
});

describe('update', () => {
  test('touches only given cells, keeps nodes, adds number class', () => {
    const game = new Game(DIFFICULTIES.beginner, mulberry32(7));
    view.mount(game);
    const before = cells();
    const changed = game.reveal(40);
    view.update(game, changed);
    const after = cells();
    expect(after.every((b, i) => b === before[i])).toBe(true);
    const changedSet = new Set(changed);
    after.forEach((b, i) => {
      expect(b.classList.contains('revealed')).toBe(changedSet.has(i));
    });
    const numbered = changed.find((i) => (game.cells[i]?.adjacent ?? 0) > 0);
    if (numbered !== undefined) {
      const n = game.cells[numbered]?.adjacent;
      expect(after[numbered]?.classList.contains(`n${n}`)).toBe(true);
      expect(after[numbered]?.textContent).toBe(String(n));
    }
  });

  test('flag toggles the flagged class', () => {
    const game = new Game(DIFFICULTIES.beginner, mulberry32(7));
    view.mount(game);
    view.update(game, game.toggleFlag(3));
    expect(cells()[3]?.classList.contains('flagged')).toBe(true);
    view.update(game, game.toggleFlag(3));
    expect(cells()[3]?.classList.contains('flagged')).toBe(false);
  });
});

describe('revealAll', () => {
  test('shows mines, explosion and wrong flags', () => {
    const game = new Game(DIFFICULTIES.beginner, mulberry32(3));
    view.mount(game);
    view.update(game, game.reveal(40));
    const mineIdx = game.cells.findIndex((c) => c.mine);
    const safeCovered = game.cells.findIndex((c) => !c.mine && !c.revealed);
    view.update(game, game.toggleFlag(safeCovered));
    view.update(game, game.reveal(mineIdx));
    view.revealAll(game);
    expect(game.status).toBe('lost');
    expect(cells()[mineIdx]?.classList.contains('exploded')).toBe(true);
    for (const [i, c] of game.cells.entries()) {
      if (c.mine) expect(cells()[i]?.classList.contains('mine')).toBe(true);
    }
    expect(cells()[safeCovered]?.classList.contains('wrong-flag')).toBe(true);
  });
});

describe('counters and face', () => {
  test('formats counter', () => {
    view.setCounter(7);
    expect(counter.textContent).toBe('007');
    view.setCounter(-5);
    expect(counter.textContent).toBe('-05');
    view.setCounter(1500);
    expect(counter.textContent).toBe('999');
  });

  test('formats timer', () => {
    view.setTimer(0);
    expect(timer.textContent).toBe('000');
    view.setTimer(42);
    expect(timer.textContent).toBe('042');
    view.setTimer(5000);
    expect(timer.textContent).toBe('999');
  });

  test('sets face', () => {
    view.setFace('dead');
    expect(face.dataset.face).toBe('dead');
  });
});

describe('fit', () => {
  test.each([
    [1280, 800],
    [1920, 1080],
  ])('every level fits %ix%i', (w, h) => {
    for (const cfg of Object.values(DIFFICULTIES)) {
      const size = fitCellSize(cfg.cols, cfg.rows, w, h);
      expect(size).toBeGreaterThanOrEqual(16);
      expect(size * cfg.cols).toBeLessThanOrEqual(w);
      expect(size * cfg.rows).toBeLessThanOrEqual(h);
    }
  });

  test('clamps to 16', () => {
    expect(fitCellSize(30, 16, 100, 100)).toBe(16);
  });

  test('view.fit sets --cell', () => {
    view.mount(new Game(DIFFICULTIES.expert, mulberry32(1)));
    view.fit(1280, 720);
    expect(board.style.getPropertyValue('--cell')).toBe(`${fitCellSize(30, 16, 1280, 720)}px`);
  });
});

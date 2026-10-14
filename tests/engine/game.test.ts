import { describe, expect, test } from 'bun:test';
import { DIFFICULTIES, isLevel, LEVELS } from '../../src/engine/difficulty';
import { Game } from '../../src/engine/game';
import { mulberry32 } from '../../src/engine/rng';
import type { BoardConfig, Cell } from '../../src/engine/types';

const cell = (g: Game, i: number) => g.cells[i] as Cell;
const mineIndices = (g: Game) => g.cells.flatMap((c, i) => (c.mine ? [i] : []));
const safeIndices = (g: Game) => g.cells.flatMap((c, i) => (c.mine ? [] : [i]));
const centre = (g: Game) => Math.floor(g.rows / 2) * g.cols + Math.floor(g.cols / 2);

/** Rng that always returns 0: mines fill the first free cells of the pool in order. */
const zeros = () => 0;

/** A game whose first reveal has happened, so the board is laid out. */
function started(config: BoardConfig, seed = 1, first = 0): Game {
  const g = new Game(config, mulberry32(seed));
  g.reveal(first);
  return g;
}

/** Finds a seed and click where the board is laid out but not yet won. */
function inPlay(config: BoardConfig): Game {
  for (let seed = 1; seed < 1000; seed++) {
    const g = started(config, seed, centre(new Game(config)));
    if (g.status === 'playing') return g;
  }
  throw new Error('no playable seed');
}

describe('DIFFICULTIES', () => {
  test('match the standard boards', () => {
    expect(DIFFICULTIES).toEqual({
      beginner: { cols: 9, rows: 9, mines: 10 },
      intermediate: { cols: 16, rows: 16, mines: 40 },
      expert: { cols: 30, rows: 16, mines: 99 },
    });
    expect(LEVELS).toEqual(['beginner', 'intermediate', 'expert']);
  });

  test('isLevel accepts only known levels', () => {
    expect(isLevel('expert')).toBe(true);
    expect(isLevel('hard')).toBe(false);
    expect(isLevel(undefined)).toBe(false);
  });
});

describe('Game construction', () => {
  test('starts ready with a covered, mine-free flat board', () => {
    const g = new Game(DIFFICULTIES.expert);
    expect(g.cells).toHaveLength(480);
    expect([g.cols, g.rows, g.mines]).toEqual([30, 16, 99]);
    expect(g.status).toBe('ready');
    expect(g.minesRemaining).toBe(99);
    expect(g.flagCount).toBe(0);
    expect(g.explodedIndex).toBeNull();
    expect(g.cells.every((c) => !c.mine && !c.revealed && !c.flagged && c.adjacent === 0)).toBe(
      true,
    );
  });

  test('rejects impossible configurations', () => {
    expect(() => new Game({ cols: 0, rows: 9, mines: 1 })).toThrow(RangeError);
    expect(() => new Game({ cols: 9, rows: 1.5, mines: 1 })).toThrow(RangeError);
    expect(() => new Game({ cols: 3, rows: 3, mines: 9 })).toThrow(RangeError);
    expect(() => new Game({ cols: 3, rows: 3, mines: -1 })).toThrow(RangeError);
  });

  test('rejects out-of-range indices', () => {
    const g = new Game(DIFFICULTIES.beginner);
    for (const bad of [-1, 81, 1.5, Number.NaN]) {
      expect(() => g.reveal(bad)).toThrow(RangeError);
      expect(() => g.toggleFlag(bad)).toThrow(RangeError);
      expect(() => g.chord(bad)).toThrow(RangeError);
      expect(() => g.neighbors(bad)).toThrow(RangeError);
    }
  });
});

describe('neighbors', () => {
  const g = new Game(DIFFICULTIES.expert);
  test('corner, edge and interior cells', () => {
    expect(g.neighbors(0).sort((a, b) => a - b)).toEqual([1, 30, 31]);
    expect(g.neighbors(29).sort((a, b) => a - b)).toEqual([28, 58, 59]);
    expect(g.neighbors(479).sort((a, b) => a - b)).toEqual([448, 449, 478]);
    expect(g.neighbors(5)).toHaveLength(5);
    expect(g.neighbors(31).sort((a, b) => a - b)).toEqual([0, 1, 2, 30, 32, 60, 61, 62]);
  });
});

describe.each(LEVELS)('%s board', (level) => {
  const config = DIFFICULTIES[level];

  test('first reveal places exactly the configured mines, never on or around the click', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const g = new Game(config, mulberry32(seed));
      const first = (seed * 37) % g.cells.length;
      g.reveal(first);
      expect(g.status).not.toBe('lost');
      expect(mineIndices(g)).toHaveLength(config.mines);
      for (const i of [first, ...g.neighbors(first)]) expect(cell(g, i).mine).toBe(false);
      // Clicked cell has no mine neighbours, so the click always flood-fills.
      expect(cell(g, first).adjacent).toBe(0);
    }
  });

  test('adjacent counts match the mines around each cell', () => {
    const g = started(config, 3, centre(new Game(config)));
    g.cells.forEach((c, i) => {
      expect(c.adjacent).toBe(g.neighbors(i).filter((n) => cell(g, n).mine).length);
    });
  });

  test('the same seed and click produce the same board', () => {
    const a = started(config, 99, 4);
    const b = started(config, 99, 4);
    expect(mineIndices(a)).toEqual(mineIndices(b));
    expect(mineIndices(started(config, 100, 4))).not.toEqual(mineIndices(a));
  });

  test('flood fill opens a connected region bounded by numbers', () => {
    const g = new Game(config, mulberry32(5));
    const opened = g.reveal(centre(g));
    expect(opened.length).toBeGreaterThan(1);
    expect(new Set(opened).size).toBe(opened.length);
    for (const i of opened) {
      expect(cell(g, i).revealed).toBe(true);
      expect(cell(g, i).mine).toBe(false);
      // Every neighbour of an opened zero is opened too.
      if (cell(g, i).adjacent === 0) {
        for (const n of g.neighbors(i)) expect(cell(g, n).revealed).toBe(true);
      }
    }
  });

  test('revealing every safe cell wins; further actions are no-ops', () => {
    const g = started(config, 11, 0);
    for (const i of safeIndices(g)) g.reveal(i);
    expect(g.status).toBe('won');
    const mine = mineIndices(g)[0] as number;
    expect(g.reveal(mine)).toEqual([]);
    expect(g.toggleFlag(mine)).toEqual([]);
    expect(g.chord(0)).toEqual([]);
    expect(g.status).toBe('won');
  });

  test('revealing a mine loses and records the explosion', () => {
    const g = inPlay(config);
    const mine = mineIndices(g)[0] as number;
    expect(g.reveal(mine)).toEqual([mine]);
    expect(g.status).toBe('lost');
    expect(g.explodedIndex).toBe(mine);
    expect(cell(g, mine).revealed).toBe(true);
    const safe = safeIndices(g).find((i) => !cell(g, i).revealed) as number;
    expect(g.reveal(safe)).toEqual([]);
    expect(g.toggleFlag(safe)).toEqual([]);
    expect(cell(g, safe).revealed).toBe(false);
  });
});

describe('reveal and flag rules', () => {
  test('reveal on a flagged or already revealed cell is a no-op', () => {
    const g = inPlay(DIFFICULTIES.intermediate);
    const covered = safeIndices(g).find((i) => !cell(g, i).revealed) as number;
    g.toggleFlag(covered);
    expect(g.reveal(covered)).toEqual([]);
    expect(cell(g, covered).revealed).toBe(false);
    const open = g.cells.findIndex((c) => c.revealed);
    expect(g.reveal(open)).toEqual([]);
  });

  test('flags can be placed before the first click without starting the game', () => {
    const g = new Game(DIFFICULTIES.beginner, mulberry32(1));
    expect(g.toggleFlag(40)).toEqual([40]);
    expect(g.status).toBe('ready');
    expect(g.chord(40)).toEqual([]);
    expect(g.reveal(40)).toEqual([]);
    expect(g.status).toBe('ready');
  });

  test('toggleFlag flips the flag and the counter, may go negative, ignores revealed cells', () => {
    const g = new Game({ cols: 4, rows: 4, mines: 1 }, zeros);
    expect(g.toggleFlag(0)).toEqual([0]);
    expect(g.toggleFlag(1)).toEqual([1]);
    expect(g.flagCount).toBe(2);
    expect(g.minesRemaining).toBe(-1);
    expect(g.toggleFlag(1)).toEqual([1]);
    expect(cell(g, 1).flagged).toBe(false);
    expect(g.minesRemaining).toBe(0);
    g.reveal(15);
    const open = g.cells.findIndex((c) => c.revealed);
    expect(g.toggleFlag(open)).toEqual([]);
  });

  test('flood fill never opens a flagged cell', () => {
    // 5x1 strip, one mine; zeros rng puts it at index 0 when clicking index 4.
    const g = new Game({ cols: 5, rows: 1, mines: 1 }, zeros);
    g.toggleFlag(2);
    const opened = g.reveal(4);
    expect(opened.sort()).toEqual([3, 4]);
    expect(cell(g, 2).revealed).toBe(false);
    expect(cell(g, 0).mine).toBe(true);
  });

  test('expert flood fill over an almost empty board does not overflow the stack', () => {
    const g = new Game({ cols: 300, rows: 300, mines: 1 }, zeros);
    const opened = g.reveal(300 * 300 - 1);
    expect(opened.length).toBe(300 * 300 - 1);
    expect(g.status).toBe('won');
  });

  test('a board too dense to clear the neighbourhood still keeps the first click safe', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = new Game({ cols: 3, rows: 3, mines: 8 }, mulberry32(seed));
      expect(g.reveal(4)).toEqual([4]);
      expect(g.status).toBe('won');
      expect(cell(g, 4).adjacent).toBe(8);
    }
  });
});

describe('chord', () => {
  // 5x3, one mine at 0 (zeros rng; clicking 14 guards 8, 9, 13, 14). Cell 1 is flagged before
  // the click so the flood leaves it covered; cell 6 then shows "1" next to covered 0 and 1.
  function oneMine(): Game {
    const g = new Game({ cols: 5, rows: 3, mines: 1 }, zeros);
    g.toggleFlag(1);
    g.reveal(14);
    return g;
  }

  test('fixture leaves cells 0 and 1 covered around a revealed "1"', () => {
    const g = oneMine();
    expect(cell(g, 0).mine).toBe(true);
    expect(g.status).toBe('playing');
    expect(g.cells.flatMap((c, i) => (c.revealed ? [] : [i]))).toEqual([0, 1]);
    expect(cell(g, 6).revealed).toBe(true);
    expect(cell(g, 6).adjacent).toBe(1);
  });

  test('opens unflagged covered neighbours when the flag count matches', () => {
    const g = oneMine();
    g.toggleFlag(1);
    g.toggleFlag(0);
    expect(g.chord(6)).toEqual([1]);
    expect(g.status).toBe('won');
  });

  test('is a no-op when the flag count does not match, or on covered/zero cells', () => {
    const g = oneMine();
    g.toggleFlag(0);
    expect(g.chord(6)).toEqual([]);
    g.toggleFlag(0);
    g.toggleFlag(1);
    expect(g.chord(6)).toEqual([]);
    expect(g.chord(0)).toEqual([]);
    expect(g.chord(14)).toEqual([]);
    expect(g.status).toBe('playing');
  });

  test('with a wrong flag it reveals the mine and loses', () => {
    const g = oneMine();
    expect(g.chord(6)).toEqual([0]);
    expect(g.status).toBe('lost');
    expect(g.explodedIndex).toBe(0);
  });

  test('works on every standard board', () => {
    for (const level of LEVELS) {
      const g = inPlay(DIFFICULTIES[level]);
      const target = g.cells.findIndex(
        (c, i) =>
          c.revealed &&
          c.adjacent > 0 &&
          g.neighbors(i).some((n) => !cell(g, n).revealed && !cell(g, n).mine),
      );
      expect(target).toBeGreaterThanOrEqual(0);
      for (const n of g.neighbors(target)) if (cell(g, n).mine) g.toggleFlag(n);
      const opened = g.chord(target);
      expect(opened.length).toBeGreaterThan(0);
      expect(g.status).not.toBe('lost');
    }
  });
});

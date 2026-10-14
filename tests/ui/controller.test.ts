import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { DIFFICULTIES } from '../../src/engine/difficulty';
import { Game } from '../../src/engine/game';
import { mulberry32 } from '../../src/engine/rng';
import { Controller } from '../../src/ui/controller';

const SEED = 12345;
const html = readFileSync('index.html', 'utf8');
let ctl: Controller | undefined;
let clock = 0;
const now = () => clock;

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const cell = (i: number) => document.querySelector(`.cell[data-index="${i}"]`) as HTMLElement;
const cellCount = () => document.querySelectorAll('.cell').length;

function mouse(el: Element, type: string, init: MouseEventInit = {}): MouseEvent {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  el.dispatchEvent(e);
  return e;
}
const click = (i: number) => {
  mouse(cell(i), 'mousedown', { button: 0, buttons: 1 });
  mouse(cell(i), 'mouseup', { button: 0 });
};
const rightClick = (i: number) => {
  mouse(cell(i), 'mousedown', { button: 2, buttons: 2 });
  mouse(cell(i), 'mouseup', { button: 2 });
};

/** Mirrors the controller's game for the fixed seed, after the first click at `first`. */
function shadow(first: number): Game {
  const g = new Game(DIFFICULTIES.beginner, mulberry32(SEED));
  g.reveal(first);
  return g;
}

beforeEach(() => {
  clock = 0;
  document.documentElement.innerHTML = html
    .replace(/^[\s\S]*?<html[^>]*>/i, '')
    .replace(/<\/html>\s*$/i, '')
    .replace(/<(link|script)\b[^>]*>(<\/script>)?/gi, '');
  ctl = new Controller(document, { level: 'beginner', seed: SEED, now });
  ctl.start();
});

afterEach(() => ctl?.dispose());

describe('start', () => {
  test('mounts a beginner board', () => {
    expect(cellCount()).toBe(81);
    expect($('mine-counter').textContent).toBe('010');
    expect($('timer').textContent).toBe('000');
    expect($('reset').dataset.face).toBe('smile');
  });
});

describe('clicks', () => {
  test('first click never loses and opens cells', () => {
    click(40);
    expect($('reset').dataset.face).toBe('smile');
    expect(document.querySelectorAll('.cell.revealed').length).toBeGreaterThan(0);
    expect(cell(40).classList.contains('mine')).toBe(false);
  });

  test('right click flags, counter drops, contextmenu prevented', () => {
    rightClick(0);
    expect(cell(0).classList.contains('flagged')).toBe(true);
    expect($('mine-counter').textContent).toBe('009');
    const e = mouse($('board'), 'contextmenu');
    expect(e.defaultPrevented).toBe(true);
  });

  test('middle click chords a satisfied number', () => {
    click(40);
    const g = shadow(40);
    const idx = g.cells.findIndex(
      (c, i) => c.revealed && c.adjacent > 0 && g.neighbors(i).some((n) => !g.cells[n]?.revealed),
    );
    expect(idx).toBeGreaterThan(-1);
    for (const n of g.neighbors(idx)) {
      if (g.cells[n]?.mine) rightClick(n);
    }
    mouse(cell(idx), 'auxclick', { button: 1 });
    const g2 = shadow(40);
    g2.chord(idx);
    // chord with flags matching mines reveals the remaining neighbours
    for (const n of g.neighbors(idx)) {
      if (!g.cells[n]?.mine) expect(cell(n).classList.contains('revealed')).toBe(true);
    }
  });

  test('both buttons held then released chords', () => {
    click(40);
    const g = shadow(40);
    const idx = g.cells.findIndex(
      (c, i) => c.revealed && c.adjacent > 0 && g.neighbors(i).some((n) => !g.cells[n]?.revealed),
    );
    for (const n of g.neighbors(idx)) {
      if (g.cells[n]?.mine) rightClick(n);
    }
    mouse(cell(idx), 'mousedown', { button: 0, buttons: 3 });
    mouse(cell(idx), 'mouseup', { button: 0 });
    for (const n of g.neighbors(idx)) {
      if (!g.cells[n]?.mine) expect(cell(n).classList.contains('revealed')).toBe(true);
    }
  });

  test('holding a cell shows ohh', () => {
    mouse(cell(0), 'mousedown', { button: 0, buttons: 1 });
    expect($('reset').dataset.face).toBe('ohh');
    mouse(document.body, 'mouseup', { button: 0 });
    expect($('reset').dataset.face).toBe('smile');
  });

  test('clicks outside a cell do nothing', () => {
    mouse($('board'), 'mousedown', { button: 0, buttons: 1 });
    mouse($('board'), 'mouseup', { button: 0 });
    expect(document.querySelectorAll('.cell.revealed').length).toBe(0);
  });
});

describe('end of game', () => {
  test('hitting a mine shows dead, stops timer, reveals mines', () => {
    click(40);
    const g = shadow(40);
    const mine = g.cells.findIndex((c) => c.mine);
    clock = 3000;
    click(mine);
    expect($('reset').dataset.face).toBe('dead');
    expect(cell(mine).classList.contains('exploded')).toBe(true);
    const frozen = $('timer').textContent;
    clock = 9000;
    click(0);
    expect($('timer').textContent).toBe(frozen);
  });

  test('clearing every safe cell wins', () => {
    click(40);
    const g = shadow(40);
    g.cells.forEach((c, i) => {
      if (!c.mine && !c.revealed) click(i);
    });
    expect($('reset').dataset.face).toBe('cool');
    expect($('mine-counter').textContent).toBe('000');
    expect(document.querySelectorAll('.cell.flagged').length).toBe(10);
  });
});

describe('timer', () => {
  test('ticks once a second after first reveal', async () => {
    click(40);
    clock = 1000;
    await Bun.sleep(1100);
    expect($('timer').textContent).not.toBe('000');
  });
});

describe('reset and difficulty', () => {
  test('reset rebuilds the board', () => {
    click(40);
    $('reset').click();
    expect(cellCount()).toBe(81);
    expect(document.querySelectorAll('.cell.revealed').length).toBe(0);
    expect($('reset').dataset.face).toBe('smile');
  });

  test('difficulty change resizes the board', () => {
    const select = $('difficulty') as HTMLSelectElement;
    select.value = 'expert';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(cellCount()).toBe(480);
    expect($('board').style.getPropertyValue('--cols')).toBe('30');
    select.value = 'intermediate';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(cellCount()).toBe(256);
  });

  test('resize refits the board', () => {
    window.dispatchEvent(new Event('resize'));
    expect($('board').style.getPropertyValue('--cell')).toMatch(/px$/);
  });
});

describe('dispose', () => {
  test('removes listeners', () => {
    ctl?.dispose();
    rightClick(0);
    expect(cell(0).classList.contains('flagged')).toBe(false);
  });
});

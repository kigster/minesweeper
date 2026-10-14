import type { Game } from '../engine/game';

export type Face = 'smile' | 'ohh' | 'dead' | 'cool';

const MIN_CELL = 16;
const MAX_DIGITS = 999;
const BORDER_ALLOWANCE = 8;

/** Largest whole-pixel cell that fits the given area, never below 16 px. */
export function fitCellSize(
  cols: number,
  rows: number,
  availWidth: number,
  availHeight: number,
): number {
  const byWidth = Math.floor((availWidth - BORDER_ALLOWANCE) / cols);
  const byHeight = Math.floor((availHeight - BORDER_ALLOWANCE) / rows);
  return Math.max(MIN_CELL, Math.min(byWidth, byHeight));
}

function pad(n: number): string {
  if (n < 0) {
    return `-${String(Math.min(-n, 99)).padStart(2, '0')}`;
  }
  return String(Math.min(n, MAX_DIGITS)).padStart(3, '0');
}

export class BoardView {
  private buttons: HTMLButtonElement[] = [];

  constructor(
    private readonly board: HTMLElement,
    private readonly counter: HTMLElement,
    private readonly timer: HTMLElement,
    private readonly face: HTMLElement,
  ) {}

  mount(game: Game): void {
    this.board.replaceChildren();
    this.buttons = [];
    this.board.style.setProperty('--cols', String(game.cols));
    this.board.style.setProperty('--rows', String(game.rows));
    document.documentElement.style.setProperty('--cols', String(game.cols));
    document.documentElement.style.setProperty('--rows', String(game.rows));
    const frag = document.createDocumentFragment();
    for (let i = 0; i < game.cols * game.rows; i++) {
      const b = document.createElement('button');
      b.className = 'cell';
      b.type = 'button';
      b.dataset.index = String(i);
      this.buttons.push(b);
      frag.appendChild(b);
    }
    this.board.appendChild(frag);
  }

  update(game: Game, indices: number[]): void {
    for (const i of indices) {
      const b = this.buttons[i];
      const cell = game.cells[i];
      if (!b || !cell) continue;
      this.paint(b, game, i);
    }
  }

  revealAll(game: Game): void {
    game.cells.forEach((cell, i) => {
      const b = this.buttons[i];
      if (!b) return;
      if (cell.mine && !cell.flagged) b.classList.add('mine');
      if (!cell.mine && cell.flagged) b.classList.add('wrong-flag');
      if (game.explodedIndex === i) b.classList.add('exploded');
    });
  }

  fit(availWidth: number, availHeight: number): void {
    const cols = Number(this.board.style.getPropertyValue('--cols')) || this.buttons.length;
    const rows = Number(this.board.style.getPropertyValue('--rows')) || 1;
    const size = fitCellSize(cols, rows, availWidth, availHeight);
    this.board.style.setProperty('--cell', `${size}px`);
    document.documentElement.style.setProperty('--cell', `${size}px`);
  }

  setCounter(n: number): void {
    this.counter.textContent = pad(n);
  }

  setTimer(seconds: number): void {
    this.timer.textContent = pad(Math.max(0, seconds));
  }

  setFace(face: Face): void {
    this.face.dataset.face = face;
  }

  private paint(b: HTMLButtonElement, game: Game, i: number): void {
    const cell = game.cells[i];
    if (!cell) return;
    for (let n = 1; n <= 8; n++) b.classList.remove(`n${n}`);
    b.classList.toggle('revealed', cell.revealed);
    b.classList.toggle('flagged', cell.flagged);
    if (cell.revealed && !cell.mine && cell.adjacent > 0) {
      b.classList.add(`n${cell.adjacent}`);
      b.textContent = String(cell.adjacent);
    } else {
      b.textContent = '';
    }
  }
}

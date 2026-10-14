import type { BoardConfig, Cell, Rng, Status } from './types';

export class Game {
  readonly cols: number;
  readonly rows: number;
  readonly mines: number;
  readonly cells: Cell[];

  #rng: Rng;
  #status: Status = 'ready';
  #flags = 0;
  #safeLeft: number;
  #exploded: number | null = null;

  constructor(config: BoardConfig, rng: Rng = Math.random) {
    const { cols, rows, mines } = config;
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
      throw new RangeError(`invalid board size ${cols}x${rows}`);
    }
    if (!Number.isInteger(mines) || mines < 0 || mines > cols * rows - 1) {
      throw new RangeError(`invalid mine count ${mines} for ${cols}x${rows}`);
    }
    this.cols = cols;
    this.rows = rows;
    this.mines = mines;
    this.#rng = rng;
    this.#safeLeft = cols * rows - mines;
    this.cells = Array.from({ length: cols * rows }, () => ({
      mine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
    }));
  }

  get status(): Status {
    return this.#status;
  }

  get flagCount(): number {
    return this.#flags;
  }

  get minesRemaining(): number {
    return this.mines - this.#flags;
  }

  get explodedIndex(): number | null {
    return this.#exploded;
  }

  neighbors(i: number): number[] {
    this.#check(i);
    const row = Math.floor(i / this.cols);
    const col = i % this.cols;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) out.push(r * this.cols + c);
      }
    }
    return out;
  }

  /** Opens cell `i`; returns every index whose state changed. */
  reveal(i: number): number[] {
    this.#check(i);
    if (this.#over()) return [];
    const cell = this.#cell(i);
    if (cell.revealed || cell.flagged) return [];
    if (this.#status === 'ready') {
      this.#placeMines(i);
      this.#status = 'playing';
    }
    if (cell.mine) {
      cell.revealed = true;
      this.#status = 'lost';
      this.#exploded = i;
      return [i];
    }
    return this.#flood(i);
  }

  toggleFlag(i: number): number[] {
    this.#check(i);
    if (this.#over()) return [];
    const cell = this.#cell(i);
    if (cell.revealed) return [];
    cell.flagged = !cell.flagged;
    this.#flags += cell.flagged ? 1 : -1;
    return [i];
  }

  /** Opens the unflagged neighbours of a satisfied number. */
  chord(i: number): number[] {
    this.#check(i);
    if (this.#status !== 'playing') return [];
    const cell = this.#cell(i);
    if (!cell.revealed || cell.adjacent === 0) return [];
    const around = this.neighbors(i);
    const flagged = around.filter((n) => this.#cell(n).flagged).length;
    if (flagged !== cell.adjacent) return [];
    const changed: number[] = [];
    for (const n of around) {
      changed.push(...this.reveal(n));
      if (this.status === 'lost') break;
    }
    return changed;
  }

  #placeMines(first: number): void {
    const total = this.cols * this.rows;
    const guarded = new Set([first, ...this.neighbors(first)]);
    // Too dense to keep the whole neighbourhood clear: only the clicked cell is guaranteed.
    if (total - guarded.size < this.mines) guarded.clear();
    guarded.add(first);
    const pool: number[] = [];
    for (let i = 0; i < total; i++) if (!guarded.has(i)) pool.push(i);
    // Partial Fisher–Yates: the first `mines` slots end up a uniform sample.
    for (let k = 0; k < this.mines; k++) {
      const j = k + Math.floor(this.#rng() * (pool.length - k));
      const pick = pool[j] as number;
      pool[j] = pool[k] as number;
      pool[k] = pick;
      this.#cell(pick).mine = true;
    }
    for (let i = 0; i < total; i++) {
      this.#cell(i).adjacent = this.neighbors(i).filter((n) => this.#cell(n).mine).length;
    }
  }

  #flood(start: number): number[] {
    const changed: number[] = [];
    const stack = [start];
    while (stack.length > 0) {
      const i = stack.pop() as number;
      const cell = this.#cell(i);
      if (cell.revealed || cell.flagged || cell.mine) continue;
      cell.revealed = true;
      changed.push(i);
      this.#safeLeft--;
      if (cell.adjacent === 0) stack.push(...this.neighbors(i));
    }
    if (this.#safeLeft === 0) this.#status = 'won';
    return changed;
  }

  #over(): boolean {
    return this.#status === 'won' || this.#status === 'lost';
  }

  #cell(i: number): Cell {
    return this.cells[i] as Cell;
  }

  #check(i: number): void {
    if (!Number.isInteger(i) || i < 0 || i >= this.cells.length) {
      throw new RangeError(`cell index ${i} out of range`);
    }
  }
}

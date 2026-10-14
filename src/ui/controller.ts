import { DIFFICULTIES } from '../engine/difficulty';
import { Game } from '../engine/game';
import { mulberry32 } from '../engine/rng';
import type { Level, Rng } from '../engine/types';
import { BoardView } from './view';

export type ControllerOptions = {
  level?: Level;
  seed?: number;
  now?: () => number;
  rng?: Rng;
};

const HEADER_ALLOWANCE = 80;

export class Controller {
  private readonly view: BoardView;
  private readonly board: HTMLElement;
  private readonly reset: HTMLElement;
  private readonly difficulty: HTMLSelectElement;
  private readonly now: () => number;
  private level: Level;
  private game!: Game;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private seconds = 0;
  private chordHeld = -1;
  private listeners: Array<[EventTarget, string, EventListener]> = [];

  constructor(
    private readonly doc: Document,
    private readonly options: ControllerOptions = {},
  ) {
    const byId = (id: string) => doc.getElementById(id) as HTMLElement;
    this.board = byId('board');
    this.reset = byId('reset');
    this.difficulty = byId('difficulty') as HTMLSelectElement;
    this.view = new BoardView(this.board, byId('mine-counter'), byId('timer'), this.reset);
    this.now = options.now ?? (() => Date.now());
    this.level = options.level ?? 'beginner';
  }

  start(): void {
    const on = <E extends Event>(t: EventTarget, type: string, fn: (e: E) => void) => {
      t.addEventListener(type, fn as EventListener);
      this.listeners.push([t, type, fn as EventListener]);
    };
    on(this.board, 'contextmenu', (e: Event) => e.preventDefault());
    on(this.board, 'mousedown', (e: MouseEvent) => this.onMouseDown(e));
    on(this.board, 'mouseup', (e: MouseEvent) => this.onMouseUp(e));
    on(this.board, 'auxclick', (e: MouseEvent) => {
      if (e.button === 1) this.act('chord', this.indexOf(e));
    });
    on(this.doc, 'mouseup', () => this.restoreFace());
    on(this.reset, 'click', () => this.newGame(this.level));
    on(this.difficulty, 'change', () => this.newGame(this.difficulty.value as Level));
    const win = this.doc.defaultView;
    if (win) on(win, 'resize', () => this.fit());
    this.newGame(this.level);
  }

  newGame(level: Level = this.level): void {
    this.level = level;
    this.stopTimer();
    this.seconds = 0;
    this.difficulty.value = level;
    const rng =
      this.options.rng ??
      (this.options.seed !== undefined ? mulberry32(this.options.seed) : undefined);
    this.game = new Game(DIFFICULTIES[level], rng);
    this.view.mount(this.game);
    this.view.setCounter(this.game.minesRemaining);
    this.view.setTimer(0);
    this.view.setFace('smile');
    this.fit();
  }

  dispose(): void {
    for (const [t, type, fn] of this.listeners) t.removeEventListener(type, fn);
    this.listeners = [];
    this.stopTimer();
  }

  private fit(): void {
    const win = this.doc.defaultView;
    const w = win?.innerWidth ?? 1280;
    const h = win?.innerHeight ?? 800;
    this.view.fit(w, h - HEADER_ALLOWANCE);
  }

  private indexOf(e: Event): number {
    const el = (e.target as HTMLElement | null)?.closest?.('.cell') as HTMLElement | null;
    if (!el || el.dataset.index === undefined) return -1;
    return Number(el.dataset.index);
  }

  private over(): boolean {
    return this.game.status === 'won' || this.game.status === 'lost';
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.indexOf(e) < 0 || this.over()) return;
    this.view.setFace('ohh');
    if (e.buttons === 3) this.chordHeld = this.indexOf(e);
  }

  private onMouseUp(e: MouseEvent): void {
    const i = this.indexOf(e);
    this.restoreFace();
    if (i < 0) return;
    if (this.chordHeld >= 0) {
      this.chordHeld = -1;
      this.act('chord', i);
      return;
    }
    if (e.button === 0) this.act('reveal', i);
    else if (e.button === 2) this.act('toggleFlag', i);
  }

  private restoreFace(): void {
    if (this.over()) return;
    this.view.setFace('smile');
  }

  private act(kind: 'reveal' | 'toggleFlag' | 'chord', i: number): void {
    if (i < 0 || this.over()) return;
    const changed = this.game[kind](i);
    if (this.game.status === 'playing' && this.timerHandle === null) this.startTimer();
    this.view.update(this.game, changed);
    this.view.setCounter(this.game.minesRemaining);
    if (this.game.status === 'lost') {
      this.stopTimer();
      this.view.revealAll(this.game);
      this.view.setFace('dead');
    } else if (this.game.status === 'won') {
      this.stopTimer();
      for (const c of this.game.cells) if (c.mine) c.flagged = true;
      this.view.update(
        this.game,
        this.game.cells.map((_, idx) => idx),
      );
      this.view.setCounter(0);
      this.view.setFace('cool');
    }
  }

  private startTimer(): void {
    this.startedAt = this.now();
    this.timerHandle = setInterval(() => {
      this.seconds = Math.min(999, Math.floor((this.now() - this.startedAt) / 1000));
      this.view.setTimer(this.seconds);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerHandle !== null) clearInterval(this.timerHandle);
    this.timerHandle = null;
  }
}

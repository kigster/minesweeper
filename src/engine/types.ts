/** One square of the board. */
export type Cell = {
  mine: boolean;
  /** Number of mines among the eight neighbours. */
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
};

export type Status = 'ready' | 'playing' | 'won' | 'lost';

export type Level = 'beginner' | 'intermediate' | 'expert';

export type BoardConfig = { cols: number; rows: number; mines: number };

/** Returns a float in [0, 1). */
export type Rng = () => number;

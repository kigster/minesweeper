import type { BoardConfig, Level } from './types';

export const DIFFICULTIES: Record<Level, BoardConfig> = {
  beginner: { cols: 9, rows: 9, mines: 10 },
  intermediate: { cols: 16, rows: 16, mines: 40 },
  expert: { cols: 30, rows: 16, mines: 99 },
};

export const LEVELS: readonly Level[] = ['beginner', 'intermediate', 'expert'];

export function isLevel(value: unknown): value is Level {
  return typeof value === 'string' && (LEVELS as readonly string[]).includes(value);
}

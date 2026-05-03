export type BoardSide = 'top' | 'right' | 'bottom' | 'left' | 'corner';

export interface BoardAnchor {
  index: number;
  row: number;
  column: number;
  side: BoardSide;
}

export const BOARD_LAYOUT: BoardAnchor[] = [
  { index: 0, row: 6, column: 6, side: 'corner' },
  { index: 1, row: 6, column: 5, side: 'bottom' },
  { index: 2, row: 6, column: 4, side: 'bottom' },
  { index: 3, row: 6, column: 3, side: 'bottom' },
  { index: 4, row: 6, column: 2, side: 'bottom' },
  { index: 5, row: 6, column: 1, side: 'corner' },
  { index: 6, row: 5, column: 1, side: 'left' },
  { index: 7, row: 4, column: 1, side: 'left' },
  { index: 8, row: 3, column: 1, side: 'left' },
  { index: 9, row: 2, column: 1, side: 'left' },
  { index: 10, row: 1, column: 1, side: 'corner' },
  { index: 11, row: 1, column: 2, side: 'top' },
  { index: 12, row: 1, column: 3, side: 'top' },
  { index: 13, row: 1, column: 4, side: 'top' },
  { index: 14, row: 1, column: 5, side: 'top' },
  { index: 15, row: 1, column: 6, side: 'corner' },
  { index: 16, row: 2, column: 6, side: 'right' },
  { index: 17, row: 3, column: 6, side: 'right' },
  { index: 18, row: 4, column: 6, side: 'right' },
  { index: 19, row: 5, column: 6, side: 'right' }
];

const ANCHOR_BY_INDEX = new Map(BOARD_LAYOUT.map((entry) => [entry.index, entry]));

export function getAnchor(index: number): BoardAnchor {
  return ANCHOR_BY_INDEX.get(index) ?? BOARD_LAYOUT[0];
}

export const PROPERTY_GROUP_COLORS: Record<string, { tint: string; ink: string; label: string }> = {
  teal: { tint: '#2dd4bf', ink: '#022c22', label: 'Teal Strip' },
  indigo: { tint: '#818cf8', ink: '#1e1b4b', label: 'Indigo Strip' },
  rose: { tint: '#fb7185', ink: '#4c0519', label: 'Rose Strip' },
  amber: { tint: '#f59e0b', ink: '#451a03', label: 'Amber Strip' },
  emerald: { tint: '#10b981', ink: '#022c22', label: 'Emerald Strip' },
  gold: { tint: '#fbbf24', ink: '#451a03', label: 'Gold Strip' },
  utility: { tint: '#a78bfa', ink: '#1e1b4b', label: 'Utility' }
};

export const PLAYER_TOKEN_COLORS = [
  '#3b82f6',
  '#f43f5e',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#06b6d4',
  '#ec4899',
  '#84cc16'
];

export function tokenColor(playerIndex: number): string {
  return PLAYER_TOKEN_COLORS[playerIndex % PLAYER_TOKEN_COLORS.length];
}

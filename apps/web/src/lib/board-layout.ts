export interface BoardAnchor {
  index: number;
  row: number;
  column: number;
}

export const BOARD_LAYOUT: BoardAnchor[] = [
  { index: 0, row: 5, column: 5 },
  { index: 1, row: 5, column: 4 },
  { index: 2, row: 5, column: 3 },
  { index: 3, row: 5, column: 2 },
  { index: 4, row: 5, column: 1 },
  { index: 5, row: 5, column: 0 },
  { index: 6, row: 4, column: 0 },
  { index: 7, row: 3, column: 0 },
  { index: 8, row: 2, column: 0 },
  { index: 9, row: 1, column: 0 },
  { index: 10, row: 0, column: 0 },
  { index: 11, row: 0, column: 1 },
  { index: 12, row: 0, column: 2 },
  { index: 13, row: 0, column: 3 },
  { index: 14, row: 0, column: 4 },
  { index: 15, row: 0, column: 5 },
  { index: 16, row: 1, column: 5 },
  { index: 17, row: 2, column: 5 },
  { index: 18, row: 3, column: 5 },
  { index: 19, row: 4, column: 5 }
];

export function getAnchorPosition(index: number) {
  const anchor = BOARD_LAYOUT.find((entry) => entry.index === index);
  if (!anchor) {
    return { x: 50, y: 50 };
  }

  const cell = 100 / 6;
  return {
    x: anchor.column * cell + cell / 2,
    y: anchor.row * cell + cell / 2
  };
}

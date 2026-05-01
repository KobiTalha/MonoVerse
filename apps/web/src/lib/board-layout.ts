export interface BoardAnchor {
  index: number;
  row: number;
  column: number;
}

export const BOARD_LAYOUT: BoardAnchor[] = [
  { index: 0, row: 10, column: 10 },
  { index: 1, row: 10, column: 8 },
  { index: 2, row: 10, column: 6 },
  { index: 3, row: 10, column: 4 },
  { index: 4, row: 10, column: 2 },
  { index: 5, row: 10, column: 0 },
  { index: 6, row: 8, column: 0 },
  { index: 7, row: 6, column: 0 },
  { index: 8, row: 4, column: 0 },
  { index: 9, row: 2, column: 0 },
  { index: 10, row: 0, column: 0 },
  { index: 11, row: 0, column: 2 },
  { index: 12, row: 0, column: 4 },
  { index: 13, row: 0, column: 6 },
  { index: 14, row: 0, column: 8 },
  { index: 15, row: 0, column: 10 },
  { index: 16, row: 2, column: 10 },
  { index: 17, row: 4, column: 10 },
  { index: 18, row: 6, column: 10 },
  { index: 19, row: 8, column: 10 }
];

export function getAnchorPosition(index: number) {
  const anchor = BOARD_LAYOUT.find((entry) => entry.index === index);
  if (!anchor) {
    return { x: 50, y: 50 };
  }

  const cell = 100 / 11;
  return {
    x: anchor.column * cell + cell / 2,
    y: anchor.row * cell + cell / 2
  };
}

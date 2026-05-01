export function mulberry32(seed: number) {
  let current = seed >>> 0;
  return () => {
    current += 0x6d2b79f5;
    let value = Math.imul(current ^ (current >>> 15), 1 | current);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleArray<T>(items: T[], seed: number): T[] {
  const next = mulberry32(seed);
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(next() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

export function makeLogId(turn: number, index: number) {
  return `turn-${turn}-entry-${index}`;
}


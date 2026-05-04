function parseClientOrigin(raw: string | undefined): string | string[] | RegExp[] {
  if (!raw || raw.trim() === '' || raw.trim() === '*') {
    return '*';
  }

  const tokens = raw
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return '*';
  }

  const patterns: RegExp[] = [];
  const literals: string[] = [];

  for (const token of tokens) {
    if (token.includes('*')) {
      const escaped = token
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      patterns.push(new RegExp(`^${escaped}$`));
    } else {
      literals.push(token);
    }
  }

  if (patterns.length === 0) {
    return literals;
  }

  if (literals.length === 0) {
    return patterns;
  }

  return [...patterns, ...literals.map((origin) => new RegExp(`^${origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&')}$`))];
}

export const serverConfig = {
  port: Number(process.env.PORT ?? 4001),
  clientOrigin: parseClientOrigin(process.env.CLIENT_ORIGIN ?? 'http://localhost:3000'),
  roomCapacity: Number(process.env.ROOM_CAPACITY ?? 4)
};

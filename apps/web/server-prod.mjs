import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..', '..');

const next = (await import('next')).default;
const { attachMonoVerse } = await import(
  pathToFileURL(resolve(repoRoot, 'apps/server/src/index.ts')).href
);

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, dir: __dirname });
const handler = app.getRequestHandler();

await app.prepare();

const expressApp = express();
const httpServer = createServer(expressApp);

attachMonoVerse({
  httpServer,
  expressApp,
  clientOrigin: '*'
});

expressApp.use((req, res) => handler(req, res));

httpServer.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`MonoVerse combined server listening on ${port}`);
});

import type { Server } from 'bun';
import index from './index.html';

/** Serves the Bun-bundled page at `/`; every other path that is not a bundled asset is a 404. */
export function startServer(port: number = Number(process.env.PORT ?? 3000)): Server<undefined> {
  return Bun.serve({
    port,
    development: process.env.NODE_ENV !== 'production',
    routes: { '/': index },
    fetch: () => new Response('Not Found', { status: 404 }),
  });
}

/** Entry point for `bun server.ts`. */
export function main(log: (line: string) => void = console.log): Server<undefined> {
  const server = startServer();
  log(`Minesweeper running at ${server.url}`);
  return server;
}

if (import.meta.main) main();

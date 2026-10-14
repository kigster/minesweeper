import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import type { Server } from 'bun';
import { main, startServer } from '../server';

let server: Server<undefined>;
let base: string;

// happy-dom replaces the global Response and fetch, which Bun.serve cannot use. The server
// never runs in a DOM, so these tests run against Bun's own globals.
beforeAll(async () => {
  await GlobalRegistrator.unregister();
  server = startServer(0);
  base = server.url.href.replace(/\/$/, '');
});

afterAll(async () => {
  await server.stop(true);
  GlobalRegistrator.register({ url: 'http://localhost:3000/' });
});

const assetUrls = (html: string, pattern: RegExp) =>
  [...html.matchAll(pattern)].map((m) => new URL(m[1] as string, `${base}/`).href);

describe('server', () => {
  test('listens on an ephemeral port when given 0', () => {
    expect(server.port).toBeGreaterThan(0);
  });

  test('GET / serves the page shell as HTML', async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('id="board"');
  });

  test('the bundled script and stylesheet the page references are served', async () => {
    const html = await (await fetch(`${base}/`)).text();
    const scripts = assetUrls(html, /<script[^>]+src="([^"]+)"/g);
    const styles = assetUrls(html, /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g);
    expect(scripts.length).toBeGreaterThan(0);
    expect(styles.length).toBeGreaterThan(0);
    for (const url of scripts) {
      const res = await fetch(url);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('javascript');
      expect((await res.text()).length).toBeGreaterThan(0);
    }
    for (const url of styles) {
      const res = await fetch(url);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/css');
    }
  });

  test('unknown paths return 404', async () => {
    for (const path of ['/nope', '/src/main.ts', '/index.html/x']) {
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('Not Found');
    }
  });

  test('defaults to PORT from the environment', async () => {
    const previous = process.env.PORT;
    process.env.PORT = '0';
    const other = startServer();
    try {
      expect(other.port).toBeGreaterThan(0);
      expect(other.port).not.toBe(server.port);
    } finally {
      await other.stop(true);
      if (previous === undefined) delete process.env.PORT;
      else process.env.PORT = previous;
    }
  });
});

describe('main', () => {
  test('starts on PORT and logs the URL', async () => {
    const previous = process.env.PORT;
    process.env.PORT = '0';
    const lines: string[] = [];
    const started = main((line) => lines.push(line));
    try {
      expect(lines).toEqual([`Minesweeper running at ${started.url}`]);
      expect((await fetch(started.url)).status).toBe(200);
    } finally {
      await started.stop(true);
      if (previous === undefined) delete process.env.PORT;
      else process.env.PORT = previous;
    }
  });

  test('bun server.ts serves the page as a standalone process', async () => {
    const proc = Bun.spawn(['bun', 'server.ts'], {
      cwd: `${import.meta.dir}/..`,
      env: { ...process.env, PORT: '0' },
      stdout: 'pipe',
    });
    try {
      const reader = proc.stdout.getReader();
      const { value } = await reader.read();
      const line = new TextDecoder().decode(value);
      const url = line.match(/running at (\S+)/)?.[1] as string;
      expect(url).toStartWith('http://');
      const res = await fetch(url);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('id="board"');
    } finally {
      proc.kill();
      await proc.exited;
    }
  }, 15_000);
});

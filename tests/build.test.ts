import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const outdir = mkdtempSync(join(tmpdir(), 'minesweeper-build-'));

afterAll(() => rmSync(outdir, { recursive: true, force: true }));

describe('static build', () => {
  test('bun build ./index.html writes an HTML page plus JS and CSS assets', () => {
    const result = Bun.spawnSync(['bun', 'build', './index.html', '--outdir', outdir, '--minify'], {
      cwd: root,
      stderr: 'pipe',
      stdout: 'pipe',
    });
    expect(result.exitCode).toBe(0);
    const files = readdirSync(outdir, { recursive: true }).map(String);
    expect(files).toContain('index.html');
    const js = files.filter((f) => f.endsWith('.js'));
    const css = files.filter((f) => f.endsWith('.css'));
    expect(js.length).toBeGreaterThan(0);
    expect(css.length).toBeGreaterThan(0);
    const html = readFileSync(join(outdir, 'index.html'), 'utf8');
    expect(html).toContain('id="board"');
    for (const asset of [...js, ...css]) expect(html).toContain(asset.split('/').pop() as string);
  }, 30_000);
});

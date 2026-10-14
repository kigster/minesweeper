import { describe, expect, test } from 'bun:test';
import pkg from '../package.json';

describe('scaffold', () => {
  test('happy-dom preload provides a document', () => {
    expect(typeof document).toBe('object');
    const div = document.createElement('div');
    div.id = 'probe';
    document.body.appendChild(div);
    expect(document.getElementById('probe')).toBe(div);
    div.remove();
  });

  test('package.json declares every script the plan relies on', () => {
    expect(pkg.scripts).toEqual({
      dev: 'bun ./index.html',
      start: 'bun server.ts',
      build: 'bun build ./index.html --outdir dist --minify',
      test: 'bun test --coverage',
      lint: 'biome check . && tsc --noEmit',
      'cypress:run': 'cypress run',
      e2e: 'start-server-and-test start http://localhost:3000 cypress:run',
    });
  });

  test('package.json declares the tooling as devDependencies', () => {
    for (const dep of [
      'typescript',
      'bun-types',
      '@biomejs/biome',
      'happy-dom',
      '@happy-dom/global-registrator',
      'cypress',
      'start-server-and-test',
    ]) {
      expect(pkg.devDependencies).toHaveProperty(dep);
    }
  });
});

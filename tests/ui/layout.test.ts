import { beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');

describe('index.html', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = html
      .replace(/^[\s\S]*?<html[^>]*>/i, '')
      .replace(/<\/html>\s*$/i, '')
      .replace(/<(link|script)\b[^>]*>(<\/script>)?/gi, '');
  });

  test.each(['mine-counter', 'reset', 'timer', 'difficulty', 'board'])('has #%s', (id) => {
    expect(document.getElementById(id)).not.toBeNull();
  });

  test('difficulty offers three levels', () => {
    const values = [...document.querySelectorAll('#difficulty option')].map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(values).toEqual(['beginner', 'intermediate', 'expert']);
  });

  test('references stylesheet and module script', () => {
    expect(html).toMatch(/<link[^>]*rel="stylesheet"[^>]*href="\.\/src\/styles\.css"/);
    expect(html).toMatch(/<script[^>]*type="module"[^>]*src="\.\/src\/main\.ts"/);
  });

  test('reset starts with the smile face', () => {
    expect(document.getElementById('reset')?.dataset.face).toBe('smile');
  });
});

describe('styles.css', () => {
  test.each([1, 2, 3, 4, 5, 6, 7, 8])('defines .n%i', (n) => {
    expect(css).toContain(`.n${n}`);
  });

  test('board grid template and cell sizing', () => {
    expect(css).toMatch(
      /#board\s*{[^}]*grid-template-columns:\s*repeat\(var\(--cols\),\s*var\(--cell\)\)/,
    );
    expect(css).toMatch(/grid-auto-rows:\s*var\(--cell\)/);
  });

  test('page does not scroll', () => {
    expect(css).toMatch(/overflow:\s*hidden/);
  });

  test.each(['smile', 'ohh', 'dead', 'cool'])('face state %s', (f) => {
    expect(css).toContain(`data-face="${f}"`);
  });
});

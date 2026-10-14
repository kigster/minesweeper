import type { Level } from './engine/types';
import { Controller } from './ui/controller';

const params = new URLSearchParams(location.search);
const level = params.get('level');
const seed = params.get('seed');
const valid = level === 'beginner' || level === 'intermediate' || level === 'expert';

new Controller(document, {
  level: valid ? (level as Level) : undefined,
  seed: seed === null ? undefined : Number(seed),
}).start();

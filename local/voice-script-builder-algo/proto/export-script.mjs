// 코퍼스+시드 전체를 한 벌의 대본으로 출력 (도구1 voice_script.txt 형식).
// target = 풀 크기 → "가진 거 전부 한 번에" 뽑기.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { coverageVector } from './coverage.mjs';
import { greedySelect } from './select.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(readFileSync(join(HERE, '..', 'corpus', 'corpus-v1.json'), 'utf8'));
const seeds = JSON.parse(readFileSync(join(HERE, '..', 'corpus', 'rare-seed-v1.json'), 'utf8'));

const pool = [
  ...corpus.dialogues.map((d) => ({ id: d.id, turns: d.turns, speakers: d.speakers })),
  ...seeds.dialogues.map((d) => ({ id: d.id, turns: d.turns, speakers: d.turns.map((_, i) => (i % 2 === 0 ? 'A' : 'B')) })),
];

const { selected } = greedySelect(pool.map((d) => ({ ...d })), { minCoverage: 10, temperature: 0.5, seed: 1, targetCount: pool.length });

const text = selected.map((d, i) => {
  const turns = d.turns.map((t, j) => `${d.speakers?.[j] ?? (j % 2 === 0 ? 'A' : 'B')}: ${t}`).join('\n');
  return `[대화 ${i + 1}]\n${turns}`;
}).join('\n\n');

const outPath = join(HERE, '..', 'corpus', 'voice_script_full.txt');
writeFileSync(outPath, text);

const totSyll = selected.reduce((s, d) => s + d.turns.join('').replace(/\s/g, '').length, 0);
const totTurns = selected.reduce((s, d) => s + d.turns.length, 0);
console.log(`한 벌 출력: ${selected.length}대화 / ${totTurns}턴 / 약 ${totSyll}음절`);
console.log(`→ ${outPath} (${(text.length / 1024).toFixed(1)} KB)`);

// 도구2 프로토타입 엔드투엔드 검증.
// 증명 대상: (1) L1 발화-음소 포화  (2) 시드가 ㅞ/ㅒ 빈칸 + L2 자모를 닫나  (3) 실행마다 다른 200세트.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { coverageVector, decompose, CHO, JUNG } from './coverage.mjs';
import { greedySelect, REP_FINALS, L2_JAMO, buildTargets, spellingFinalSet } from './select.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(readFileSync(join(HERE, '..', 'corpus', 'corpus-v1.json'), 'utf8'));
const seeds = JSON.parse(readFileSync(join(HERE, '..', 'corpus', 'rare-seed-v1.json'), 'utf8'));

const pool = [
  ...corpus.dialogues.map((d) => ({ id: d.id, turns: d.turns, kind: 'natural' })),
  ...seeds.dialogues.map((d) => ({ id: d.id, turns: d.turns, kind: 'rare-seed', l2: d.layer === 'L2' ? d.targetJamo : null })),
];
console.log(`풀: ${pool.length} (자연 ${corpus.dialogues.length} + 시드 ${seeds.dialogues.length})\n`);

const minCoverage = 10;

function l1Report(selected) {
  const totals = {};
  for (const d of selected) { const v = coverageVector(d.turns.join(' ')); for (const k in v) totals[k] = (totals[k] || 0) + v[k]; }
  const t = buildTargets(minCoverage);
  const grp = (list, pre) => {
    const below = list.filter((c) => (totals[pre + c] || 0) < t[pre + c]);
    return { met: list.length - below.length, total: list.length, below: below.map((c) => `${c}=${totals[pre + c] || 0}`) };
  };
  return { cho: grp(CHO, 'I_'), jung: grp(JUNG, 'M_'), fin: grp(REP_FINALS, 'F_') };
}

function l2Report(selected) {
  const present = new Set();
  for (const d of selected) for (const j of spellingFinalSet(d.turns)) present.add(j);
  return L2_JAMO.map((j) => `${j}:${present.has(j) ? '✅' : '❌'}`).join(' ');
}

// 시드 보장 게이트: L2 자모가 선택에 없으면 해당 시드를 강제 포함(자연 1개와 교체)
function seedGate(selected) {
  const present = new Set();
  for (const d of selected) for (const j of spellingFinalSet(d.turns)) present.add(j);
  for (const j of L2_JAMO) {
    if (present.has(j)) continue;
    const seed = pool.find((d) => d.l2 === j && !selected.includes(d));
    if (!seed) continue;
    const swapIdx = selected.map((d, i) => [d, i]).reverse().find(([d]) => d.kind === 'natural')?.[1];
    if (swapIdx != null) selected[swapIdx] = seed; else selected.push(seed);
    for (const jj of spellingFinalSet(seed.turns)) present.add(jj);
  }
  return selected;
}

function run(seed, targetCount) {
  const { selected } = greedySelect(pool.map((d) => ({ ...d })), { minCoverage, temperature: 0.5, seed, targetCount });
  seedGate(selected);
  return selected;
}

// (A) 커버리지: 200세트
console.log('━━ (A) 커버리지 (target 200, 풀 전체) ━━');
const full = run(1, 200);
const r = l1Report(full);
console.log(`L1 초성: ${r.cho.met}/${r.cho.total}${r.cho.below.length ? ' 미달:' + r.cho.below.join(',') : ' ✅'}`);
console.log(`L1 중성: ${r.jung.met}/${r.jung.total}${r.jung.below.length ? ' 미달:' + r.jung.below.join(',') : ' ✅'}`);
console.log(`L1 종성(7대표): ${r.fin.met}/${r.fin.total}${r.fin.below.length ? ' 미달:' + r.fin.below.join(',') : ' ✅'}`);
console.log(`L2 표기보장: ${l2Report(full)}`);

// (B) 다양성: target 150을 다른 시드로 두 번 → 겹침률
console.log('\n━━ (B) 다양성 (target 150, seed 1 vs 2) ━━');
const s1 = run(1, 150), s2 = run(2, 150);
const ids1 = new Set(s1.map((d) => d.id)), ids2 = new Set(s2.map((d) => d.id));
const inter = [...ids1].filter((x) => ids2.has(x)).length;
const jacc = inter / (ids1.size + ids2.size - inter);
console.log(`seed1 ∩ seed2 = ${inter}/150  (자카드 겹침 ${(jacc * 100).toFixed(1)}%, 낮을수록 다양)`);
const r2 = l1Report(s1);
console.log(`target150에서도 L1 초성 ${r2.cho.met}/${r2.cho.total}, 중성 ${r2.jung.met}/${r2.jung.total}, 종성 ${r2.fin.met}/${r2.fin.total}`);

// (C) ㅞ/ㅒ 빈칸 확인 (시드 유무 비교)
console.log('\n━━ (C) ㅞ/ㅒ 발화 빈칸 닫힘 확인 ━━');
const tot = {};
for (const d of full) { const v = coverageVector(d.turns.join(' ')); for (const k in v) tot[k] = (tot[k] || 0) + v[k]; }
console.log(`ㅞ(M_ㅞ)=${tot['M_ㅞ'] || 0}, ㅒ(M_ㅒ)=${tot['M_ㅒ'] || 0}  (시드 전 코퍼스값 ㅞ=0, ㅒ=4)`);

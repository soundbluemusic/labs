// 도구2 선택 엔진 (브라우저 TS) — 도구1 greedySelect 포팅 + 두 변경:
//  1) 커버리지를 L1 발화-음소 기준(coverage.ts), 종성 타깃 = 7대표음.
//  2) Phase B를 softmax 확률 샘플링으로 (매 실행 다른 세트).
import { coverageVector, CHO, JUNG, REP_FINALS, type PhonemeVec } from "./coverage";

export interface Dialogue {
  id: string;
  turns: string[];
  speakers?: string[];
  kind?: "natural" | "rare-seed";
  l2?: string | null;
  vec?: PhonemeVec;
  syll?: number;
}

export const TARGET_DIALOGUES = 200;

/** 시드 가능한 PRNG (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildTargets(minCoverage: number): Record<string, number> {
  const target: Record<string, number> = {};
  CHO.forEach((c) => (target["I_" + c] = minCoverage));
  JUNG.forEach((v) => (target["M_" + v] = minCoverage));
  REP_FINALS.forEach((f) => (target["F_" + f] = Math.max(3, Math.floor(minCoverage / 3))));
  return target;
}

export interface SelectOptions {
  minCoverage?: number;
  temperature?: number;
  seed?: number;
  targetCount?: number;
}

export interface SelectResult {
  selected: Dialogue[];
  finalCoverage: Record<string, number>;
  target: Record<string, number>;
}

export function greedySelect(pool: Dialogue[], opts: SelectOptions = {}): SelectResult {
  const { minCoverage = 10, temperature = 0.5, seed = 1, targetCount = TARGET_DIALOGUES } = opts;
  const rng = makeRng(seed);
  const target = buildTargets(minCoverage);
  for (const d of pool) {
    if (!d.vec) {
      d.vec = coverageVector(d.turns.join(" "));
      d.syll = d.turns.join("").replace(/\s/g, "").length;
    }
  }

  const current: Record<string, number> = {};
  Object.keys(target).forEach((k) => (current[k] = 0));
  const selected: Dialogue[] = [];
  const available = shuffle(pool, rng);

  // Phase A: 결핍 음소 그리디
  while (available.length > 0 && selected.length < targetCount) {
    const deficit: Record<string, number> = {};
    let totalDeficit = 0;
    for (const k of Object.keys(target)) {
      const d = Math.max(0, target[k] - current[k]);
      if (d > 0) {
        deficit[k] = d;
        totalDeficit += d;
      }
    }
    if (totalDeficit === 0) break;
    let bestIdx = -1,
      bestEff = 0,
      bestGain = 0;
    for (let i = 0; i < available.length; i++) {
      const d = available[i];
      let gain = 0;
      for (const k of Object.keys(d.vec!)) if (deficit[k]) gain += Math.min(d.vec![k], deficit[k]);
      if (gain === 0) continue;
      const eff = gain / (d.syll || 1);
      if (eff > bestEff || (eff === bestEff && gain > bestGain)) {
        bestEff = eff;
        bestGain = gain;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    const picked = available.splice(bestIdx, 1)[0];
    selected.push(picked);
    for (const k of Object.keys(picked.vec!)) current[k] = (current[k] || 0) + picked.vec![k];
  }

  // Phase B: softmax 확률 샘플링
  while (available.length > 0 && selected.length < targetCount) {
    const weights: Record<string, number> = {};
    for (const k of Object.keys(current)) weights[k] = 1 / Math.sqrt(current[k] + 1);
    const scores = available.map((d) => {
      let s = 0;
      for (const k of Object.keys(d.vec!)) s += d.vec![k] * (weights[k] || 1);
      return s / (d.syll || 1);
    });
    const mx = Math.max(...scores);
    const exps = scores.map((s) => Math.exp((s - mx) / temperature));
    const sum = exps.reduce((a, b) => a + b, 0);
    let r = rng() * sum,
      idx = 0;
    for (; idx < exps.length; idx++) {
      r -= exps[idx];
      if (r <= 0) break;
    }
    if (idx >= available.length) idx = available.length - 1;
    const picked = available.splice(idx, 1)[0];
    selected.push(picked);
    for (const k of Object.keys(picked.vec!)) current[k] = (current[k] || 0) + picked.vec![k];
  }

  return { selected, finalCoverage: current, target };
}

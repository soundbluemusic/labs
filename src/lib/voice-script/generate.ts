// 도구2 고수준 API — 알고리즘 합성기로 새 대화를 생성한 뒤 음소 균형 선별.
// 코퍼스(사용자 txt) 재사용 없음. 런타임 LLM/네트워크 없음.
import seedData from "./seeds.json";
import { greedySelect, buildTargets, type Dialogue } from "./select";
import { coverageVector, spellingFinalSet, CHO, JUNG, REP_FINALS, L2_JAMO } from "./coverage";
import { synthesizePool } from "./synth";

interface SeedDialogue { id: string; targetJamo: string; layer: "L1" | "L2"; turns: string[]; }
const seeds = seedData as { dialogues: SeedDialogue[] };
const altSpeakers = (turns: string[]) => turns.map((_, i) => (i % 2 === 0 ? "A" : "B"));

function seedGate(selected: Dialogue[], pool: Dialogue[]): void {
  const present = new Set<string>();
  for (const d of selected) for (const j of spellingFinalSet(d.turns)) present.add(j);
  for (const j of L2_JAMO) {
    if (present.has(j)) continue;
    const seed = pool.find((d) => d.l2 === j && !selected.includes(d));
    if (!seed) continue;
    let swapIdx = -1;
    for (let i = selected.length - 1; i >= 0; i--) {
      if (selected[i].kind === "natural") { swapIdx = i; break; }
    }
    if (swapIdx >= 0) selected[swapIdx] = seed; else selected.push(seed);
    for (const jj of spellingFinalSet(seed.turns)) present.add(jj);
  }
}

export interface CoverageStat {
  cho: { met: number; total: number };
  jung: { met: number; total: number };
  fin: { met: number; total: number };
  l2: { jamo: string; present: boolean }[];
}

export function coverageStat(selected: Dialogue[], minCoverage = 10): CoverageStat {
  const totals: Record<string, number> = {};
  for (const d of selected) {
    const v = coverageVector(d.turns.join(" "));
    for (const k in v) totals[k] = (totals[k] || 0) + v[k];
  }
  const t = buildTargets(minCoverage);
  const grp = (list: readonly string[], pre: string) => ({
    met: list.filter((c) => (totals[pre + c] || 0) >= t[pre + c]).length,
    total: list.length,
  });
  const present = new Set<string>();
  for (const d of selected) for (const j of spellingFinalSet(d.turns)) present.add(j);
  return {
    cho: grp(CHO, "I_"),
    jung: grp(JUNG, "M_"),
    fin: grp(REP_FINALS, "F_"),
    l2: L2_JAMO.map((j) => ({ jamo: j, present: present.has(j) })),
  };
}

export interface GeneratedScript {
  dialogues: { speakers: string[]; turns: string[]; syllables: number[] }[];
  totalDialogues: number;
  totalTurns: number;
  totalSyllables: number;
  coverage: CoverageStat;
}

const syll = (s: string) => (s.match(/[가-힣]/g) || []).length;

export function generate(opts: { minCoverage?: number; targetCount?: number; seed?: number } = {}): GeneratedScript {
  const minCoverage = opts.minCoverage ?? 10;
  const targetCount = opts.targetCount ?? 200;
  const seed = opts.seed ?? Math.floor(Math.random() * 0x7fffffff) + 1;

  // 1) 알고리즘 합성기로 후보 대화 대량 생성 (매 실행 다른 seed → 다른 조합)
  const synth = synthesizePool(targetCount * 3, seed);
  const pool: Dialogue[] = synth.map((d, i) => ({
    id: "g-" + i, turns: d.turns, speakers: d.speakers, kind: "natural" as const,
  }));
  // 2) 손작성 희귀자모 시드 합류 (ㅞ/ㅒ + L2 보장)
  for (const s of seeds.dialogues) {
    pool.push({ id: s.id, turns: s.turns, speakers: altSpeakers(s.turns), kind: "rare-seed", l2: s.layer === "L2" ? s.targetJamo : null });
  }
  // 3) 음소 균형 선별 + 시드 게이트
  const target = Math.min(targetCount, pool.length);
  const { selected } = greedySelect(pool.map((d) => ({ ...d, vec: undefined, syll: undefined })), { minCoverage, targetCount: target, temperature: 0.5, seed });
  seedGate(selected, pool);

  const dialogues = selected.map((d) => ({
    speakers: d.speakers ?? altSpeakers(d.turns),
    turns: d.turns,
    syllables: d.turns.map(syll),
  }));
  return {
    dialogues,
    totalDialogues: dialogues.length,
    totalTurns: dialogues.reduce((s, d) => s + d.turns.length, 0),
    totalSyllables: dialogues.reduce((s, d) => s + d.syllables.reduce((a, b) => a + b, 0), 0),
    coverage: coverageStat(selected, minCoverage),
  };
}

export function formatScript(script: GeneratedScript): string {
  return script.dialogues
    .map((d, i) => {
      const turns = d.turns.map((t, j) => `${d.speakers[j] ?? (j % 2 === 0 ? "A" : "B")}: ${t}`).join("\n");
      return `[대화 ${i + 1}]\n${turns}`;
    })
    .join("\n\n");
}

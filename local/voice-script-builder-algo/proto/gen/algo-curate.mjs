// 결정론적 알고리즘 엄선기 — LLM 없이 녹음품질 점수화.
// LLM 심사의 실제 탈락 사유(종결어미 단조 반복, 약한 반응성, 근접중복, 빈약한 어휘/길이)를 규칙으로 코드화.
import { readFileSync } from "node:fs";

const REACTION_WORDS = ["맞아","맞아요","맞죠","맞네","그렇지","그러게","그러네","그렇구나","그렇군","그랬구나","그랬어","진짜","정말","저도","나도","그래","그래요","어머","그죠","그쵸","저는","나는","어때","어떤","얼마","언제","어디","왜","뭐","그게","그거","그것","거기","거긴","글쎄","우와","대박","헐","근데","그런데","있잖","있죠","그러면","그럼"];
const syl = (s) => (s.match(/[가-힣]/g) || []).length;

function reaction(turns) {
  const b = turns[1] || "";
  const aWords = (turns[0] || "").match(/[가-힣]{2,}/g) || [];
  const stems = new Set();
  for (const w of aWords) { stems.add(w); if (w.length >= 3) stems.add(w.slice(0, -1)); if (w.length >= 4) stems.add(w.slice(0, -2)); }
  const ref = [...stems].some((s) => s.length >= 2 && b.includes(s));
  const word = REACTION_WORDS.some((w) => b.includes(w));
  return { ref, word };
}

// 턴의 종결어미 분류 (긴 패턴 우선)
function ending(t) {
  const s = t.replace(/[.?!…~]+$/, "").trim();
  const P = [
    [/(더라고요?|더라구요?)$/, "더라고"], [/던데요?$/, "던데"], [/(습니다|ㅂ니다|습니까|ㅂ니까)$/, "격식"],
    [/거든요?$/, "거든"], [/잖아요?$/, "잖아"], [/(네요|군요|는군요)$/, "감탄"], [/(까요|나요|ㄹ까요)$/, "의문"],
    [/(더라|더군)$/, "더라"], [/거든$/, "거든ㅂ"], [/잖아$/, "잖아ㅂ"], [/지$/, "지"], [/네$/, "네"],
    [/(았다|었다|ㄴ다|는다|한다|된다|다)$/, "평어"], [/(예요|에요|이에요|어요|아요|해요|세요|죠|요)$/, "요"],
    [/(어|아|야|해|구나|군)$/, "반말"],
  ];
  for (const [re, tag] of P) if (re.test(s)) return tag;
  return "기타";
}

// 한 대화 점수 (0~10) + 세부
export function scoreDialogue(turns) {
  const sc = turns.map(syl);
  // 게이트(완결성)
  const wellformed = turns.length >= 3 && turns.length <= 6 && sc.every((s) => s >= 4 && s <= 40) && sc.reduce((a, b) => a + b, 0) >= 20;
  const r = reaction(turns);
  // 1) 반응성 (0~3) — B가 A를 진짜 받는지
  const react = r.ref ? 3 : r.word ? 1.5 : 0;
  // 2) 종결어미 다양성 (0~2.5) — 같은 어미 반복이 LLM 최다 탈락사유
  const ends = turns.map(ending);
  const counts = {}; for (const e of ends) counts[e] = (counts[e] || 0) + 1;
  const maxRep = Math.max(...Object.values(counts));
  const distinct = new Set(ends).size;
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  // 평어(~다)·격식(~습니다)은 레지스터 특성상 반복이 정상 → 페널티 면제
  const consistent = dominant === "평어" || dominant === "격식";
  let endVar;
  if (consistent) {
    endVar = 1.6;
  } else {
    endVar = distinct >= 3 ? 2.5 : distinct === 2 ? 1.3 : 0;
    if (maxRep >= 4) endVar = 0;        // 회화체에서 4턴 같은 어미 → 낭독 단조(LLM 최다 탈락)
    else if (maxRep === 3) endVar = Math.min(endVar, 0.8);
  }
  // 3) 어휘 다양성 (0~2.5)
  const toks = turns.flatMap((t) => t.match(/[가-힣]+/g) || []);
  const ttr = toks.length ? new Set(toks).size / toks.length : 0;
  const vocab = Math.min(2.5, ttr * 2.7);
  // 4) 길이 적합 (0~2) — 낭독하기 좋은 길이대
  const avg = sc.reduce((a, b) => a + b, 0) / sc.length;
  const lenFit = (avg >= 9 && avg <= 24 ? 1.2 : 0.4) + (turns.length === 4 ? 0.5 : 0) + (sc.every((s) => s >= 6 && s <= 30) ? 0.3 : 0);
  const total = wellformed ? react + endVar + vocab + lenFit : 0;
  return { total: +total.toFixed(2), wellformed, react, endVar: +endVar.toFixed(2), vocab: +vocab.toFixed(2), lenFit: +lenFit.toFixed(2), ends, maxRep };
}

// 파싱 (결과화면 형식)
function parseRaw(text) {
  const lines = text.split("\n").map((l) => l.trim());
  const out = []; let cur = null, sp = null;
  for (const line of lines) {
    if (!line) continue;
    if (/^대화\s*\d+$/.test(line)) { if (cur && cur.length) out.push(cur); cur = []; sp = null; continue; }
    if (line === "A" || line === "B") { sp = line; continue; }
    if (/^\d+$/.test(line)) continue;
    if (cur && sp) { cur.push(line); sp = null; }
  }
  if (cur && cur.length) out.push(cur);
  return out;
}

// === 실행: 400개 점수 + LLM 일치 검증 ===
if (process.argv[1] && process.argv[1].endsWith("algo-curate.mjs")) {
  const corpus = JSON.parse(readFileSync("local/voice-script-builder-algo/corpus/corpus-v1.json", "utf8")).dialogues;
  const base = "/private/tmp/claude-501/-Volumes-X10-Pro-labs-soundbluemusic/4a370ed9-c540-4f7e-8e3d-1615f001527c/tasks/";
  const llm = {};
  for (const f of ["wv7uu30w1.output", "ws8mw21n0.output"]) {
    try { for (const s of JSON.parse(readFileSync(base + f, "utf8")).result.scores) llm[s.index] = s; } catch {}
  }
  const rows = corpus.map((d, i) => ({ i, a: scoreDialogue(d.turns), l: llm[i] }));
  // 임계값 보정: 알고리즘 keep 비율을 LLM keep 비율(≈54%)에 맞춤
  const sorted = rows.slice().sort((a, b) => b.a.total - a.a.total);
  const llmKeep = rows.filter((r) => r.l && r.l.keep).length;
  const thresh = sorted[llmKeep - 1].a.total;
  for (const r of rows) r.aKeep = r.a.total >= thresh;

  let agree = 0, bothKeep = 0, bothDrop = 0, onlyAlgo = 0, onlyLlm = 0;
  for (const r of rows) {
    const lk = !!(r.l && r.l.keep);
    if (r.aKeep === lk) agree++;
    if (r.aKeep && lk) bothKeep++;
    if (!r.aKeep && !lk) bothDrop++;
    if (r.aKeep && !lk) onlyAlgo++;
    if (!r.aKeep && lk) onlyLlm++;
  }
  console.log(`알고리즘 임계값: ${thresh}점 (keep ${rows.filter(r=>r.aKeep).length} / LLM keep ${llmKeep})`);
  console.log(`\n=== 알고리즘 vs LLM 심사 일치도 (400개) ===`);
  console.log(`전체 일치: ${agree}/400 (${(100*agree/400).toFixed(1)}%)`);
  console.log(`  둘 다 채택: ${bothKeep}  |  둘 다 탈락: ${bothDrop}`);
  console.log(`  알고리즘만 채택: ${onlyAlgo}  |  LLM만 채택: ${onlyLlm}`);
  // LLM이 강하게 탈락(≤6점)시킨 것을 알고리즘도 탈락시키나
  const llmBad = rows.filter((r) => r.l && r.l.score <= 6);
  const caught = llmBad.filter((r) => !r.aKeep).length;
  console.log(`\nLLM 저품질(≤6점) ${llmBad.length}개 중 알고리즘도 탈락: ${caught} (${(100*caught/llmBad.length).toFixed(0)}%)`);
  // 종결어미 반복 탈락 케이스
  const repCases = rows.filter((r) => r.a.maxRep >= 4 && r.a.wellformed);
  console.log(`\n종결어미 4턴 반복 검출: ${repCases.length}개 (전부 저점 처리) — 예: 원본#${repCases.slice(0,3).map(r=>r.i+1).join(", ")}`);
}

// Corpus analyzer for Tool 1 (Claude) generated voice-cloning scripts.
// Reimplements Tool 1's EXACT phoneme logic (source.jsx) so coverage numbers
// are directly comparable to what the tool itself reports, then adds deeper
// corpus statistics to judge feasibility of an algorithmic generator.
//
// Usage: node analyze.mjs <rawfile.txt> [minCoverage=10]

import { readFileSync } from 'node:fs';

// ===== Tool 1's exact constants (source.jsx lines 4-6) =====
const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const VOWELS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const FINALS = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function decompose(syllable) {
  const code = syllable.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return null;
  return {
    initial: INITIALS[Math.floor(code / 588)],
    medial: VOWELS[Math.floor((code % 588) / 28)],
    final: FINALS[code % 28],
  };
}

function phonemeVector(text) {
  const vec = {};
  for (const ch of text) {
    const d = decompose(ch);
    if (!d) continue;
    vec['I_' + d.initial] = (vec['I_' + d.initial] || 0) + 1;
    vec['M_' + d.medial] = (vec['M_' + d.medial] || 0) + 1;
    if (d.final) vec['F_' + d.final] = (vec['F_' + d.final] || 0) + 1;
  }
  return vec;
}

// ===== Tool 1's exact reaction words (source.jsx line 70) =====
const reactionWords = ['맞아','맞아요','맞죠','맞네','그렇지','그러게','그러네','그렇구나','그렇군','그랬구나','그랬어','진짜','정말','저도','나도','그래','그래요','어머','그죠','그쵸','저는','나는','어때','어떤','얼마','언제','어디','왜','뭐','그게','그거','그것','거기','거긴','글쎄','우와','대박','헐','근데','그런데','있잖','있죠','그러면','그럼'];

function hasReaction(turns) {
  if (turns.length < 2) return false;
  const bText = turns[1].text;
  const aWords = (turns[0].text.match(/[가-힣]{2,}/g) || []);
  const stems = new Set();
  for (const w of aWords) {
    stems.add(w);
    if (w.length >= 3) stems.add(w.slice(0, -1));
    if (w.length >= 4) stems.add(w.slice(0, -2));
  }
  const hasWordRef = [...stems].some((s) => s.length >= 2 && bText.includes(s));
  const hasReactionWord = reactionWords.some((w) => bText.includes(w));
  return { pass: hasWordRef || hasReactionWord, hasWordRef, hasReactionWord };
}

// ===== Parse the pasted UI format =====
// 대화 N / A / <text> / <count> / B / <text> / <count> / ...
function parseRaw(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const dialogues = [];
  let cur = null;
  let pendingSpeaker = null;
  for (const line of lines) {
    if (!line) continue;
    if (/^대화\s+\d+$/.test(line)) {
      if (cur && cur.turns.length) dialogues.push(cur);
      cur = { turns: [] };
      pendingSpeaker = null;
      continue;
    }
    if (line === 'A' || line === 'B') { pendingSpeaker = line; continue; }
    if (/^\d+$/.test(line)) { continue; } // syllable-count badge from the UI
    // otherwise: a text line
    if (cur && pendingSpeaker) {
      cur.turns.push({ speaker: pendingSpeaker, text: line });
      pendingSpeaker = null;
    }
  }
  if (cur && cur.turns.length) dialogues.push(cur);
  return dialogues;
}

const syllCount = (s) => (s.match(/[가-힣]/g) || []).length;

// ===== Ending classification (heuristic, by terminal morphology) =====
function classifyEnding(text) {
  const t = text.replace(/[.?!…]+$/, '').trim();
  if (/(습니다|입니다|습니까|ㅂ니다|ㅂ니까|겠습니다)$/.test(t)) return '격식 존댓말 (~습니다)';
  if (/(네요|군요|까요|나요|는데요|던데요|더라고요|거든요|잖아요|죠|예요|에요|이에요|어요|아요|해요|세요|要|요)$/.test(t)) {
    if (/(더라고요|던데요|더군요)$/.test(t)) return '회상·공감 (~더라고요)';
    if (/(네요|군요|까요|나요)$/.test(t)) return '감탄·의문 (~네요/까요)';
    return '친근 존댓말 (~요/죠/거든요)';
  }
  if (/(더라|던데|더군)$/.test(t)) return '회상·반말 (~더라/던데)';
  if (/(잖아|거든|지|네|야|어|아|해|구나|군|던가)$/.test(t)) return '반말 친근 (~지/거든/네/야)';
  if (/(다|었다|했다|된다|한다|진다|간다|온다)$/.test(t)) return '평어 서술 (~다)';
  return '기타';
}

// ===== Run =====
const file = process.argv[2];
const minCoverage = parseInt(process.argv[3] || '10', 10);
const raw = readFileSync(file, 'utf8');
const dialogues = parseRaw(raw);

// Per-dialogue enrichment + Tool 1 validity check
let validCount = 0;
const turnCounts = {};
const perTurnSyll = [];
const perDlgSyll = [];
const endingCounts = {};
let reactWordHits = 0;
let wordRefHits = 0;
const reactionUsage = {};
const totals = {};
const keys = new Set();
let dupes = 0;
const tokenFreq = new Map();
let totalTokens = 0;

for (const d of dialogues) {
  const turns = d.turns;
  turnCounts[turns.length] = (turnCounts[turns.length] || 0) + 1;
  const fullText = turns.map((t) => t.text).join(' ');
  const vec = phonemeVector(fullText);
  for (const k of Object.keys(vec)) totals[k] = (totals[k] || 0) + vec[k];

  const tSyll = turns.map((t) => syllCount(t.text));
  perTurnSyll.push(...tSyll);
  perDlgSyll.push(tSyll.reduce((a, b) => a + b, 0));

  // ending of last turn
  const e = classifyEnding(turns[turns.length - 1].text);
  endingCounts[e] = (endingCounts[e] || 0) + 1;

  // reaction analysis on B's first reply
  const r = hasReaction(turns);
  if (r.hasReactionWord) reactWordHits++;
  if (r.hasWordRef) wordRefHits++;
  if (turns[1]) {
    for (const w of reactionWords) if (turns[1].text.includes(w)) reactionUsage[w] = (reactionUsage[w] || 0) + 1;
  }

  // Tool 1 validity (parseDialogues criteria)
  const okTurnCount = turns.length >= 3 && turns.length <= 6;
  const okSyll = tSyll.every((s) => s >= 4 && s <= 40);
  const speakers = new Set(turns.map((t) => t.speaker));
  const totalS = tSyll.reduce((a, b) => a + b, 0);
  if (okTurnCount && okSyll && speakers.size >= 2 && totalS >= 20 && r.pass) validCount++;

  // dedup key
  const key = turns.map((t) => t.text).join('|');
  if (keys.has(key)) dupes++; else keys.add(key);

  // vocab
  for (const w of fullText.match(/[가-힣]+/g) || []) {
    totalTokens++;
    tokenFreq.set(w, (tokenFreq.get(w) || 0) + 1);
  }
}

const sum = (a) => a.reduce((x, y) => x + y, 0);
const mean = (a) => sum(a) / a.length;

function covReport(label, list, prefix, target) {
  const rows = list.filter((c) => prefix !== 'F_' || c !== '').map((c) => ({ c, n: totals[prefix + c] || 0 }));
  const met = rows.filter((r) => r.n >= target).length;
  const below = rows.filter((r) => r.n < target).sort((a, b) => a.n - b.n);
  return { label, total: rows.length, met, below, rows };
}

const finalTarget = Math.max(3, Math.floor(minCoverage / 3));
const initR = covReport('초성', INITIALS, 'I_', minCoverage);
const medR = covReport('중성', VOWELS, 'M_', minCoverage);
const finR = covReport('종성', FINALS.filter((f) => f), 'F_', finalTarget);

console.log('═══════════════════════════════════════════════════════');
console.log(`CORPUS ANALYSIS — ${file}`);
console.log(`minCoverage = ${minCoverage}  (종성 target = ${finalTarget})`);
console.log('═══════════════════════════════════════════════════════\n');

console.log(`대화 수: ${dialogues.length}`);
console.log(`Tool 1 유효성 통과: ${validCount}/${dialogues.length} (${(100 * validCount / dialogues.length).toFixed(1)}%)`);
console.log(`중복(key 동일): ${dupes}`);
console.log(`턴 수 분포: ${JSON.stringify(turnCounts)}`);
console.log(`턴당 음절: min=${Math.min(...perTurnSyll)} max=${Math.max(...perTurnSyll)} mean=${mean(perTurnSyll).toFixed(1)}`);
console.log(`대화당 음절: min=${Math.min(...perDlgSyll)} max=${Math.max(...perDlgSyll)} mean=${mean(perDlgSyll).toFixed(1)} 총합=${sum(perDlgSyll)}`);
console.log(`총 턴 수: ${perTurnSyll.length}`);

console.log('\n── 종결어미 분포 ──');
for (const [k, v] of Object.entries(endingCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(3)}  ${k}`);
}

console.log('\n── 반응성(B 첫 응답) ──');
console.log(`  reactionWord 포함: ${reactWordHits}/${dialogues.length} (${(100 * reactWordHits / dialogues.length).toFixed(0)}%)`);
console.log(`  A 단어 재참조:     ${wordRefHits}/${dialogues.length} (${(100 * wordRefHits / dialogues.length).toFixed(0)}%)`);
console.log('  상위 맞장구 표현:');
for (const [w, n] of Object.entries(reactionUsage).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`    ${String(n).padStart(3)}  ${w}`);
}

console.log('\n── 어휘 다양성 ──');
console.log(`  총 토큰(어절): ${totalTokens}  고유: ${tokenFreq.size}  TTR: ${(tokenFreq.size / totalTokens).toFixed(3)}`);
console.log('  최빈 어절 20:');
const topTokens = [...tokenFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
console.log('    ' + topTokens.map(([w, n]) => `${w}(${n})`).join(' '));

function printCov(r) {
  console.log(`\n── ${r.label} 커버리지: ${r.met}/${r.total} 도달 ──`);
  if (r.below.length) {
    console.log('  미달:');
    for (const b of r.below) console.log(`    ${b.c} = ${b.n}`);
  } else {
    console.log('  ✅ 전부 도달');
  }
}
printCov(initR);
printCov(medR);
printCov(finR);

// Rare phoneme spotlight
console.log('\n── 희귀 음소 스포트라이트 ──');
const rareInit = ['ㅃ','ㄸ','ㅉ','ㄲ','ㅆ'];
const rareVow = ['ㅒ','ㅖ','ㅢ','ㅙ','ㅞ','ㅚ','ㅝ'];
const rareFin = ['ㄳ','ㄵ','ㄶ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅄ','ㄲ','ㅆ'];
console.log('  초성: ' + rareInit.map((c) => `${c}=${totals['I_' + c] || 0}`).join('  '));
console.log('  중성: ' + rareVow.map((c) => `${c}=${totals['M_' + c] || 0}`).join('  '));
console.log('  종성: ' + rareFin.map((c) => `${c}=${totals['F_' + c] || 0}`).join('  '));

// Extrapolation: how many such exports to meet minCoverage everywhere?
console.log('\n── 외삽: 이 분포가 유지된다고 가정할 때 ──');
function exportsNeeded(r, target) {
  let worst = 0;
  for (const row of r.rows) {
    if (prefixCount(row) === 0) continue;
  }
  // multiplier to bring the WORST phoneme to target
  const nonzero = r.rows.filter((x) => x.n > 0);
  const zero = r.rows.filter((x) => x.n === 0);
  const minNonzero = nonzero.length ? Math.min(...nonzero.map((x) => x.n)) : 0;
  const mult = minNonzero ? Math.ceil(target / minNonzero) : Infinity;
  return { mult, zeroPhonemes: zero.map((x) => x.c) };
}
function prefixCount() { return 1; }
for (const [r, t] of [[initR, minCoverage], [medR, minCoverage], [finR, finalTarget]]) {
  const e = exportsNeeded(r, t);
  console.log(`  ${r.label}: 0회 음소=${e.zeroPhonemes.length ? e.zeroPhonemes.join('') : '없음'}  | 최소 비0 음소를 target까지 올리려면 ≈${e.mult === Infinity ? '∞(0회 존재)' : e.mult}배 코퍼스`);
}

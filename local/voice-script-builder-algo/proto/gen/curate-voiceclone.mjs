// 보이스클론용 엄선: 낭독 자연스러움 점수 + 어투 8종 균형 + 음소 커버리지(발화형) + 30분.
import { readFileSync, writeFileSync } from "node:fs";
import { decompose, compose, toPronunciation, applyFinalConsonantRule } from "../hangul.bundle.mjs";

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const REP = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅇ'];
const isSyl = (c) => c >= '가' && c <= '힣';
function spoken(text) { let o = ""; for (const ch of toPronunciation(text)) { if (!isSyl(ch)) { o += ch; continue; } const d = decompose(ch); o += d && d.jong ? compose({ cho: d.cho, jung: d.jung, jong: applyFinalConsonantRule(d.jong) }) : ch; } return o; }
function vec(text) { const v = {}; for (const ch of spoken(text)) { if (!isSyl(ch)) continue; const d = decompose(ch); if (!d) continue; v['I_' + d.cho] = (v['I_' + d.cho] || 0) + 1; v['M_' + d.jung] = (v['M_' + d.jung] || 0) + 1; if (d.jong) v['F_' + d.jong] = (v['F_' + d.jong] || 0) + 1; } return v; }
const syl = (s) => (s.match(/[가-힣]/g) || []).length;

const corpus = JSON.parse(readFileSync("local/voice-script-builder-algo/corpus/corpus-v1.json", "utf8")).dialogues;
const cache = JSON.parse(readFileSync("local/voice-script-builder-algo/scores-cache.json", "utf8"));
// 2.txt 낭독점수 병합
const neu = JSON.parse(readFileSync("/private/tmp/claude-501/-Volumes-X10-Pro-labs-soundbluemusic/4a370ed9-c540-4f7e-8e3d-1615f001527c/tasks/wvk373srz.output", "utf8")).result.scores;
for (const s of neu) { const d = corpus[s.index]; cache.byKey[d.turns.join("|")] = { score: s.score, reviewers: s.reviewers, register: d.register }; }
writeFileSync("local/voice-script-builder-algo/scores-cache.json", JSON.stringify(cache));

const srcOf = (i) => i < 200 ? "5" : i < 400 ? "1" : i < 600 ? "3" : i < 800 ? "4" : "2";
const rows = corpus.map((d, i) => { const c = cache.byKey[d.turns.join("|")]; return c ? { i, d, sc: c.score, reg: d.register, src: srcOf(i), v: vec(d.turns.join(" ")), syll: d.turns.join("").replace(/\s/g, "").length, min: d.turns.join("").replace(/\s/g, "").length / 300 + d.turns.length * 0.7 / 60 } : null; }).filter(Boolean);

// 타깃: 음소 minCoverage
const MIN = 8;
const target = {}; CHO.forEach(c => target['I_' + c] = MIN); JUNG.forEach(c => target['M_' + c] = MIN); REP.forEach(c => target['F_' + c] = Math.max(3, Math.floor(MIN / 3)));

// 어투 예산 (원본 비율)
const total = rows.length, TARGET_MIN = 33;
const regCount = {}; for (const r of rows) regCount[r.reg] = (regCount[r.reg] || 0) + 1;
const budget = {}; for (const k in regCount) budget[k] = TARGET_MIN * (regCount[k] / total);

// 결합 그리디: (낭독점수) + 0.25*(음소 결핍 채움) / 음절, 어투 예산 내에서
const cur = {}, used = {}; for (const k in target) cur[k] = 0; for (const k in budget) used[k] = 0;
const pool = rows.slice();
const picked = [];
let totMin = 0;
while (totMin < TARGET_MIN) {
  let best = -1, bestScore = -Infinity;
  for (let j = 0; j < pool.length; j++) {
    const r = pool[j];
    if (used[r.reg] >= budget[r.reg]) continue;
    let gain = 0; for (const k in r.v) { const need = (target[k] || 0) - (cur[k] || 0); if (need > 0) gain += Math.min(r.v[k], need); }
    const s = r.sc + 0.25 * (gain / r.syll) * 10;
    if (s > bestScore) { bestScore = s; best = j; }
  }
  if (best === -1) break;
  const r = pool.splice(best, 1)[0];
  picked.push(r); used[r.reg] += r.min; totMin += r.min;
  for (const k in r.v) cur[k] = (cur[k] || 0) + r.v[k];
}

// 음소 커버리지 측정
const grp = (list, pre) => { const below = list.filter(c => (cur[pre + c] || 0) < target[pre + c]); return { met: list.length - below.length, total: list.length, below: below.map(c => `${c}=${cur[pre + c] || 0}`) }; };
const ci = grp(CHO, 'I_'), cj = grp(JUNG, 'M_'), cf = grp(REP, 'F_');
let sy = 0, tn = 0; for (const p of picked) { for (const t of p.d.turns) { sy += syl(t); tn++; } }
const avg = picked.reduce((a, b) => a + b.sc, 0) / picked.length;
const rd = {}; for (const p of picked) rd[p.reg] = (rd[p.reg] || 0) + 1;

console.log(`보이스클론 엄선: ${picked.length}개 · ${(sy / 300 + tn * 0.7 / 60).toFixed(1)}분 · 낭독평균 ${avg.toFixed(2)}`);
console.log(`어투: ${Object.entries(rd).sort((a, b) => b[1] - a[1]).map(([k, v]) => v + " " + k).join(" · ")}`);
console.log(`음소 커버리지(발화형, 목표 ${MIN}): 초성 ${ci.met}/${ci.total} · 중성 ${cj.met}/${cj.total} · 종성 ${cf.met}/${cf.total}`);
if (ci.below.length) console.log("  초성 미달: " + ci.below.join(", "));
if (cj.below.length) console.log("  중성 미달: " + cj.below.join(", "));

// curated.json
picked.sort((a, b) => a.i - b.i);
const curated = { source: "talk/ 1000개 → 낭독 자연스러움(3인평균) + 어투균형 + 음소커버리지, 보이스클론용 엄선", criterion: "voice-clone-readaloud", curatedAt: "2026-06-19", count: picked.length, syllables: sy, turns: tn, avgScore: +avg.toFixed(2), cutScore: +Math.min(...picked.map(p => p.sc)).toFixed(1), coverage: { cho: ci.met + "/" + ci.total, jung: cj.met + "/" + cj.total, fin: cf.met + "/" + cf.total }, estMinutes: { slow: +(sy / 250 + tn * 0.7 / 60).toFixed(1), normal: +(sy / 300 + tn * 0.7 / 60).toFixed(1) }, dialogues: picked.map(p => ({ register: p.reg, score: p.sc, speakers: p.d.speakers, turns: p.d.turns })) };
writeFileSync("src/lib/voice-script/curated.json", JSON.stringify(curated));
writeFileSync("upgrade대화/엄선-30분.txt", picked.map((p, n) => `[엄선 ${n + 1}] (원본#${p.i + 1} · ${p.reg} · 낭독 ${p.sc.toFixed(1)}점)\n` + p.d.turns.map((t, j) => (j % 2 === 0 ? "A" : "B") + ": " + t).join("\n")).join("\n\n") + "\n");
console.log("curated.json · 엄선-30분.txt 갱신, 캐시 1000개");

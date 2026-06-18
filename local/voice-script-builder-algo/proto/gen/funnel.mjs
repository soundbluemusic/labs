// 스케일 대응 깔때기 — Stage 1 알고리즘 사전선별 (무료·O(n)·무한확장).
// 수만~수십만 대화가 와도, LLM이 보는 후보를 shortlistCap으로 묶는다.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreDialogue } from "./algo-curate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = join(HERE, "..", "..", "samples");
const CACHE = join(HERE, "..", "..", "scores-cache.json");

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

export function parseAllSamples() {
  const out = [];
  for (const f of readdirSync(SAMPLES).filter((x) => /^raw-.*\.txt$/.test(x)).sort()) {
    for (const turns of parseRaw(readFileSync(join(SAMPLES, f), "utf8"))) out.push({ turns, src: f });
  }
  return out;
}

const contentTokens = (turns) => turns.join(" ").match(/[가-힣]{2,}/g) || [];
// 근접중복 시그니처: 내용어 집합 상위(정렬) → 어순/조사 바뀐 재탕 잡음 (O(n))
const nearSig = (turns) => [...new Set(contentTokens(turns))].sort().slice(0, 14).join("·");

/** Stage 1: 중복제거 + 게이트 + 프록시랭킹 → 후보 shortlist (LLM이 볼 양 상한). */
export function prefilter(dialogues, { shortlistCap = 2000 } = {}) {
  const seen = new Set(), sigSeen = new Set();
  let dup = 0, nearDup = 0, badGate = 0;
  const valid = [];
  for (const d of dialogues) {
    const key = d.turns.join("|");
    if (seen.has(key)) { dup++; continue; }       // 완전중복
    seen.add(key);
    const sc = scoreDialogue(d.turns);
    if (!sc.wellformed || sc.react === 0) { badGate++; continue; } // 완결성·반응성 게이트
    const sig = nearSig(d.turns);
    if (sigSeen.has(sig)) { nearDup++; continue; } // 근접중복
    sigSeen.add(sig);
    valid.push({ ...d, proxy: sc.total });
  }
  valid.sort((a, b) => b.proxy - a.proxy);          // 싸구려 품질 프록시로 정렬
  const shortlist = valid.slice(0, shortlistCap);   // LLM 비용 상한
  return { total: dialogues.length, dup, nearDup, badGate, valid: valid.length, capped: valid.length > shortlistCap, shortlist };
}

if (process.argv[1] && process.argv[1].endsWith("funnel.mjs")) {
  const cap = parseInt(process.argv[2] || "2000", 10);
  const all = parseAllSamples();
  const r = prefilter(all, { shortlistCap: cap });
  // 캐시와 대조: 후보 중 아직 LLM 채점 안 된 것 = 신규 채점 대상
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")).byKey || {} : {};
  const toScore = r.shortlist.filter((d) => !(d.turns.join("|") in cache)).length;
  console.log("════ Stage 1 사전선별 (shortlistCap=" + cap + ") ════");
  console.log("입력 대화        : " + r.total);
  console.log("완전중복 제거    : -" + r.dup);
  console.log("게이트 탈락      : -" + r.badGate + " (미완결/무반응)");
  console.log("근접중복 제거    : -" + r.nearDup);
  console.log("유효 후보        : " + r.valid + (r.capped ? " → shortlist " + cap + "로 상한" : ""));
  console.log("─".repeat(40));
  console.log("LLM 채점 후보    : " + r.shortlist.length);
  console.log("  이미 캐시됨    : " + (r.shortlist.length - toScore));
  console.log("  신규 채점 필요 : " + toScore + "  ← LLM은 이만큼만 본다");
}

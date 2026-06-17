// L1 발화-음소 커버리지 어댑터 (DESIGN.md §3.3).
// ⚠️ 정정: applyFinalConsonantRule(jong)은 "단일 종성 자모"를 받는다(문자열 아님).
//    따라서 음절별로 분해→종성 중화→재조합 해야 한다. (설계 초안의 문자열 전달은 무효였음)
import {
  decompose, compose, CHO, JUNG, JONG,
  toPronunciation, applyFinalConsonantRule,
} from './hangul.bundle.mjs';

const isHangulSyll = (ch) => ch >= '가' && ch <= '힣';

/** 각 음절의 종성을 7대표음으로 중화. 연음(liaison)은 미적용 — 측정용 코다 정규화. */
export function codaNeutralize(text) {
  let out = '';
  for (const ch of text) {
    if (!isHangulSyll(ch)) { out += ch; continue; }
    const d = decompose(ch); // { cho, jung, jong }
    if (d && d.jong) {
      out += compose({ cho: d.cho, jung: d.jung, jong: applyFinalConsonantRule(d.jong) });
    } else {
      out += ch;
    }
  }
  return out;
}

/** 발화 기준 표면형: 음운규칙(경음화/비음화/유음화/구개음화) 후 코다 중화. */
export function toSpokenForm(text) {
  return codaNeutralize(toPronunciation(text));
}

/** 발화형 기준 자모 카운트 벡터 (I_/M_/F_ 접두). */
export function coverageVector(text, { spoken = true } = {}) {
  const surface = spoken ? toSpokenForm(text) : text;
  const vec = {};
  for (const ch of surface) {
    if (!isHangulSyll(ch)) continue;
    const d = decompose(ch);
    if (!d) continue;
    vec['I_' + d.cho] = (vec['I_' + d.cho] || 0) + 1;
    vec['M_' + d.jung] = (vec['M_' + d.jung] || 0) + 1;
    if (d.jong) vec['F_' + d.jong] = (vec['F_' + d.jong] || 0) + 1;
  }
  return vec;
}

export { decompose, compose, CHO, JUNG, JONG };

// ── self-test ──
if (process.argv[1] && process.argv[1].endsWith('coverage.mjs')) {
  for (const w of ['학교', '부엌', '몫', '읊다', '핥다', '신라', '국물', '꽃', '있다', '닭']) {
    console.log(`${w} → toPron: ${toPronunciation(w)} → 발화형(코다중화): ${toSpokenForm(w)}`);
  }
}

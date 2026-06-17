// L1 발화-음소 커버리지 어댑터 (브라우저 TS).
// applyFinalConsonantRule(jong)은 "단일 종성 자모"를 받으므로, 음절별로
// 분해→종성 중화→재조합 해야 한다. (DESIGN.md §3.3)
import {
  decompose,
  compose,
  toPronunciation,
  applyFinalConsonantRule,
  CHO,
  JUNG,
} from "../hangul";

const isHangulSyll = (ch: string) => ch >= "가" && ch <= "힣";

/** 각 음절의 종성을 7대표음으로 중화 (연음 미적용, 측정용 코다 정규화). */
export function codaNeutralize(text: string): string {
  let out = "";
  for (const ch of text) {
    if (!isHangulSyll(ch)) {
      out += ch;
      continue;
    }
    const d = decompose(ch);
    if (d && d.jong) {
      out += compose({ cho: d.cho, jung: d.jung, jong: applyFinalConsonantRule(d.jong) });
    } else {
      out += ch;
    }
  }
  return out;
}

/** 발화 기준 표면형: 음운규칙 적용 후 코다 중화. */
export function toSpokenForm(text: string): string {
  return codaNeutralize(toPronunciation(text));
}

export type PhonemeVec = Record<string, number>;

/** 발화형 기준 자모 카운트 벡터 (I_/M_/F_ 접두). */
export function coverageVector(text: string, spoken = true): PhonemeVec {
  const surface = spoken ? toSpokenForm(text) : text;
  const vec: PhonemeVec = {};
  for (const ch of surface) {
    if (!isHangulSyll(ch)) continue;
    const d = decompose(ch);
    if (!d) continue;
    vec["I_" + d.cho] = (vec["I_" + d.cho] || 0) + 1;
    vec["M_" + d.jung] = (vec["M_" + d.jung] || 0) + 1;
    if (d.jong) vec["F_" + d.jong] = (vec["F_" + d.jong] || 0) + 1;
  }
  return vec;
}

/** 철자 기준 종성 자모 집합 (L2 희귀자모 보장 확인용). */
export function spellingFinalSet(turns: string[]): Set<string> {
  const set = new Set<string>();
  for (const t of turns)
    for (const ch of t) {
      const d = decompose(ch);
      if (d && d.jong) set.add(d.jong);
    }
  return set;
}

export { CHO, JUNG };
export const REP_FINALS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅇ"];
/** 발화로는 사라지는 표기 전용 희귀 종성 (시드 보장 대상). */
export const L2_JAMO = ["ㄳ", "ㄽ", "ㄿ", "ㄾ", "ㅋ"];

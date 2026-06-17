// 한국어 활용 엔진 (브라우저 TS). 검증된 프로토타입 포팅.
// applyIrregular은 불규칙 + ㅡ/ㅅ/ㅎ 수축은 처리하나, 규칙 모음어간 수축은 안 함 → 후처리.
import {
  decompose, compose, selectAOrEo, applyIrregular,
  hasBatchim, changeBatchim, removeBatchim,
} from "../hangul";

const lastOf = (s: string) => s[s.length - 1];
const headOf = (s: string) => s.slice(0, -1);

// 라이브러리 사전 누락/오류 어간 보강
const IRREG_AEO: Record<string, string> = {
  "맵": "매워", "덥": "더워", "곱": "고와", "굽": "구워", "눕": "누워", "줍": "주워",
  "가깝": "가까워", "무겁": "무거워", "가볍": "가벼워", "차갑": "차가워", "뜨겁": "뜨거워",
  "무섭": "무서워", "즐겁": "즐거워", "반갑": "반가워", "새롭": "새로워", "외롭": "외로워",
  "시끄럽": "시끄러워", "부드럽": "부드러워", "까다롭": "까다로워", "두껍": "두꺼워", "아름답": "아름다워",
  "그렇": "그래", "이렇": "이래", "저렇": "저래", "빨갛": "빨개", "노랗": "노래",
  "까맣": "까매", "하얗": "하얘", "어떻": "어때",
};

function contractRegular(stem: string, vowel: string): string {
  const last = lastOf(stem);
  const d = decompose(last);
  const ev = vowel === "ㅏ" ? "아" : "어";
  if (!d) return stem + ev;
  if (d.jong) return stem + ev;
  const head = headOf(stem);
  const mk = (jung: string) => head + compose({ cho: d.cho, jung: jung as never, jong: "" });
  switch (d.jung) {
    case "ㅏ": case "ㅓ": case "ㅐ": case "ㅔ": case "ㅕ": case "ㅖ": return stem;
    case "ㅗ": return mk("ㅘ");
    case "ㅜ": return mk("ㅝ");
    case "ㅣ": return mk("ㅕ");
    case "ㅚ": return mk("ㅙ");
    case "ㅡ": return mk(vowel);
    default: return stem + ev;
  }
}

/** 어간 → 아/어 활용형 (종결어미 없는 어근형). */
export function stemAEo(stem: string): string {
  if (IRREG_AEO[stem]) return IRREG_AEO[stem];
  if (stem.endsWith("하")) return headOf(stem) + "해";
  let vowel = selectAOrEo(stem);
  if (stem.endsWith("르") && stem.length >= 2) vowel = selectAOrEo(stem.slice(0, -1));
  const ev = vowel === "ㅏ" ? "아" : "어";
  const irr = applyIrregular(stem, ev);
  if (irr !== stem + ev) return irr;
  return contractRegular(stem, vowel);
}

function toPast(aeoForm: string): string {
  const last = lastOf(aeoForm);
  return headOf(aeoForm) + changeBatchim(last, "ㅆ");
}

function formalPresent(stem: string): string {
  const last = lastOf(stem);
  if (hasBatchim(last)) {
    const d = decompose(last);
    if (d && d.jong === "ㄹ") return headOf(stem) + changeBatchim(removeBatchim(last), "ㅂ") + "니다";
    return stem + "습니다";
  }
  return headOf(stem) + changeBatchim(last, "ㅂ") + "니다";
}

function neyo(stem: string): string {
  const last = lastOf(stem);
  const d = decompose(last);
  if (d && d.jong === "ㄹ") return headOf(stem) + removeBatchim(last) + "네요";
  return stem + "네요";
}

function plainVerb(stem: string): string {
  const last = lastOf(stem);
  if (hasBatchim(last)) {
    const d = decompose(last);
    if (d && d.jong === "ㄹ") return headOf(stem) + changeBatchim(removeBatchim(last), "ㄴ") + "다";
    return stem + "는다";
  }
  return headOf(stem) + changeBatchim(last, "ㄴ") + "다";
}

export type EndKind =
  | "declP" | "casual" | "pastP" | "pastCasual" | "formal" | "pastFormal"
  | "deorago" | "deondae" | "pastDeorago" | "geodeun" | "janha" | "jyo" | "neyo"
  | "ji" | "janhaC" | "geodeunC" | "plainAdj" | "plainVerb" | "pastPlain";

export function conjugate(stem: string, kind: EndKind, isAdj = false): string {
  switch (kind) {
    case "declP": return stemAEo(stem) + "요";
    case "casual": return stemAEo(stem);
    case "pastP": return toPast(stemAEo(stem)) + "어요";
    case "pastCasual": return toPast(stemAEo(stem)) + "어";
    case "formal": return formalPresent(stem);
    case "pastFormal": return toPast(stemAEo(stem)) + "습니다";
    case "deorago": return stem + "더라고요";
    case "deondae": return stem + "던데요";
    case "pastDeorago": return toPast(stemAEo(stem)) + "더라고요";
    case "geodeun": return stem + "거든요";
    case "janha": return stem + "잖아요";
    case "jyo": return stem + "죠";
    case "neyo": return neyo(stem);
    case "ji": return stem + "지";
    case "janhaC": return stem + "잖아";
    case "geodeunC": return stem + "거든";
    case "plainAdj": return stem + "다";
    case "plainVerb": return isAdj ? stem + "다" : plainVerb(stem);
    case "pastPlain": return toPast(stemAEo(stem)) + "다";
    default: return stemAEo(stem) + "요";
  }
}

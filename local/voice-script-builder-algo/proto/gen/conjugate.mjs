// 한국어 활용 엔진 (생성기 핵심 primitive). @soundblue/hangul만 사용.
// applyIrregular은 불규칙 + ㅡ/ㅅ/ㅎ 수축은 처리하나, 규칙 모음어간 수축은 안 함 → 후처리.
import {
  decompose, compose, selectAOrEo, applyIrregular,
  hasBatchim, changeBatchim, removeBatchim,
} from "../hangul.bundle.mjs";

const lastOf = (s) => s[s.length - 1];
const headOf = (s) => s.slice(0, -1);

// 규칙 모음어간 수축 (받침 없는 어간 + 아/어)
function contractRegular(stem, vowel) {
  const last = lastOf(stem);
  const d = decompose(last);
  const ev = vowel === "ㅏ" ? "아" : "어";
  if (!d) return stem + ev;
  if (d.jong) return stem + ev;                 // 먹+어 → 먹어
  const head = headOf(stem);
  const mk = (jung) => head + compose({ cho: d.cho, jung, jong: "" });
  switch (d.jung) {
    case "ㅏ": case "ㅓ": case "ㅐ": case "ㅔ": case "ㅕ": case "ㅖ": return stem; // 가/서/켜 흡수
    case "ㅗ": return mk("ㅘ");                  // 보→봐, 오→와
    case "ㅜ": return mk("ㅝ");                  // 주→줘, 배우→배워
    case "ㅣ": return mk("ㅕ");                  // 마시→마셔
    case "ㅚ": return mk("ㅙ");                  // 되→돼
    case "ㅡ": return mk(vowel);                 // 쓰→써 (fallback)
    default: return stem + ev;
  }
}

// 라이브러리 사전에 없거나 잘못 활용되는 어간 → 아/어 활용형 직접 지정.
const IRREG_AEO = {
  // ㅂ 불규칙 (사전 미등록 보강)
  "맵": "매워", "덥": "더워", "곱": "고와", "굽": "구워", "눕": "누워", "줍": "주워",
  "가깝": "가까워", "무겁": "무거워", "가볍": "가벼워", "차갑": "차가워", "뜨겁": "뜨거워",
  "무섭": "무서워", "즐겁": "즐거워", "반갑": "반가워", "새롭": "새로워", "외롭": "외로워",
  "시끄럽": "시끄러워", "부드럽": "부드러워", "까다롭": "까다로워", "두껍": "두꺼워", "아름답": "아름다워",
  // ㅎ 불규칙
  "그렇": "그래", "이렇": "이래", "저렇": "저래", "빨갛": "빨개", "노랗": "노래",
  "까맣": "까매", "하얗": "하얘", "어떻": "어때",
};

/** 어간 → 아/어 활용형 (종결어미 없는 어근형). 하다특례·불규칙·수축 모두 처리. */
export function stemAEo(stem) {
  if (IRREG_AEO[stem]) return IRREG_AEO[stem];
  if (stem.endsWith("하")) return headOf(stem) + "해";
  // 르 불규칙: 모음조화는 '르' 앞 음절 기준 (모르→몰라, 부르→불러)
  let vowel = selectAOrEo(stem);
  if (stem.endsWith("르") && stem.length >= 2) vowel = selectAOrEo(stem.slice(0, -1));
  const ev = vowel === "ㅏ" ? "아" : "어";
  const irr = applyIrregular(stem, ev);
  if (irr !== stem + ev) return irr;             // 불규칙/ㅡ/ㅅ/ㅎ 처리됨
  return contractRegular(stem, vowel);           // 규칙 수축
}

// 마지막 음절에 ㅆ받침 → 과거 '었/았'
function toPast(aeoForm) {
  const last = lastOf(aeoForm);
  return headOf(aeoForm) + changeBatchim(last, "ㅆ");
}

function formalPresent(stem) {
  const last = lastOf(stem);
  if (hasBatchim(last)) {
    const d = decompose(last);
    if (d.jong === "ㄹ") return headOf(stem) + changeBatchim(removeBatchim(last), "ㅂ") + "니다"; // 만들→만듭니다
    return stem + "습니다";                       // 먹→먹습니다
  }
  return headOf(stem) + changeBatchim(last, "ㅂ") + "니다"; // 가→갑니다, 하→합니다
}

function neyo(stem) {
  const last = lastOf(stem);
  const d = decompose(last);
  if (d && d.jong === "ㄹ") return headOf(stem) + removeBatchim(last) + "네요"; // 만들→만드네요
  return stem + "네요";
}

function plainVerb(stem) {
  // verb present ~ㄴ다/는다
  const last = lastOf(stem);
  if (hasBatchim(last)) {
    const d = decompose(last);
    if (d.jong === "ㄹ") return headOf(stem) + changeBatchim(removeBatchim(last), "ㄴ") + "다"; // 만들→만든다
    return stem + "는다";                         // 먹→먹는다
  }
  return headOf(stem) + changeBatchim(last, "ㄴ") + "다"; // 가→간다
}

/**
 * 종결형 생성.
 * kind: declP(~어요) pastP(~었어요) formal(~습니다) pastFormal(~었습니다)
 *       deorago(~더라고요) deondae(~던데요) geodeun(~거든요) janha(~잖아요) jyo(~죠) neyo(~네요)
 *       casual(~어) pastCasual(~었어) ji(~지) janhaC(~잖아) geodeunC(~거든)
 *       plainAdj(~다) plainVerb(~ㄴ다) pastPlain(~었다)
 * isAdj: 형용사 여부(평어 ~다 vs ~ㄴ다 구분)
 */
export function conjugate(stem, kind, isAdj = false) {
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

// ── 배터리 테스트 ──
if (process.argv[1] && process.argv[1].endsWith("conjugate.mjs")) {
  const verbs = ["먹", "읽", "앉", "받", "가", "서", "보", "주", "마시", "쓰", "되", "오", "배우", "듣", "걷", "부르", "모르", "짓", "만들", "살", "끓이", "넣"];
  const adjs = ["맛있", "따뜻하", "어렵", "작", "춥", "맵", "파랗", "그렇", "고소하", "깊", "시큼하"];
  const show = (label, stems, kinds, isAdj) => {
    console.log(`\n── ${label} ──`);
    for (const s of stems) console.log(s + ": " + kinds.map((k) => `${k}=${conjugate(s, k, isAdj)}`).join("  "));
  };
  show("동사 현재/과거 존댓", verbs, ["declP", "pastP"], false);
  show("동사 격식", verbs, ["formal", "pastFormal"], false);
  show("동사 회상/거든/네/반말/평어", ["먹", "가", "만들", "마시", "끓이", "부르"], ["deorago", "geodeun", "neyo", "casual", "plainVerb"], false);
  show("형용사 존댓/격식/회상/평어", adjs, ["declP", "formal", "deorago", "plainAdj"], true);
}

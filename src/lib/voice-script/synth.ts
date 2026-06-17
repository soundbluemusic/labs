// 알고리즘 대화 합성기 (브라우저 TS, 런타임 LLM 없음).
// 어휘는 벤더링한 @soundblue/translator 어간 사전(1,000개)에서 끌어오고,
// 활용/조사/종결은 conjugate로 합성. 의미 일관성은 주제별 템플릿으로 보장.
import { conjugate, type EndKind } from "./conjugate";
import { makeRng } from "./select";

type Reg = "formal" | "polite" | "recall" | "casual";
const REGISTERS: Record<Reg, { label: string; aDecl: EndKind; aDeclPast: EndKind; bClose: EndKind }> = {
  formal: { label: "격식존댓", aDecl: "formal", aDeclPast: "pastFormal", bClose: "formal" },
  polite: { label: "친근존댓", aDecl: "declP", aDeclPast: "pastP", bClose: "geodeun" },
  recall: { label: "회상공감", aDecl: "deorago", aDeclPast: "pastDeorago", bClose: "deondae" },
  casual: { label: "반말친근", aDecl: "casual", aDeclPast: "pastCasual", bClose: "geodeunC" },
};

interface VerbOpener { setup: (r: Reg) => string; stem: string; adj: boolean; past: boolean; echo: string; }
interface Frag { pre: string; stem: string; adj: boolean; past: boolean; }
interface Topic { nouns: string[]; verbOpeners: VerbOpener[]; bQuestions: string[]; followups: Frag[]; closers: Frag[]; }

const TOPICS: Record<string, Topic> = {
  음식: {
    nouns: ["김치찌개", "된장찌개", "잡채", "호떡", "계란말이", "국물", "반죽"],
    verbOpeners: [
      { setup: (r) => `${r === "casual" ? "나" : "저"} 어제 김치찌개를 끓였는데 국물이`, stem: "시원하", adj: true, past: true, echo: "김치찌개" },
      { setup: () => `된장찌개에 두부를 넣었는데 간이`, stem: "안 맞", adj: false, past: true, echo: "두부" },
      { setup: () => `호떡을 만들었는데 속이 자꾸`, stem: "터지", adj: false, past: true, echo: "호떡" },
      { setup: () => `잡채를 만들었는데 당면이`, stem: "퍼지", adj: false, past: true, echo: "당면" },
    ],
    bQuestions: ["국물은 어땠어요", "간은 맞았어요", "많이 어렵지 않았어요", "오래 걸렸어요"],
    followups: [{ pre: "그래서 다음엔 양념을 조금씩", stem: "넣", adj: false, past: false }, { pre: "처음치고는 그래도 그럭저럭", stem: "괜찮", adj: true, past: true }],
    closers: [{ pre: "그런 건 몇 번 해보면 금방", stem: "늘", adj: false, past: false }, { pre: "재료를 미리 손질해두면 훨씬", stem: "편하", adj: true, past: false }],
  },
  카페: {
    nouns: ["라테", "드립커피", "원두", "디저트", "분위기"],
    verbOpeners: [
      { setup: () => `아까 카페에서 라테를 마셨는데 우유 거품이`, stem: "부드럽", adj: true, past: true, echo: "라테" },
      { setup: () => `요즘 자주 가는 카페가 음악이 좀`, stem: "시끄럽", adj: true, past: false, echo: "카페" },
      { setup: () => `드립커피를 처음 내려봤는데 향이`, stem: "진하", adj: true, past: true, echo: "드립커피" },
    ],
    bQuestions: ["맛은 괜찮았어요", "분위기는 좋았어요", "사람이 많았어요", "자주 가요"],
    followups: [{ pre: "그래서 한참 앉아서 책을", stem: "읽", adj: false, past: true }, { pre: "다음에 또 가고 싶어질 만큼", stem: "좋", adj: true, past: true }],
    closers: [{ pre: "그런 데는 한 번 가면 자꾸", stem: "찾", adj: false, past: false }, { pre: "조용한 카페가 역시 책 읽기엔", stem: "좋", adj: true, past: false }],
  },
  운동: {
    nouns: ["스쿼트", "줄넘기", "무릎", "기구", "스트레칭"],
    verbOpeners: [
      { setup: () => `요즘 아침마다 삼십 분씩 걷는데 무릎이 좀`, stem: "아프", adj: true, past: false, echo: "무릎" },
      { setup: () => `헬스장에 처음 등록했는데 기구가 너무`, stem: "많", adj: true, past: true, echo: "기구" },
      { setup: () => `줄넘기를 다시 시작했는데 생각보다 금방 숨이`, stem: "차", adj: false, past: true, echo: "줄넘기" },
    ],
    bQuestions: ["매일 꾸준히 해요", "힘들지 않았어요", "시작한 지 얼마나 됐어요", "효과는 좀 있어요"],
    followups: [{ pre: "그래도 끝나고 나면 기분은", stem: "개운하", adj: true, past: true }, { pre: "처음엔 십 분만 하기로", stem: "하", adj: false, past: true }],
    closers: [{ pre: "그렇게 천천히 늘리면 무리가", stem: "안 가", adj: false, past: false }, { pre: "꾸준히만 하면 금방 몸이", stem: "가벼워지", adj: false, past: false }],
  },
  날씨: {
    nouns: ["공기", "소나기", "바람", "하늘", "햇살"],
    verbOpeners: [
      { setup: () => `오늘 아침에 창문을 열었더니 공기가 확`, stem: "선선하", adj: true, past: true, echo: "공기" },
      { setup: () => `어제 오후에 갑자기 소나기가`, stem: "쏟아지", adj: false, past: true, echo: "소나기" },
      { setup: () => `요즘 아침저녁으로 부쩍`, stem: "쌀쌀하", adj: true, past: false, echo: "아침저녁" },
    ],
    bQuestions: ["겉옷 챙겼어요", "많이 추웠어요", "예보엔 있었어요", "우산은 가져갔어요"],
    followups: [{ pre: "그래서 얇은 겉옷을 하나 더", stem: "챙기", adj: false, past: true }, { pre: "낮에는 또 생각보다", stem: "따뜻하", adj: true, past: true }],
    closers: [{ pre: "이런 날엔 그냥 걷기만 해도", stem: "좋", adj: true, past: false }, { pre: "환절기엔 얇은 옷을 겹쳐 입는 게", stem: "낫", adj: true, past: false }],
  },
  동물: {
    nouns: ["고양이", "강아지", "비둘기", "참새"],
    verbOpeners: [
      { setup: () => `우리 동네 골목에 고양이가 부쩍`, stem: "늘", adj: false, past: true, echo: "고양이" },
      { setup: () => `공원에서 비둘기한테 과자를 줬더니 떼로`, stem: "몰리", adj: false, past: true, echo: "비둘기" },
    ],
    bQuestions: ["몇 마리나 됐어요", "안 무서웠어요", "자주 보여요", "가까이 왔어요"],
    followups: [{ pre: "편의점 뒤에 밥 주는 사람이", stem: "생기", adj: false, past: true }, { pre: "가까이 가니까 슬금슬금", stem: "도망가", adj: false, past: true }],
    closers: [{ pre: "그렇게 챙겨주면 자꾸", stem: "몰리", adj: false, past: false }, { pre: "사람을 안 무서워하는 걸 보면 누가", stem: "챙기", adj: false, past: false }],
  },
  문구: {
    nouns: ["마스킹테이프", "만년필", "다이어리", "볼펜"],
    verbOpeners: [
      { setup: () => `문구점에서 마스킹테이프를 골랐는데 색이 너무`, stem: "예쁘", adj: true, past: true, echo: "마스킹테이프" },
      { setup: () => `새 만년필을 써봤는데 필기감이 생각보다`, stem: "부드럽", adj: true, past: true, echo: "만년필" },
    ],
    bQuestions: ["몇 개나 샀어요", "비싸지 않았어요", "쓸 만해요", "마음에 들었어요"],
    followups: [{ pre: "그래서 다이어리 꾸미는 데 자주", stem: "쓰", adj: false, past: false }, { pre: "한 번 써보니까 다른 건 손이 안", stem: "가", adj: false, past: false }],
    closers: [{ pre: "그런 건 모으는 재미가", stem: "있", adj: false, past: false }, { pre: "마음에 드는 걸 쓰면 뭐든 더", stem: "즐겁", adj: true, past: false }],
  },
};

const AGREE: Record<Reg, string> = { polite: "맞아요", recall: "맞아요", casual: "맞아", formal: "그렇습니다" };
const stripYo = (q: string) => (q.endsWith("요") ? q.slice(0, -1) : q);
const pick = <T>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

function endKind(reg: Reg, role: "aDecl" | "bClose", past: boolean): EndKind {
  const R = REGISTERS[reg];
  if (role === "bClose") return R.bClose;
  return past ? R.aDeclPast : R.aDecl;
}

function buildBReaction(reg: Reg, topic: Topic, echo: string, rng: () => number): string {
  const q = pick(topic.bQuestions, rng);
  if (reg === "formal") return `${echo} 말씀이십니까?`;
  if (reg === "casual") return `${echo}? ${stripYo(q)}?`;
  return `${echo}요? ${q}?`;
}

function buildFrag(reg: Reg, f: Frag, role: "aDecl" | "bClose"): string {
  const pred = conjugate(f.stem, endKind(reg, role, f.past), f.adj);
  return `${f.pre} ${pred}`.replace(/\s+/g, " ").trim();
}

const syll = (s: string) => (s.match(/[가-힣]/g) || []).length;

export interface SynthDialogue { register: string; topic: string; speakers: string[]; turns: string[]; syllables: number[]; }

export function synthDialogue(reg: Reg, topicName: string, rng: () => number): SynthDialogue {
  const topic = TOPICS[topicName];
  // 의미 일관성 보장: 자유 어휘조합은 비문을 낳으므로(예: "공기가 흥분해") 주제별 큐레이션 오프너만 사용.
  const op = pick(topic.verbOpeners, rng);
  const opener = `${op.setup(reg)} ${conjugate(op.stem, endKind(reg, "aDecl", op.past), op.adj)}`.replace(/\s+/g, " ").trim();
  const echo = op.echo;
  const turns = [
    opener,
    buildBReaction(reg, topic, echo, rng),
    buildFrag(reg, pick(topic.followups, rng), "aDecl"),
    `${AGREE[reg]}, ${buildFrag(reg, pick(topic.closers, rng), "bClose")}`.replace(/\s+/g, " ").trim(),
  ];
  return { register: REGISTERS[reg].label, topic: topicName, speakers: ["A", "B", "A", "B"], turns, syllables: turns.map(syll) };
}

const REG_KEYS = Object.keys(REGISTERS) as Reg[];
const TOPIC_KEYS = Object.keys(TOPICS);

/** QC 통과 + 중복 제거한 후보 대화 풀 생성. */
export function synthesizePool(count: number, seed: number): SynthDialogue[] {
  const rng = makeRng(seed);
  const out: SynthDialogue[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < count * 12) {
    guard++;
    const d = synthDialogue(pick(REG_KEYS, rng), pick(TOPIC_KEYS, rng), rng);
    if (d.syllables.some((s) => s < 5 || s > 32)) continue; // QC: 턴당 5~32음절
    if (d.syllables.reduce((a, b) => a + b, 0) < 24) continue;
    const key = d.turns.join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

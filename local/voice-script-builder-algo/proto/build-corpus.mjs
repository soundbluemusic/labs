// raw-*.txt (도구1 결과 UI 붙여넣기) → corpus-vN.json 정규화.
// 파싱/검증은 도구1 parseDialogues 기준과 동일 의미(턴3~6, 턴당 4~40음절, 2화자, 반응성).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = join(HERE, '..', 'samples');

const reactionWords = ['맞아','맞아요','맞죠','맞네','그렇지','그러게','그러네','그렇구나','그렇군','그랬구나','그랬어','진짜','정말','저도','나도','그래','그래요','어머','그죠','그쵸','저는','나는','어때','어떤','얼마','언제','어디','왜','뭐','그게','그거','그것','거기','거긴','글쎄','우와','대박','헐','근데','그런데','있잖','있죠','그러면','그럼'];

function hasReaction(turns) {
  if (turns.length < 2) return false;
  const bText = turns[1].text;
  const aWords = (turns[0].text.match(/[가-힣]{2,}/g) || []);
  const stems = new Set();
  for (const w of aWords) { stems.add(w); if (w.length >= 3) stems.add(w.slice(0, -1)); if (w.length >= 4) stems.add(w.slice(0, -2)); }
  const hasWordRef = [...stems].some((s) => s.length >= 2 && bText.includes(s));
  const hasReactionWord = reactionWords.some((w) => bText.includes(w));
  return hasWordRef || hasReactionWord;
}

const syllCount = (s) => (s.match(/[가-힣]/g) || []).length;

function classifyRegister(text) {
  const t = text.replace(/[.?!…]+$/, '').trim();
  if (/(습니다|입니다|습니까|겠습니다)$/.test(t)) return '격식존댓';
  if (/(더라고요|던데요|더군요)$/.test(t)) return '회상공감';
  if (/(네요|군요|까요|나요)$/.test(t)) return '감탄의문';
  if (/(잖아요|거든요|죠|예요|에요|이에요|어요|아요|해요|세요|는데요|요)$/.test(t)) return '친근존댓';
  if (/(더라|던데|더군)$/.test(t)) return '회상반말';
  if (/(다|었다|했다|된다|한다|진다|간다|온다)$/.test(t)) return '평어서술';
  if (/(잖아|거든|지|네|야|어|아|해|구나|군)$/.test(t)) return '반말친근';
  return '기타';
}

function parseRaw(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const dialogues = [];
  let cur = null, pendingSpeaker = null;
  for (const line of lines) {
    if (!line) continue;
    if (/^대화\s+\d+$/.test(line)) { if (cur && cur.turns.length) dialogues.push(cur); cur = { turns: [] }; pendingSpeaker = null; continue; }
    if (line === 'A' || line === 'B') { pendingSpeaker = line; continue; }
    if (/^\d+$/.test(line)) continue;
    if (cur && pendingSpeaker) { cur.turns.push({ speaker: pendingSpeaker, text: line }); pendingSpeaker = null; }
  }
  if (cur && cur.turns.length) dialogues.push(cur);
  return dialogues;
}

function normalize(rawFiles) {
  const out = [];
  const seen = new Set();
  let id = 0, rejected = 0;
  for (const f of rawFiles) {
    const text = readFileSync(join(SAMPLES, f), 'utf8');
    for (const d of parseRaw(text)) {
      const turns = d.turns;
      const sc = turns.map((t) => syllCount(t.text));
      const ok = turns.length >= 3 && turns.length <= 6 && sc.every((s) => s >= 4 && s <= 40)
        && new Set(turns.map((t) => t.speaker)).size >= 2 && sc.reduce((a, b) => a + b, 0) >= 20 && hasReaction(turns);
      const key = turns.map((t) => t.text).join('|');
      if (!ok || seen.has(key)) { rejected++; continue; }
      seen.add(key);
      out.push({
        id: 'c-' + String(++id).padStart(4, '0'),
        register: classifyRegister(turns[turns.length - 1].text),
        turns: turns.map((t) => t.text),
        speakers: turns.map((t) => t.speaker),
        syllableCounts: sc,
        reactionOk: true,
        kind: 'natural',
      });
    }
  }
  return { out, rejected };
}

const rawFiles = readdirSync(SAMPLES).filter((f) => /^raw-.*\.txt$/.test(f)).sort();
const { out, rejected } = normalize(rawFiles);
const corpus = {
  schemaVersion: 1,
  provenance: { source: 'claude-sonnet-4 via Tool 1', exports: rawFiles, curated: false },
  dialogues: out,
};
const outPath = join(HERE, '..', 'corpus', 'corpus-v1.json');
writeFileSync(outPath, JSON.stringify(corpus, null, 0));
console.log(`정규화 완료: ${out.length}대화 (입력 파일 ${rawFiles.length}개, 거부/중복 ${rejected})`);
console.log(`→ ${outPath}`);

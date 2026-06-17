import React, { useState, useMemo, useEffect } from 'react';

// ============ 한국어 음운 상수 ============
const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const VOWELS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const FINALS = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const TARGET_DIALOGUES = 200;

// ===== 속도 관련 튜닝 상수 (여기 숫자만 바꾸면 됨) =====
const CONCURRENCY = 4;   // 동시에 도는 일꾼 수. 429(혼잡) 에러가 잦으면 2~3으로 낮추세요.
const BATCH_SIZE = 15;   // 한 호출에서 요청할 대화 수. 응답이 잘리면 더 낮추세요.
const POOL_CEILING = Math.round(TARGET_DIALOGUES * 1.5); // 최대 수집량(조기 종료가 안 될 때의 상한)

function decompose(syllable) {
  const code = syllable.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return null;
  return {
    initial: INITIALS[Math.floor(code / 588)],
    medial: VOWELS[Math.floor((code % 588) / 28)],
    final: FINALS[code % 28]
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 풀 전체 음소 누적치가 목표 커버리지를 채웠는지 (조기 종료 판단용)
function coverageMet(totals, minCoverage) {
  const finalTarget = Math.max(3, Math.floor(minCoverage / 3));
  for (const c of INITIALS) if ((totals['I_' + c] || 0) < minCoverage) return false;
  for (const v of VOWELS) if ((totals['M_' + v] || 0) < minCoverage) return false;
  for (const f of FINALS) { if (!f) continue; if ((totals['F_' + f] || 0) < finalTarget) return false; }
  return true;
}

// ============ 반응성 검사 ============
// B의 첫 턴이 A의 첫 턴 내용을 받아야 통과
function hasReaction(turns) {
  if (turns.length < 2) return false;
  const bText = turns[1].text;
  const aWords = (turns[0].text.match(/[가-힣]{2,}/g) || []);
  // 조사(이/가/은/는/을/를/에/도/의 등)가 붙은 경우를 고려해 어간도 함께 검사
  const stems = new Set();
  for (const w of aWords) {
    stems.add(w);
    if (w.length >= 3) stems.add(w.slice(0, -1)); // 1글자 조사 제거
    if (w.length >= 4) stems.add(w.slice(0, -2)); // 2글자 조사 제거
  }
  const hasWordRef = [...stems].some(s => s.length >= 2 && bText.includes(s));
  // 한 글자 표지('아','오' 등)는 다른 단어 속에서 오탐이 많아 제외, 반응성 높은 표현만 사용
  const reactionWords = ['맞아','맞아요','맞죠','맞네','그렇지','그러게','그러네','그렇구나','그렇군','그랬구나','그랬어','진짜','정말','저도','나도','그래','그래요','어머','그죠','그쵸','저는','나는','어때','어떤','얼마','언제','어디','왜','뭐','그게','그거','그것','거기','거긴','글쎄','우와','대박','헐','근데','그런데','있잖','있죠','그러면','그럼'];
  const hasReactionWord = reactionWords.some(w => bText.includes(w));
  return hasWordRef || hasReactionWord;
}

// ============ 파싱 ============
function parseDialogues(text) {
  const dialogues = [];
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const turns = [];
    for (const line of lines) {
      // 화자 표기 앞의 군더더기(- , 1. , ** 등)를 무시하고 매칭
      const match = line.match(/^[^A-Za-z가-힣]*([AB])\s*[:：\-]\s*(.+)$/);
      if (match) {
        const speaker = match[1];
        const sentence = match[2].replace(/\*+$/, '').trim();
        const syllables = (sentence.match(/[가-힣]/g) || []).length;
        // 4음절부터 허용 → "그러게요" 같은 자연스러운 짧은 반응 턴을 살림
        if (syllables >= 4 && syllables <= 40) {
          turns.push({ speaker, text: sentence, syllables });
        }
      }
    }
    if (turns.length >= 3 && turns.length <= 6) {
      const speakers = new Set(turns.map(t => t.speaker));
      const totalSyllables = turns.reduce((s, t) => s + t.syllables, 0);
      // 너무 빈약한 대화는 제외(전체 음절 합 20 이상)
      if (speakers.size >= 2 && totalSyllables >= 20 && hasReaction(turns)) {
        const fullText = turns.map(t => t.text).join(' ');
        dialogues.push({
          turns,
          totalSyllables,
          totalChars: turns.reduce((s, t) => s + t.text.replace(/\s/g, '').length, 0),
          vec: phonemeVector(fullText),
          key: turns.map(t => t.text).join('|')
        });
      }
    }
  }
  return dialogues;
}

// ============ 그리디 선택 (대화 수 기준) ============
function greedySelect(pool, minCoverage = 10) {
  const target = {};
  INITIALS.forEach(c => target['I_' + c] = minCoverage);
  VOWELS.forEach(v => target['M_' + v] = minCoverage);
  FINALS.filter(f => f).forEach(f => target['F_' + f] = Math.max(3, Math.floor(minCoverage / 3)));

  const current = {};
  Object.keys(target).forEach(k => current[k] = 0);

  const selected = [];
  const available = shuffle(pool); // 매 실행마다 동점 후보 순서를 섞어 결과에 변화를 줌

  // Phase A: 음소 다양성 채우기
  while (available.length > 0) {
    const deficit = {};
    let totalDeficit = 0;
    for (const k of Object.keys(target)) {
      const d = Math.max(0, target[k] - current[k]);
      if (d > 0) { deficit[k] = d; totalDeficit += d; }
    }
    if (totalDeficit === 0) break;

    let bestIdx = -1, bestGain = 0, bestEfficiency = 0;
    for (let i = 0; i < available.length; i++) {
      const d = available[i];
      let gain = 0;
      for (const k of Object.keys(d.vec)) {
        if (deficit[k]) gain += Math.min(d.vec[k], deficit[k]);
      }
      if (gain === 0) continue;
      const efficiency = gain / d.totalSyllables;
      if (efficiency > bestEfficiency || (efficiency === bestEfficiency && gain > bestGain)) {
        bestEfficiency = efficiency; bestGain = gain; bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    const picked = available[bestIdx];
    selected.push(picked);
    for (const k of Object.keys(picked.vec)) current[k] = (current[k] || 0) + picked.vec[k];
    available.splice(bestIdx, 1);
  }

  // Phase B: 대화 수 200개 채우기 (역가중치 + 약간의 무작위성)
  while (available.length > 0 && selected.length < TARGET_DIALOGUES) {
    let bestIdx = -1, bestScore = -1;
    const weights = {};
    for (const k of Object.keys(current)) weights[k] = 1 / Math.sqrt(current[k] + 1);
    for (let i = 0; i < available.length; i++) {
      const d = available[i];
      let score = 0;
      for (const k of Object.keys(d.vec)) score += d.vec[k] * (weights[k] || 1);
      const jitter = 0.9 + Math.random() * 0.2; // ±10% 흔들어 매번 다른 조합이 나오게
      const efficiency = (score / d.totalSyllables) * jitter;
      if (efficiency > bestScore) { bestScore = efficiency; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    const picked = available[bestIdx];
    selected.push(picked);
    for (const k of Object.keys(picked.vec)) current[k] = (current[k] || 0) + picked.vec[k];
    available.splice(bestIdx, 1);
  }

  return { selected, finalCoverage: current, target };
}

// ============ 풀 생성 프롬프트 ============
const ANGLES = [
  '평범한 일상 속 사소한 발견',
  '예상과 달랐던 소소한 경험',
  '서로 다른 사소한 취향 차이',
  '계획과 즉흥 사이의 가벼운 이야기',
  '익숙한 것의 새로운 면',
  '작은 시행착오와 깨달음',
  '문득 떠오른 궁금증',
  '습관처럼 반복하는 일',
];

function buildPoolPrompt(seedTopics, ending, count = BATCH_SIZE) {
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
  return `한국어 보이스 클로닝 학습용 대화 ${count}개를 생성해줘.

[!! 가장 중요한 규칙: 진짜 대화여야 함 !!]
B의 첫 번째 말은 반드시 A가 한 말의 특정 단어나 내용을 직접 받아서 반응해야 함.
동의, 질문, 가벼운 반박, 놀람, 공감 중 하나가 반드시 있어야 함.

[절대 금지 패턴 — 독백 나열]
A: 구름이 크게 피어올랐다.
B: 볕이 강한 날에 그런 구름이 잘 생기겠다.  ← B가 A 말을 전혀 안 받음. 금지.

A: 식혜는 밥알이 뜨기 시작할 때 완성된 것입니다.
B: 엿기름 물을 잘 우려내는 것이 핵심입니다.  ← 교과서 낭독. 금지.

[좋은 예 — 이렇게 써야 함]
A: 오늘 구름이 엄청 크던데요.
B: 저도 아까 봤어요, 솜사탕 같지 않았나요?
A: 맞아요, 한참 올려다봤어요.
B: 그런 날 밖에 있으면 기분이 좋아지더라고요.

A: 된장찌개 처음 끓여봤는데 간 맞추기가 어렵더라.
B: 나도 처음엔 맨날 짜게 됐었어.
A: 된장을 조금씩 넣어야 하는 거였구나.
B: 맞아, 한꺼번에 넣으면 돌이키기 어렵거든.

[턴 구조]
A (1번째): 일상 소재로 말을 꺼냄
B (2번째): A 말의 특정 단어/내용을 받아서 반응
A (3번째): B 반응에 다시 응답
B (4번째, 선택): 자연스럽게 마무리

[형식 규칙]
- 각 대화는 3~4턴, 빈 줄로 구분
- 각 턴은 "A: ..." 또는 "B: ..." 로 시작
- 한 턴은 한 문장 (8~25음절). 짧은 맞장구는 4음절 이상이면 허용
- 다른 화자명 사용 금지

[!! 이 배치 종결 어미 — 반드시 준수 !!]
모든 대화의 종결 어미는 반드시 ${ending.label} (${ending.example}) 위주.
${ending.context}
다른 어미 섞지 말 것.

[금지 사항]
1. 감정을 자극하는 소재 금지: 그리움/재회/이별/죽음/연애/외로움/위로/두근거림
2. 교과서·백과사전 어투 금지. 실제 사람이 주고받는 말투만.
3. 7세 어린이부터 90세 노인까지 편안하게 읽을 수 있어야 함.
4. 대시(—) 금지. 쉼표나 말줄임표 사용.
5. 같은 단어·패턴 반복 금지.

[주제] ${seedTopics.join(', ')}
[이번 배치 분위기] ${angle}. 다른 배치와 겹치지 않게 새로운 상황·소재로.

[출력]
번호 없이, 머리말 없이, 대화 ${count}개. 각 대화는 빈 줄로 구분.`;
}

const TOPIC_SETS = [
  ['아침 일상', '날씨 이야기', '주말 계획', '맛집 추천'],
  ['카페와 산책', '책 추천', '음악 이야기', '여행 계획'],
  ['요리와 음식', '계절 변화', '친구 만남', '운동 시작'],
  ['문구류와 필기', '동네 이야기', '취미 발견', '비 오는 날'],
  ['구름과 하늘', '손으로 만들기', '청소와 정리', '간식과 음료'],
  ['바다와 산', '꽃과 식물', '동물 친구', '공원 산책'],
  ['집 안 풍경', '계절 음식', '아침 의식', '시장 구경'],
  ['건강 관리', '쇼핑 경험', '교통수단', '도서관']
];

// ============ 종결 어미 세트 ============
const ENDING_SETS = [
  { label: '격식 존댓말', example: '~습니다/~입니다/~겠습니다', context: '두 사람 모두 격식체. 강의·소개·설명 톤이지만 대화는 자연스럽게.' },
  { label: '친근 존댓말', example: '~요/~죠/~잖아요/~거든요', context: '가볍고 친근한 일상 대화. 가장 자연스러운 어조.' },
  { label: '친근 존댓말', example: '~요/~죠/~잖아요/~거든요', context: '가볍고 친근한 일상 대화. 가장 자연스러운 어조.' },
  { label: '반말 친근', example: '~지/~잖아/~거든/~네/~야/~어', context: '아주 친한 친구 또는 가족 사이. 완전한 반말.' },
  { label: '반말 친근', example: '~지/~잖아/~거든/~네/~야/~어', context: '아주 친한 친구 또는 가족 사이. 완전한 반말.' },
  { label: '감탄·의문', example: '~네요!/~군요!/~까요?/~나요?', context: '놀라거나 궁금해하는 반응 위주. 리액션이 풍부한 대화.' },
  { label: '회상·공감', example: '~더라고요/~던데요/~더라/~던데', context: '경험을 나누는 대화. 감정 자극 없이 사실 기반 경험만.' },
  { label: '평어 서술', example: '~다/~었다/~한다', context: '내레이션하듯 담담하게 말하는 톤. 두 사람 모두 평어체.' },
];

// ============ 메인 ============
export default function App() {
  const [pool, setPool] = useState([]);
  const [selection, setSelection] = useState(null);
  const [status, setStatus] = useState('idle');
  const [statusText, setStatusText] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minCoverage, setMinCoverage] = useState(10);

  async function callAPI(prompt) {
    let lastError = '알 수 없는 오류';
    for (let attempt = 0; attempt < 7; attempt++) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 8000,
            messages: [{ role: "user", content: prompt }]
          })
        });
        if (response.status === 429 || response.status === 529 || response.status === 503) {
          const base = Math.min(40, Math.pow(2, attempt) * 3);
          const wait = Math.round(base * (0.7 + Math.random() * 0.6)); // ±30% 지터로 동시 재시도 분산
          lastError = `API ${response.status} (혼잡) - ${wait}초 대기`;
          await new Promise(r => setTimeout(r, wait * 1000));
          continue;
        }
        if (!response.ok) {
          const body = await response.text().catch(() => '');
          lastError = `API ${response.status}: ${body.slice(0, 200)}`;
          if (attempt < 6) { await new Promise(r => setTimeout(r, 3000)); continue; }
          throw new Error(lastError);
        }
        const data = await response.json();
        if (!data || !Array.isArray(data.content)) {
          lastError = '예상치 못한 응답 형식';
          if (attempt < 6) { await new Promise(r => setTimeout(r, 2000)); continue; }
          throw new Error(lastError);
        }
        const text = data.content.filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
        if (!text) {
          lastError = '빈 응답';
          if (attempt < 6) { await new Promise(r => setTimeout(r, 2000)); continue; }
          throw new Error(lastError);
        }
        return text;
      } catch (e) {
        lastError = e.message || String(e);
        if (attempt === 6) throw new Error(lastError);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    throw new Error(`재시도 초과: ${lastError}`);
  }

  async function generate() {
    setStatus('working');
    setError('');
    setProgress(0);

    try {
      const newPool = [...pool];
      const seen = new Set(newPool.map(d => d.key));
      const totals = {};
      for (const d of newPool) for (const k of Object.keys(d.vec)) totals[k] = (totals[k] || 0) + d.vec[k];

      const enough = () => newPool.length >= POOL_CEILING ||
        (newPool.length >= TARGET_DIALOGUES && coverageMet(totals, minCoverage));

      if (!enough()) {
        setStatusText('대화 모으는 중...');
        const maxBatches = 48;
        let dispatched = 0;
        let okCalls = 0;
        let consecutiveFail = 0; // 호출 자체가 연속 실패(장애/혼잡)
        let noNewStreak = 0;     // 호출은 되는데 새 대화가 안 늘어남(포화)
        let lastBatchError = null;
        let stop = false;

        // 일꾼 한 명: 멈출 조건이 될 때까지 다음 작업을 계속 꺼내 처리 (웨이브 장벽 제거)
        const worker = async () => {
          while (!stop && !enough() && dispatched < maxBatches) {
            const idx = dispatched++; // await 없는 동기 증가 → 일꾼마다 고유 인덱스
            const topics = shuffle(TOPIC_SETS[idx % TOPIC_SETS.length]);
            const ending = ENDING_SETS[idx % ENDING_SETS.length];

            let dialogues;
            try {
              const text = await callAPI(buildPoolPrompt(topics, ending, BATCH_SIZE));
              dialogues = parseDialogues(text);
              okCalls++;
              consecutiveFail = 0;
            } catch (e) {
              lastBatchError = e.message;
              consecutiveFail++;
              if (consecutiveFail >= CONCURRENCY * 2) stop = true; // 지속적 장애면 중단
              continue;
            }

            let added = 0;
            for (const d of dialogues) {
              if (!seen.has(d.key)) {
                seen.add(d.key);
                newPool.push(d);
                for (const kk of Object.keys(d.vec)) totals[kk] = (totals[kk] || 0) + d.vec[kk];
                added++;
              }
            }

            if (added > 0) {
              setPool([...newPool]); // 호출 성공 때마다 진행분 저장 (중단·오류 대비)
              noNewStreak = 0;
            } else {
              noNewStreak++;
              if (noNewStreak >= CONCURRENCY * 2) stop = true; // 새 대화가 더 안 나오면(포화) 중단
            }
            setStatusText(`대화 모으는 중... (${newPool.length}/${POOL_CEILING})`);
            setProgress(Math.min(90, (newPool.length / POOL_CEILING) * 90));
          }
        };

        const workers = [];
        for (let w = 0; w < CONCURRENCY; w++) workers.push(worker());
        await Promise.all(workers);

        if (okCalls === 0) throw new Error(lastBatchError || 'API 호출이 모두 실패했어요');
      }

      setStatusText('스크립트 선택 중...');
      setProgress(95);
      const result = greedySelect(newPool, minCoverage);
      setPool([...newPool]);
      setSelection(result);
      setStatus('done');
      setProgress(100);
    } catch (e) {
      setError(e.message);
      setStatus('idle');
    }
  }

  function reselect() {
    if (pool.length === 0) return;
    const result = greedySelect(pool, minCoverage);
    setSelection(result);
    setStatus('done');
  }

  useEffect(() => {
    if (pool.length > 0 && status === 'done') reselect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minCoverage]);

  function downloadScript() {
    if (!selection) return;
    const text = selection.selected.map((d, i) => {
      const header = `[대화 ${i + 1}]`;
      const turns = d.turns.map(t => `${t.speaker}: ${t.text}`).join('\n');
      return `${header}\n${turns}`;
    }).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'voice_script.txt';
    a.click(); URL.revokeObjectURL(url);
  }

  function downloadPool() {
    if (pool.length === 0) return;
    const json = JSON.stringify(pool.map(d => d.turns.map(t => `${t.speaker}: ${t.text}`).join('\n')));
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dialogue_pool.json';
    a.click(); URL.revokeObjectURL(url);
  }

  async function loadPool(file) {
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('JSON 배열 형식이 아니에요');
      const combined = arr.join('\n\n');
      const loaded = parseDialogues(combined);
      if (loaded.length === 0) throw new Error('유효한 대화를 찾지 못했어요');
      setPool(loaded);
      const result = greedySelect(loaded, minCoverage);
      setSelection(result);
      setStatus('done');
      setError('');
    } catch (e) {
      setError(`로드 실패: ${e.message}`);
    }
  }

  const stats = useMemo(() => {
    if (!selection) return null;
    const totalChars = selection.selected.reduce((s, d) => s + d.totalChars, 0);
    const totalTurns = selection.selected.reduce((s, d) => s + d.turns.length, 0);
    const initialCov = {}, medialCov = {};
    INITIALS.forEach(c => initialCov[c] = selection.finalCoverage['I_' + c] || 0);
    VOWELS.forEach(v => medialCov[v] = selection.finalCoverage['M_' + v] || 0);
    const initMet = INITIALS.filter(c => initialCov[c] >= minCoverage).length;
    const medMet = VOWELS.filter(v => medialCov[v] >= minCoverage).length;
    return { dialogues: selection.selected.length, turns: totalTurns, totalChars, initialCov, medialCov, initMet, medMet };
  }, [selection, minCoverage]);

  // 첫 화면
  if (status === 'idle' && !selection) {
    const hasPartialPool = pool.length > 0;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">한국어 보이스 클로닝 스크립트</h1>
          <p className="text-sm text-slate-500 mb-10">대화 형식 · 200대화 · 자연스러운 흐름</p>

          <button onClick={generate}
            className="w-full px-8 py-6 bg-slate-900 text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg">
            {hasPartialPool ? `이어서 만들기 (현재 ${pool.length}대화)` : '스크립트 생성'}
          </button>

          <div className="mt-6 text-xs text-slate-400">
            {hasPartialPool ? '이전 진행분이 남아있습니다' : `일꾼 ${CONCURRENCY}명 병렬 생성 · 처음엔 몇 분, 이후엔 즉시`}
          </div>

          {hasPartialPool && (
            <button onClick={() => { setPool([]); setSelection(null); }}
              className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline">
              풀 비우고 처음부터 다시
            </button>
          )}

          <label className="mt-8 inline-block text-xs text-slate-500 hover:text-slate-700 cursor-pointer underline">
            이전에 저장한 데이터 불러오기
            <input type="file" accept=".json" className="hidden"
              onChange={(e) => e.target.files[0] && loadPool(e.target.files[0])} />
          </label>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-left">
              <div className="font-semibold text-red-800 mb-1">오류가 발생했어요</div>
              <div className="text-red-700 text-xs font-mono break-all">{error}</div>
              <div className="text-red-600 text-xs mt-2">잠시 후 다시 시도해보세요.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 작업 중
  if (status === 'working') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="inline-block w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          </div>
          <div className="text-slate-700 font-medium mb-4">{statusText}</div>
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="h-full bg-slate-900 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // 결과
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs text-slate-500">스크립트</div>
              <div className="font-semibold text-slate-900">
                {stats.dialogues}대화 · {stats.turns}턴 ·{' '}
                <span className={stats.dialogues >= TARGET_DIALOGUES ? 'text-emerald-600' : 'text-amber-600'}>
                  {stats.totalChars.toLocaleString()}자
                </span>
                <span className="text-slate-400 font-normal text-sm"> / 목표 {TARGET_DIALOGUES}대화</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={downloadScript}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">
                다운로드
              </button>
              <button onClick={generate}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
                다시
              </button>
              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-slate-600">각 음소 최소 등장 횟수</label>
                  <span className="font-mono font-bold text-sm text-slate-900">{minCoverage}회</span>
                </div>
                <input type="range" min="5" max="30" value={minCoverage}
                  onChange={(e) => setMinCoverage(parseInt(e.target.value))} className="w-full" />
                <div className="text-xs text-slate-400 mt-1">값을 낮추면 더 적은 수집으로도 조기 종료됩니다</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="text-slate-500">초성 도달</div>
                  <div className={`font-mono font-bold text-lg ${stats.initMet === 19 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {stats.initMet}/19
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="text-slate-500">중성 도달</div>
                  <div className={`font-mono font-bold text-lg ${stats.medMet === 21 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {stats.medMet}/21
                  </div>
                </div>
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-slate-600 hover:text-slate-900 py-1">음소 분포 보기</summary>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <PhonemeBars title="초성" counts={stats.initialCov} order={INITIALS} threshold={minCoverage} />
                  <PhonemeBars title="중성" counts={stats.medialCov} order={VOWELS} threshold={minCoverage} />
                </div>
              </details>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button onClick={downloadPool}
                  className="text-xs text-slate-600 hover:text-slate-900 underline">
                  데이터 저장 ({pool.length}대화)
                </button>
                <span className="text-slate-300">·</span>
                <label className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer">
                  데이터 불러오기
                  <input type="file" accept=".json" className="hidden"
                    onChange={(e) => e.target.files[0] && loadPool(e.target.files[0])} />
                </label>
              </div>
            </div>
          )}

          {/* 대화 리스트 */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-5 font-serif text-[15px] leading-relaxed">
              {selection.selected.map((d, i) => (
                <div key={i} className="group">
                  <div className="text-[10px] text-slate-300 font-mono mb-1">대화 {i + 1}</div>
                  <div className="space-y-1 pl-1 border-l-2 border-slate-100 hover:border-slate-300 transition-colors">
                    {d.turns.map((t, j) => (
                      <div key={j} className="flex gap-2 pl-3">
                        <span className={`text-xs font-bold pt-1 w-4 shrink-0 ${t.speaker === 'A' ? 'text-blue-500' : 'text-rose-500'}`}>
                          {t.speaker}
                        </span>
                        <span className="flex-1 text-slate-800">{t.text}</span>
                        <span className="text-xs text-slate-300 font-mono pt-1 opacity-0 group-hover:opacity-100">
                          {t.syllables}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}
      </div>
    </div>
  );
}

function PhonemeBars({ title, counts, order, threshold }) {
  const maxCount = Math.max(...Object.values(counts), 1);
  return (
    <div>
      <div className="text-xs font-medium text-slate-700 mb-1">{title}</div>
      <div className="space-y-0.5">
        {order.map(p => {
          const count = counts[p] || 0;
          const pct = (count / maxCount) * 100;
          const ok = count >= threshold;
          return (
            <div key={p} className="flex items-center gap-1.5">
              <span className="w-4 font-mono font-bold text-[10px]">{p}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-sm overflow-hidden">
                <div className={`h-full ${ok ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`w-7 text-right font-mono text-[10px] ${ok ? 'text-slate-600' : 'text-amber-700 font-semibold'}`}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

# HANDOFF — 도구 2: 알고리즘 보이스 대본 생성기

> **이 문서를 먼저 읽으세요.** 이 작업을 (로컬 환경 등에서) 이어받는 에이전트를 위한
> 인수인계 메모입니다. 컨텍스트가 없어도 여기만 보면 이어서 진행할 수 있도록 정리했습니다.
> 최종 갱신: 2026-06-17 (브랜치 `claude/gifted-galileo-e0gkko`)

---

## 0. 한 줄 요약

`labs` 레포에 보이스 클로닝 대본 생성 도구를 **2개** 둔다.
도구 1(기존)은 Claude로 문장을 창작(로그인 필요), 도구 2(신규)는 **로그인/Claude 없이 순수 알고리즘**으로
대화 문장을 생성한다. 음소 분석·커버리지·선택 로직은 두 도구가 공유한다.

---

## 1. 목표 / 큰 그림

| | 도구 1 (있음) | 도구 2 (만들 것) |
| --- | --- | --- |
| 이름 | 한국어 보이스 클로닝 대본 생성기 | (가칭) 알고리즘 대본 생성기 |
| 문장 생성 | Claude API 창작 | **순수 알고리즘 합성** |
| 로그인 | 필요 | **불필요** |
| 형태 | claude.site 아티팩트 iframe 임베드 | labs **네이티브 페이지**(브라우저 실행, 오프라인) |
| 공통 | 한글 음소 분해 → 커버리지 계산 → 200개 그리디 선택 (← `src/lib/hangul` 공유) | |

핵심 차이는 딱 하나: **문장을 어떻게 얻느냐**(Claude 창작 vs 알고리즘 생성).

---

## 2. 지금까지 완료된 것 (커밋됨)

- `4eb6348` — **도구 1 로컬 클론**: `local/voice-script-builder/`
  - `source.jsx` — 도구 1 원본 아티팩트 소스(주석 포함, 역설계 1차 자료)
  - `index.html` — 브라우저 단독 실행 클론(React/Babel/Tailwind CDN). 로컬 실행 시 Anthropic API 키 입력 필요(claude.ai 프록시가 로컬엔 없어서). 나머지는 원본과 동일
  - `README.md` — 실행법 + 구조 분석
- `36ac9a7` — **한글 엔진 벤더링**: `src/lib/hangul/`
  - `soundbluemusic/soundblue-monorepo` 의 `packages/core/hangul/src` 를 그대로 복사
    (commit `61545a146f0edfaeacb31a9949ee9793a83da90d`, Apache-2.0). 외부 의존성 0
  - 검증 완료: 기능 스모크 10/10 + `tsc --strict --noEmit` 통과 (자세한 건 `src/lib/hangul/VENDOR.md`)
  - prettier 제외 처리됨(`.prettierignore`)

---

## 3. 도구 1 구조 (역설계 기준점) — `local/voice-script-builder/source.jsx`

생성 파이프라인이 두 부분으로 갈린다:

- **Claude 의존(대체 대상):** `callAPI()`, `buildPoolPrompt()`
  - `claude-sonnet-4-20250514` 에 배치(`BATCH_SIZE=15`)로 대화 요청, 동시 일꾼 `CONCURRENCY=4`
  - 프롬프트가 요구하는 것: 3~4턴, **B의 첫 턴이 A를 받아 반응**(동의/질문/놀람/공감), 종결어미 세트 준수,
    감정 자극 소재 금지, 교과서 어투 금지, 7~90세가 읽을 수 있는 일상 대화
- **순수 알고리즘(이미 로그인 불필요, 도구 2에서 재사용):**
  - `parseDialogues()` / `hasReaction()` — 파싱 + 검증(턴 3~6, 턴당 4~40음절, 반응성 필수, 총 ≥20음절)
  - `decompose()` / `phonemeVector()` — 초/중/종성 분해 + 음소 카운트 → **`src/lib/hangul` 로 대체**
  - `greedySelect()` — 2단계 그리디. Phase A: 음소 다양성 채우기, Phase B: 200개까지 역가중치+지터로 채움
  - 상수: `TARGET_DIALOGUES=200`, `minCoverage` 기본 10(범위 5~30), 종성 목표 = `max(3, floor(minCoverage/3))`
  - `ENDING_SETS` 8종(격식 존댓말 / 친근 존댓말×2 / 반말 친근×2 / 감탄·의문 / 회상·공감 / 평어 서술)
  - `TOPIC_SETS` 8세트(일상 주제), `ANGLES` 8종(배치별 분위기)
  - 입출력: 결과를 `voice_script.txt`, 풀 전체를 `dialogue_pool.json` 으로 저장/복원(`loadPool`)

> **재사용 전략:** 도구 2 = `greedySelect` + 커버리지 측정(이건 거의 그대로) **+ `callAPI` 자리에 알고리즘 생성기**.

---

## 4. ⚠️ 샘플 스크립트 저장 규칙 (중요)

사용자가 **도구 1의 실제 생성본(대화)** 을 붙여넣어 준다. **하나도 빠짐없이 누적 저장**할 것.

- **저장 위치:** `local/voice-script-builder-algo/samples/`
- **형식:** 받은 그대로 보존. JSON 풀이면 `.json`, 텍스트면 `.txt`
- **파일명:** `pool-YYYYMMDD-NN.json` / `script-YYYYMMDD-NN.txt` 처럼 날짜+순번. **덮어쓰지 말 것**(계속 누적)
- **용도:** (a) 알고리즘 설계 역설계 레퍼런스, (b) 큐레이션 코퍼스 후보 데이터
- 저장 후 `samples/README.md` 의 인덱스 표에 한 줄 추가(무엇이 들어왔는지 기록)

---

## 5. 도구 2 생성기 — 설계 계획 (다음 작업)

사용자 결정: **신규 알고리즘 생성기**를 만든다(번역기엔 "생성"이 없으므로 새로 제작).
샘플이 모이면 아래 순서로 진행:

1. **샘플 패턴 분석** — 턴 구조, 종결어미별 문장 골격, 자주 쓰는 연결어·맞장구(예: "맞아요", "저도"),
   음절수 분포, 주제 전개 방식. (`hasReaction`의 reactionWords 목록도 참고)
2. **hangul 활용 합성** — `compose`(자모→음절), `applyIrregular`(불규칙 활용), `selectAOrEo`(모음조화)로
   어휘를 문법적으로 변형. 어휘 시드는 번역기 사전(§6)에서 차용 가능
3. **음소 타깃팅** — 부족 음소, 특히 **희귀 음소(ㅃ·ㄸ·ㅒ·ㅖ·ㅢ, 겹받침 ㄳ·ㄵ·ㄺ 등)** 를
   포함하는 단어/문형을 우선 배치해 빈칸을 메움
4. **커버리지 측정** — `toPronunciation()`으로 **발음 기준** 측정 권장(예: "학교"→"학꾜"의 ㄲ 포착).
   철자 기준보다 TTS 학습에 정확
5. **선택** — 도구 1의 `greedySelect` 로직 재사용해 200개 선별
6. **검증** — 먼저 Node에서 커버리지 수치 + 샘플 출력 품질 확인 → 그 다음 UI(네이티브 페이지)

품질 리스크: 템플릿만으로 자연스러움과 희귀 음소 충족을 동시에 잡기 어려움.
→ 필요 시 "큐레이션 코퍼스(§4 샘플) + 알고리즘 선택" 하이브리드를 병행 검토(사용자와 상의).

---

## 6. 활용 가능한 외부 자산 (사용자 소유 레포)

`soundbluemusic/soundblue-monorepo` (public):

- `packages/core/hangul` — 벤더링 출처(이미 가져옴). 전체 API는 `src/lib/hangul/index.ts` JSDoc 참고
- `packages/core/translator/src/dictionary/entries/` — **어휘/표현 뱅크**(한→영 매핑이지만 한국어 표제어 활용 가능):
  `words.ts`, `compound-words.ts`, `onomatopoeia.ts`(254줄), `idioms.ts`(856줄), `sentences.ts`(일상 구), `stems.ts`(어간)
- `packages/core/translator/src/analysis`, `.../correction` — 형태소 분석기·문장 파서·띄어쓰기(DP)·오타교정.
  생성한 문장의 **자연스러움 검증(QC)** 용도로 유용(생성 자체는 못 함)

> **접근 주의:** 이 세션의 GitHub MCP 도구는 `soundbluemusic/labs` 로 제한돼 있었음.
> 다른 레포는 **public 이므로 `git clone` 으로 읽기**가 가능(이번에 그렇게 했음).
> 로컬 환경에서는 해당 레포를 직접 워크스페이스에 두면 더 편함.

---

## 7. 통합 / 배포 메모

- **로컬 개발:** 도구 1과 같은 패턴으로 `local/voice-script-builder-algo/` 안에 standalone(예: `index.html`)로 먼저 만들고 검증.
  단, 브라우저 단독 HTML(Babel)에서는 확장자 없는 TS import가 안 되므로, hangul을 쓰려면
  (a) Node에서 프로토타입(esbuild 번들) 후 로직 확정 → (b) 네이티브 페이지로 이식, 순서를 권장
- **최종 배포:** `src/pages/tools/`(+`/en`,`/ja`)에 네이티브 Astro 페이지 추가, `src/data/tools.ts` 에 항목 추가
  (`requiresLogin: false`, iframe 임베드 대신 네이티브 컴포넌트). hangul은 `src/lib/hangul` 에서 import
  (extensionless, `moduleResolution: bundler` — Astro 기본). 사이트는 Cloudflare Workers 배포(`pnpm deploy`)
- i18n 기본 ko, en/ja 지원(`astro.config.mjs`). 문자열은 `src/i18n/ui.ts` 패턴 따름

---

## 8. 작업 규칙 (현 세션 기준)

- **브랜치:** `claude/gifted-galileo-e0gkko` 에서 개발. 명시 요청 없으면 다른 브랜치 push 금지
- **커밋:** 명확한 메시지 + 표준 트레일러(`Co-Authored-By:` / `Claude-Session:`). 로컬 에이전트는
  자신의 세션 트레일러를 사용. (현 세션 트레일러는 git log 참고)
- **PR:** 사용자가 명시적으로 요청할 때만 생성
- **벤더링 코드(`src/lib/hangul`)** 는 수정·재포맷 금지(그대로 유지). 업스트림 갱신 시 §2 commit 기준 재복사
- 푸시는 `git push -u origin <branch>`, 네트워크 실패 시 지수 백오프 재시도

---

## 9. 결정/대기 상태

- [x] 도구 2 = 신규 알고리즘 생성기 (사용자 확정)
- [x] 분석/커버리지는 `@soundblue/hangul` 로 교체 (벤더링 완료)
- [ ] **샘플 입수 대기** — 사용자가 도구 1 생성본을 붙여줄 예정(§4 규칙대로 저장)
- [ ] 생성기 프로토타입 (Node에서 커버리지 검증)
- [ ] 큐레이션 코퍼스 병행 여부 (샘플 양 보고 사용자와 결정)
- [ ] 네이티브 페이지 + `tools.ts` 등록 + 배포

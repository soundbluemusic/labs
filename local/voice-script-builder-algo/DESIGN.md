# DESIGN.md — 도구 2: 순수 알고리즘 한국어 보이스클로닝 대본 생성기

> 대상: `local/voice-script-builder-algo/` → 최종 `src/pages/tools/`. 로그인/Claude 불필요, 브라우저 오프라인 실행, 약 200대화 출력.
> 근거 데이터: `samples/raw-20260617-01.txt`(도구1 1회 export, 200대화/800턴/14,248음절). 공유 자산: `src/lib/hangul`(Apache-2.0, 수정 금지), 도구1 `greedySelect/parseDialogues/hasReaction`.
> 작성: 2026-06-17. 설계 워크플로(추출 5 + 심사 3 + 반증 3 + 종합 1 에이전트) 결과를 통합. **반증 단계가 HANDOFF §5.4의 핵심 전제(발음기준 커버리지)를 정정시켰음 — §3.3 참조.**

---

## 1. 한 줄 결론 + "이 정도면 충분한가?"

**결론: 정적 큐레이션 코퍼스(도구1 export 박제) + greedySelect 재사용 + 측정으로 특정된 희귀자모만 표적 주입하는 하이브리드(B)로 간다. 단 (1) 커버리지 목표를 "발화 음소"와 "표기 희귀자모" 두 층으로 분리하고, (2) 반복 실행 다양성을 위해 선택을 확률적 샘플링으로 바꾼다.**

**"이 정도면 충분한가?" — 흔한 음소는 충분, 희귀자모는 1회 export로는 불충분(데이터로 확정):**

- 초성 19/19, 중성 19/21 — 1회 export로 이미 포화. minCoverage를 10→5로 낮춰도 **동일한 7개**(ㅞ, ㅒ, ㄳ, ㄽ, ㄿ, ㄾ, ㅋ받침)만 미달 → 이건 "코퍼스 양" 문제가 아니라 일상어에 그 자모가 안 나오는 **구조적 long tail**.
- export를 더 쌓아도(2~5회) 흔한 음소만 더 포화될 뿐 7개 빈칸은 안 메워진다. **따라서 "충분"의 정의를 둘로 쪼개야 한다:**
  - **발화 음소(TTS가 실제로 학습하는 소리)**: 1~2회 export면 충분히 포화. ✅
  - **표기 희귀자모(ㄳ/ㄽ/ㄿ/ㄾ/ㅋ받침)**: 코퍼스로 영원히 불충분. 게다가 §3.3에서 밝히듯 이들 5개는 **발음하면 사라지는 표기 전용 단위**라, "커버리지 목표"가 아니라 "시드 보장"으로 강등해야 정직한 목표가 된다. 진짜 발화 빈칸은 ㅞ/ㅒ 둘뿐.

---

## 2. 권장 아키텍처 (심사 승자 B) + 왜

3개 아키텍처 심사 결과 **B(하이브리드)가 3개 렌즈 모두에서 승자**(TTS품질 42, 제품/배포 43, 엔지니어링 47 — A는 각각 41/45/44, C는 31/28/28).

| 후보 | 핵심 | 치명적 약점 |
|---|---|---|
| A 정적 코퍼스 only | 문장 100% Claude 품질, 구현 최소 | 7개 희귀자모 영구 미달 (coverage 천장) |
| **B 하이브리드 (채택)** | A의 자연스러움 + 빈칸만 외과적 주입 | 약간의 큐레이션 비용 |
| C 순수 템플릿 합성 | 음소 통제력 최강 | 운율/연어 부자연 → TTS 학습셋 오염, NLG 엔진 신규 구축 부담 |

**왜 B인가:**
- 측정 데이터가 문제를 정확히 분해해줬다 — "흔한 음소 = 코퍼스로 공짜 해결 / 빈칸 = 특정됨". 그래서 C 같은 위험한 전면 합성 엔진이 불필요하고, A의 유일한 결함만 소규모·국소·검증가능한 큐레이션으로 메우면 된다.
- 도구1의 측정된 강점(B 첫응답 reactionWord 63%, A단어 재참조 75%, TTR 0.53, 8종 종결어미 분포)을 합성으로 재현하는 건 매우 어렵다. 박제하면 공짜로 보존된다.
- 추가 effort는 A 대비 "희귀자모용 큐레이션 대화 + 발음기준 측정 어댑터"뿐. 리스크가 그 부분으로만 국소화된다.

---

## 3. 모듈 / 데이터구조 설계

### 3.0 전체 파이프라인

```
[정적 코퍼스 JSON]  ─┐
                     ├─→ normalizeDialogues() ─→ [통합 풀] ─→ greedySelect() ─→ 200대화 ─→ voice_script.txt
[rare-seed JSON]    ─┘                              ↑
                                          coverageVector( toCodaNeutralizedPronunciation(turn) )
```

코드는 **순수 함수 + JSON 데이터**로 분리. 런타임 네트워크 0. 신규 알고리즘 거의 0(greedySelect 포팅 + 측정 어댑터만).

### 3.1 정적 코퍼스 포맷

`local/voice-script-builder-algo/corpus/corpus-v1.json` (빌드 산출물, 사람 검수 후 박제):

```jsonc
{
  "schemaVersion": 1,
  "provenance": {                       // §4 R3 mitigation: 출처 명시
    "source": "claude-sonnet-4 via Tool 1",
    "promptVersion": "source.jsx@d059e42",
    "exports": ["raw-20260617-01.txt"],
    "license": "Anthropic ToS; redistribution scope: labs product",
    "curatedBy": "human-reviewed 2026-06-17"
  },
  "dialogues": [
    {
      "id": "c-0001",
      "register": "회상공감",             // 8종 중 1, 대화 내 일관
      "topic": "요리/음식",
      "turns": ["오늘 점심으로 냉면을 먹었는데 면발이 꽤 탱탱했어요.",
                "냉면이요? 국물은 어땠어요?",
                "네, 살짝 칼칼해서 계속 생각나더라고요.",
                "그런 집은 한 번 가면 꼭 다시 찾게 되더라고요."],
      "syllableCounts": [22, 11, 18, 21],
      "reactionOk": true,               // hasReaction 통과 (빌드타임 검증)
      "kind": "natural"                 // "natural" | "rare-seed"
    }
  ]
}
```

- 원문 raw export → `parseDialogues()`로 정규화 → 위 스키마로 직렬화. **덮어쓰지 말고 누적**(HANDOFF §4).
- `provenance`로 라이선스/출처 부채를 문서화. 공개 배포물에는 검수 통과분만 싣는다.

### 3.2 greedySelect 재사용

도구1 `source.jsx`의 `greedySelect`를 **순수 TS로 포팅**(외부 의존 0이므로 1:1 이식). 단 두 군데 교체:

1. `decompose/phonemeVector` → `src/lib/hangul`의 `decompose` + 자체 `coverageVector`(§3.3)로 교체. 벤더 코드는 수정 금지(HANDOFF §8).
2. **Phase B를 결정론적 argmax → 확률적 샘플링으로 교체**(R2 mitigation).

```
// Phase A: 음소 결핍 그리디 — 부족 자모를 가장 많이 채우는 대화 우선
//   동점 후보군은 shuffle이 아니라 seedRandom으로 1개 추출 (rare-seed가 매번 같은 게 박히는 것 방지)
// Phase B: argmax 대신 softmax(score/temperature) 가중 추출
//   → 풀 하위까지 실사용률 ↑, 실행마다 다른 200세트
//   상수 유지: TARGET_DIALOGUES=200, minCoverage 기본 10(5~30), 종성목표 = max(3, floor(minCoverage/3))
```

### 3.3 발음기준 커버리지 (toPronunciation) — ⚠️ 중요 정정 (R1, 신뢰도 0.82)

HANDOFF §5.4는 "`toPronunciation()`으로 발음 기준 측정"을 권장하지만, **벤더 라이브러리의 `toPronunciation`은 그 목적에 그대로 쓰면 안 된다.** 소스 검증(`src/lib/hangul/phonetics/pronunciation.ts:16-26`):

```
export function toPronunciation(text) {
  result = applyFortition(result);      // 경음화
  result = applyNasalization(result);   // 비음화
  result = applyLiquidization(result);  // 유음화
  result = applyPalatalization(result); // 구개음화
  return result;                        // ← applyFinalConsonantRule 없음, 연음 없음
}
```

→ `applyFinalConsonantRule`(rules.ts에 export는 됨)을 **호출하지 않는다.** 실측 함의: 몫→몫, 핥다→핥다, 읊다→읊다, 부엌→부엌 그대로 — 종성 ㄳ/ㄾ/ㄿ/ㅋ받침이 유지된다. 즉 이 함수 출력은 코다에 관해 철자와 거의 동일 → "발음 기준이 더 정확/포화"라는 전제가 이 구현에서는 성립하지 않는다(철자 대비 새 신호 ≈ 0).

**더 근본적 문제:** 음성학적으로 올바르게 변환하면 ㄳ→ㄱ, ㅋ받침→ㄱ, ㄽ/ㄾ/ㄿ→ㄹ로 100% 중화되고, 모음 앞에선 연음(몫이[목씨], 부엌에[부어케], 읊어[을퍼])되어 **코다 위치의 ㄳ/ㄿ로는 발음되지 않는다.** 이 5개는 발화 음소로는 존재하지 않고 오직 표기에만 있는 단위다. **ㅞ/ㅒ만 발음에서 살아남는 진짜 빈칸.**

**따라서 커버리지 모델을 2층으로 분리한다:**

```
// 어댑터는 src/lib/hangul 바깥(도구2 측)에 둔다 — 벤더 코드 수정 금지(HANDOFF §8)
function toCodaNeutralizedPronunciation(text: string): string {
  const p = toPronunciation(text);             // 경음화 등 살아있는 음운변화 보존
  return applyFinalConsonantRule(p);           // 종성 7대표음 중화 명시 적용
}
```

| 층 | 측정 함수 | 목표(target) | 대상 자모 |
|---|---|---|---|
| **L1 발화 음소** (TTS가 배우는 소리) | `coverageVector(toCodaNeutralizedPronunciation(turn))` | minCoverage(기본 10), 종성 max(3,⌊mc/3⌋) | 초성 전체, 중성 전체(ㅞ/ㅒ 포함), 중화된 7대표 종성, 경음화로 생기는 ㄲ/ㄸ 등 |
| **L2 표기 희귀자모** (소리론 사라짐) | 철자 기준 자모 등장 횟수 | **커버리지 목표 아님 → 시드 보장 1~2회** | ㄳ, ㄽ, ㄿ, ㄾ, ㅋ받침 |

greedySelect 점수는 **L1만** 사용. L2는 별도 게이트(§3.4)로 보장.

### 3.4 rare-seed gap-filler 사양

목표를 정직하게: **ㅞ/ㅒ는 발음 커버리지(L1)로 채우고, ㄳ/ㄽ/ㄿ/ㄾ/ㅋ받침은 "시드 단어 보장"(L2)으로 채운다.**

`corpus/rare-seed-v1.json` — **사람이 손으로 작성한** 짧은 4턴 대화 묶음(합성 아님, 자연스러움 보존). 각 대화는 hasReaction을 통과하고 턴당 6~30음절을 지킨다.

```jsonc
{
  "kind": "rare-seed", "targetJamo": "ㅞ",
  "dialogues": [
    { "id":"r-웨-01", "register":"친근존댓",
      "turns":["저 어제 웬일로 일찍 일어났어요.",            // ㅞ: 웬
               "웬일이요? 무슨 좋은 일 있었어요?",            // echo '웬일' → hasReaction OK
               "네, 그냥 눈이 일찍 떠지더라고요.",
               "그런 날은 하루가 길게 느껴지더라고요."],
      "syllableCounts":[16,14,15,18], "reactionOk":true }
  ]
}
```

**자모별 시드 어휘 뱅크(검증된 일상어 우선):**

| 자모 | 층 | 시드 어휘(자연스러움 우선) | 비고 |
|---|---|---|---|
| ㅞ | L1(발화 유지) | 웬일, 궤도, 꿰매다, 스웨터, 웨딩 | 발음에 살아남음 → 커버리지로 채움 |
| ㅒ | L1(발화 유지) | 얘, 얘기, 걔, 쟤 | 구어 빈출, 자연스러움 높음 |
| ㄳ | L2(시드 보장) | 몫, 삯, 넋 | 발음 시 ㄱ/연음 → 표기만 보장 |
| ㄽ | L2(시드 보장) | 외곬 | 극히 드묾, 1회 보장으로 충분 |
| ㄿ | L2(시드 보장) | 읊다, 읊조리다 | "시를 읊다" |
| ㄾ | L2(시드 보장) | 핥다, 훑다 | "핥아 먹다", "훑어보다" |
| ㅋ받침 | L2(시드 보장) | 부엌, 동녘, 새벽녘 | "부엌에서" |

**주입 메커니즘:**
1. rare-seed 대화는 풀에 `kind:"rare-seed"`로 합류. greedySelect **Phase A**가 L1 결핍(ㅞ/ㅒ)을 채우려 자연히 우선 선택.
2. L2 자모는 점수에 안 들어가므로, Phase A 종료 후 **명시적 보장 게이트**: 선택된 200세트에서 각 L2 자모 등장이 시드 임계(1~2)에 못 미치면 해당 자모 시드 대화를 강제 포함(다른 한 개와 교체).
3. **변형 다양성(R2)**: 각 자모당 시드 대화를 1개가 아니라 N개(3~5개) 손으로 작성. 동점/보장 선택 시 seedRandom으로 매번 다른 변형이 뽑히게 → "다시" 버튼이 같은 filler를 반복하지 않음.
4. `compose(cho,jung,jong)`는 **시드 단어 작성을 돕는 빌드타임 검증 도구**로만 사용. 런타임 문장 합성엔 쓰지 않는다.
5. **UI 분리(R3)**: "자연 대화 / 음소 보강" 토글로 rare-seed를 별 섹션 노출 가능 → 자연스러움 지표 훼손 방지.

---

## 4. 빌드 순서 (HANDOFF §7) + 위험요소·완화

### 빌드 순서

1. **[Node 프로토타입]** `local/voice-script-builder-algo/proto/`
   - (a) `parseDialogues`로 `samples/raw-*.txt` → `corpus/corpus-v1.json` 정규화(빌드 스크립트).
   - (b) `greedySelect` TS 포팅 + `coverageVector` + `toCodaNeutralizedPronunciation` 어댑터.
   - (c) rare-seed 대화 손작성(자모당 3~5개) + hasReaction/음절 검증.
   - (d) **Node에서 커버리지 수치 출력**: L1 전부 포화 확인, L2 시드 보장 확인, 2회 실행 간 200세트 중복률 측정(R2 회귀 가드).
   - esbuild로 hangul 번들(extensionless TS import 때문).
2. **[검증 게이트]** L1 초성19/중성21/중화종성 전부 target 도달 + L2 5자모 각 1회+ + 실행간 중복 < 임계(예 0.6) → 통과해야 다음 단계.
3. **[네이티브 Astro 페이지]** `src/pages/tools/`(+`/en`,`/ja`)에 컴포넌트 추가, hangul은 `src/lib/hangul` extensionless import(`moduleResolution: bundler`). `src/data/tools.ts`에 `requiresLogin:false`로 등록. i18n 문자열은 `src/i18n/ui.ts`. Cloudflare Workers 배포.
4. **[문서/라이선스]** `corpus/PROVENANCE.md` 추가(출처/약관/범위).

### 위험요소 & 완화 (반증 결과 반영)

| ID | 위험 (반증) | 완화책 | 신뢰도 |
|---|---|---|---|
| **R1** | `toPronunciation`이 종성 중화/연음을 안 해 발음 커버리지가 철자와 동일(새 신호 0); 동시에 ㄳ/ㄽ/ㄿ/ㄾ/ㅋ받침은 발화로는 존재 안 함 → "모든 음소 목표 달성" 약속이 거짓 | (a) `toCodaNeutralizedPronunciation` 어댑터로 중화 명시 적용(벤더 밖). (b) 커버리지 목표를 L1 발화 / L2 표기로 분리, L2 5자모는 목표가 아닌 **시드 보장**으로 강등. (c) ㅞ/ㅒ는 발음 유지되므로 L1로 채움. (d) **출시 카피 정정**: "모든 음소 커버" → "발화 음소 전부 포화 + 표기 희귀자모 시드 보장" | 0.82 |
| **R2** | 정적 코퍼스 + 결정론 greedySelect는 매번 거의 같은 200대화 반환(중복 0.89~0.96), filler 100% 고정 → "생성기"가 아닌 "셔플러" | (a) Phase B를 softmax 확률 샘플링으로. (b) 실행 기록 localStorage 쿨다운으로 직전 선택 감점. (c) 풀을 target의 8~10배로 키우고 어절 자카드 dedup. (d) rare-seed 자모당 N개 변형 + 동점 랜덤 추출. (e) "이전과 다르게" 토글 + 신규성 점수 | 0.78 |
| **R3** | 박제 코퍼스 출처=Claude → 라이선스/재배포 불확실; gap-filler가 자연스러움 희석; 번들 비대; 번역기 사전은 문어 편중 | (a) `PROVENANCE.md`로 출처/약관 명시, 검수분만 배포. (b) rare-seed는 합성 아닌 **사람 작성** → 자연스러움 보존, "자연 대화 / 음소 보강" 토글로 분리해 지표 훼손 방지. (c) 번들엔 검수 코퍼스만, 대량 raw는 배제. (d) 번역기 사전은 **시드 어휘 후보**로만 차용(문형 생성엔 안 씀), 차용 시 도구1 구어 분포와 톤 대조 검수 | 0.72 |

---

## 5. 코퍼스 수집 권장

- **export 개수: 2~3회면 충분.** 1회로 이미 L1(흔한 음소) 거의 포화 — 추가 export는 어휘/상황 다양성(TTR, 운율 다양성) 확보용이지 커버리지용이 아니다. **5회 이상 박제는 효용 대비 번들/중복 비용만 늘린다.**
- **무엇을 더 받으면 좋은가 (커버리지 아닌 다양성 목적):**
  1. **다른 ANGLE/TOPIC 조합의 export 1~2개** — 같은 프롬프트 패밀리라 어휘 겹침이 크므로(단일 TTR 0.53), 토픽 분포가 다른 배치를 받아 유효 고유 컨텐츠를 늘린다.
  2. **종결어미 소수 레지스터 보강** — 현재 격식존댓 19/회상반말 10/기타 10으로 적다. 운율 다양성을 위해 이 레지스터가 많은 export가 있으면 도움.
  3. **rare-seed는 export로 받지 말 것** — ㄳ/ㄿ/ㄾ 등은 도구1 일상 프롬프트로 나올 확률이 0에 가깝다(측정: ㅞ=0). 받아도 안 들어오므로 **사람이 직접 작성**이 정답.
- **수집 절차**(HANDOFF §4): 받은 raw 그대로 `samples/raw-YYYYMMDD-NN.txt`로 누적 저장(덮어쓰기 금지), `samples/README.md` 인덱스에 한 줄 추가. 검수 후 `corpus-vN.json`으로 박제.

---

## 부록 — 핵심 파일 경로

- 코퍼스 원문: `samples/raw-20260617-01.txt`
- 분석 스크립트(철자기준 커버리지): `analysis/analyze.mjs`
- 도구1 소스(greedySelect/parseDialogues/hasReaction): `../voice-script-builder/source.jsx`
- hangul 공개 API: `../../src/lib/hangul/index.ts`
- **toPronunciation 실구현(R1 근거)**: `../../src/lib/hangul/phonetics/pronunciation.ts` (16-26행, `applyFinalConsonantRule` 미호출)
- `applyFinalConsonantRule` 정의: `../../src/lib/hangul/phonetics/rules.ts` (export됨, 도구2 어댑터에서 직접 호출)
- 인수인계: `HANDOFF.md`
- 신규 작업 디렉터리(권장): `proto/`, `corpus/`

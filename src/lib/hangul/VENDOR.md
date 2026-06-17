# Vendored: `@soundblue/hangul`

한국어 한글 처리 라이브러리. labs 도구들이 음소 분석·발음 기반 커버리지·
중복 제거·문장 합성에 공통으로 사용합니다.

## 출처 (Provenance)

| 항목 | 값 |
| --- | --- |
| Source repo | `soundbluemusic/soundblue-monorepo` |
| Source path | `packages/core/hangul/src/` |
| Commit | `61545a146f0edfaeacb31a9949ee9793a83da90d` |
| License | Apache-2.0 (`./LICENSE`) |
| 변경 사항 | 없음 — `src/` 전체를 그대로 복사 (외부 런타임 의존성 0) |

> 상위 패키지가 `private: true`라 npm에 게시되지 않아, npm 의존성 대신 소스를 벤더링했습니다.
> 업스트림이 갱신되면 위 commit 기준으로 다시 복사하면 됩니다.

## 검증 (이 커밋 기준)

- 기능 스모크 10/10 통과: `decompose`, `compose`, `toPronunciation`(학교→학꾜, 신라→실라),
  `hasBatchim`, `CHO/JUNG/JONG` = 19/21/28, `countSyllables`, `similarity`
- `tsc --strict --noEmit` 통과

## labs 도구에서 쓰는 핵심 API

- `decompose` / `decomposeAll` / `analyzeSyllables` — 초/중/종성 분해
- `CHO`(19) · `JUNG`(21) · `JONG`(28) · `DOUBLE_JONG` — 음소 상수 (보이스 대본 툴과 정확히 일치)
- `toPronunciation` — 연음·경음화·비음화·유음화·구개음화 적용 → **발음 기준** 음소 커버리지 측정용
- `similarity` / `jamoEditDistance` — 풀에서 유사 중복 대화 제거
- `compose` · `applyIrregular` · `selectAOrEo` — 알고리즘 문장 합성(불규칙·모음조화) 빌딩블록

전체 API는 `index.ts` 상단 JSDoc 참고.

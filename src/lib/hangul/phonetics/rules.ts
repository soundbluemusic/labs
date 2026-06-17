// ========================================
// Phonetics Rules - 음운 규칙
// 맞춤법 제3장 (소리에 관한 것) 구현
// ========================================

import { compose, decompose, splitDoubleJong } from '../jamo';

// ========================================
// 두음법칙 (맞춤법 제10~12항)
// ========================================

/**
 * 두음법칙 제10항: ㄴ계 두음법칙
 * 한자음 '녀, 뇨, 뉴, 니'가 단어 첫머리에 올 때
 * → '여, 요, 유, 이'로 적음
 *
 * 예: 녀자→여자, 뇨도→요도, 뉴대륙→유대륙, 니승→이승
 * 예외: 냥(兩), 년(年) - 의존명사는 본음 유지
 */
const INITIAL_LAW_N_VOWELS: Record<string, string> = {
  녀: '여',
  뇨: '요',
  뉴: '유',
  니: '이',
};

/**
 * 두음법칙 제11항: ㄹ계 두음법칙 (ㅑ,ㅕ,ㅛ,ㅠ,ㅣ 앞)
 * 한자음 '랴, 려, 례, 료, 류, 리'가 단어 첫머리에 올 때
 * → '야, 여, 예, 요, 유, 이'로 적음
 *
 * 예: 려행→여행, 료리→요리, 류행→유행, 리유→이유
 * 추가: 렬→열, 률→율 (모음/ㄴ 뒤에서)
 */
const INITIAL_LAW_R_Y_VOWELS: Record<string, string> = {
  랴: '야',
  려: '여',
  례: '예',
  료: '요',
  류: '유',
  리: '이',
  렬: '열',
  률: '율',
};

/**
 * 두음법칙 제12항: ㄹ계 두음법칙 (ㅏ,ㅐ,ㅗ,ㅚ,ㅜ,ㅡ 앞)
 * 한자음 '라, 래, 로, 뢰, 루, 르'가 단어 첫머리에 올 때
 * → '나, 내, 노, 뇌, 누, 느'로 적음
 *
 * 예: 락원→낙원, 래일→내일, 로동→노동, 루각→누각
 */
const INITIAL_LAW_R_N_VOWELS: Record<string, string> = {
  라: '나',
  래: '내',
  로: '노',
  뢰: '뇌',
  루: '누',
  르: '느',
};

/**
 * 두음법칙 예외 단어 (의존명사 등)
 * 이 단어들은 두음법칙을 적용하지 않음
 */
const INITIAL_LAW_EXCEPTIONS = new Set([
  '냥', // 兩 (의존명사)
  '년', // 年 (의존명사: 몇 년)
  '리', // 里, 理 (의존명사: 몇 리, 그럴 리가)
]);

/**
 * 두음법칙 적용 (단어 첫머리)
 * 맞춤법 제10~12항 통합 처리
 *
 * @param text 입력 텍스트
 * @param applyToWordStart 단어 첫머리에만 적용할지 (기본값: true)
 * @returns 두음법칙 적용된 텍스트
 *
 * @example
 * applyInitialLaw('녀자') // → '여자'
 * applyInitialLaw('려행') // → '여행'
 * applyInitialLaw('락원') // → '낙원'
 * applyInitialLaw('대한민국') // → '대한민국' (변화 없음)
 */
export function applyInitialLaw(text: string, applyToWordStart = true): string {
  if (!text) return text;

  // 단어 단위로 분리
  const words = text.split(/(\s+)/);

  return words
    .map((word) => {
      // 공백은 그대로
      if (/^\s+$/.test(word)) return word;

      // 예외 단어 체크
      if (INITIAL_LAW_EXCEPTIONS.has(word)) return word;

      const chars = [...word];
      const result: string[] = [];

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        if (!char) continue;

        // 단어 첫머리 또는 모든 위치 적용
        const isWordStart = i === 0;
        const shouldApply = !applyToWordStart || isWordStart;

        if (shouldApply) {
          // 제10항: ㄴ계
          if (INITIAL_LAW_N_VOWELS[char]) {
            result.push(INITIAL_LAW_N_VOWELS[char]);
            continue;
          }

          // 제11항: ㄹ계 (ㅑ,ㅕ,ㅛ,ㅠ,ㅣ)
          if (INITIAL_LAW_R_Y_VOWELS[char]) {
            result.push(INITIAL_LAW_R_Y_VOWELS[char]);
            continue;
          }

          // 제12항: ㄹ계 (ㅏ,ㅐ,ㅗ,ㅚ,ㅜ,ㅡ)
          if (INITIAL_LAW_R_N_VOWELS[char]) {
            result.push(INITIAL_LAW_R_N_VOWELS[char]);
            continue;
          }
        }

        result.push(char);
      }

      return result.join('');
    })
    .join('');
}

/**
 * 두음법칙 역변환 (표준어 → 한자 원음)
 * 번역 시 한자어 원형 복원에 사용
 *
 * @param text 표준어 텍스트
 * @returns 한자 원음 형태
 *
 * @example
 * reverseInitialLaw('여자') // → '녀자'
 * reverseInitialLaw('여행') // → '려행'
 * reverseInitialLaw('낙원') // → '락원'
 */
export function reverseInitialLaw(text: string): string {
  if (!text) return text;

  // 역변환 맵 생성
  const reverseNMap: Record<string, string> = {};
  for (const [from, to] of Object.entries(INITIAL_LAW_N_VOWELS)) {
    reverseNMap[to] = from;
  }

  const reverseRYMap: Record<string, string> = {};
  for (const [from, to] of Object.entries(INITIAL_LAW_R_Y_VOWELS)) {
    reverseRYMap[to] = from;
  }

  const reverseRNMap: Record<string, string> = {};
  for (const [from, to] of Object.entries(INITIAL_LAW_R_N_VOWELS)) {
    reverseRNMap[to] = from;
  }

  const words = text.split(/(\s+)/);

  return words
    .map((word) => {
      if (/^\s+$/.test(word)) return word;

      const chars = [...word];
      if (chars.length === 0) return word;

      const firstChar = chars[0];
      if (!firstChar) return word;

      // ㄹ계 (ㅑ,ㅕ,ㅛ,ㅠ,ㅣ) 먼저 체크 - 더 일반적
      if (reverseRYMap[firstChar]) {
        chars[0] = reverseRYMap[firstChar];
        return chars.join('');
      }

      // ㄴ계 체크
      if (reverseNMap[firstChar]) {
        chars[0] = reverseNMap[firstChar];
        return chars.join('');
      }

      // ㄹ계 (ㅏ,ㅐ,ㅗ,ㅚ,ㅜ,ㅡ) 체크
      if (reverseRNMap[firstChar]) {
        chars[0] = reverseRNMap[firstChar];
        return chars.join('');
      }

      return word;
    })
    .join('');
}

/**
 * 열/률 규칙 적용 (제11항 붙임)
 * 모음이나 ㄴ 받침 뒤에서는 '렬→열', '률→율'
 * 그 외에서는 '렬→렬', '률→률' 유지
 *
 * @param prevChar 앞 글자
 * @param currentChar 현재 글자 ('렬' 또는 '률')
 * @returns 변환된 글자
 *
 * @example
 * applyRyeolYul('비', '률') // → '율' (비율)
 * applyRyeolYul('백', '률') // → '률' (백분률→실제로는 율이지만 원칙)
 * applyRyeolYul('선', '률') // → '율' (선율)
 */
export function applyRyeolYul(prevChar: string | undefined, currentChar: string): string {
  if (currentChar !== '렬' && currentChar !== '률') {
    return currentChar;
  }

  // 앞 글자가 없으면 (단어 첫머리) 두음법칙 적용
  if (!prevChar) {
    return currentChar === '렬' ? '열' : '율';
  }

  const prev = decompose(prevChar);
  if (!prev) return currentChar;

  // 모음으로 끝나거나 (받침 없음) ㄴ 받침이면 두음법칙 적용
  if (prev.jong === '' || prev.jong === 'ㄴ') {
    return currentChar === '렬' ? '열' : '율';
  }

  // 그 외에는 본음 유지 (실제로는 두음법칙이 적용되지만, 맞춤법상 표기는 다름)
  return currentChar;
}

/**
 * 경음화 (된소리되기)
 * 받침 ㄱ,ㄷ,ㅂ + ㄱ,ㄷ,ㅂ,ㅅ,ㅈ → 된소리
 * '학교' → [학꾜], '식당' → [식땅]
 */
export function applyFortition(text: string): string {
  const chars = [...text];
  const result: string[] = [];

  // 경음화 대상 초성
  const fortitionTargets: Record<string, string> = {
    ㄱ: 'ㄲ',
    ㄷ: 'ㄸ',
    ㅂ: 'ㅃ',
    ㅅ: 'ㅆ',
    ㅈ: 'ㅉ',
  };

  // 경음화 유발 받침
  const triggerJong = ['ㄱ', 'ㄷ', 'ㅂ'];

  for (let i = 0; i < chars.length; i++) {
    const currentChar = chars[i];
    const nextChar = chars[i + 1];
    if (!currentChar) continue;

    const current = decompose(currentChar);
    const next = nextChar ? decompose(nextChar) : null;

    result.push(currentChar);

    if (current && next) {
      // 겹받침의 경우 마지막 자음 확인
      let effectiveJong = current.jong;
      const doubled = splitDoubleJong(current.jong);
      if (doubled) {
        effectiveJong = doubled[1];
      }

      const newCho = fortitionTargets[next.cho];
      if (triggerJong.includes(effectiveJong) && newCho) {
        // 다음 글자 된소리화
        const newNext = compose({
          ...next,
          cho: newCho,
        });
        if (newNext) {
          chars[i + 1] = newNext;
        }
      }
    }
  }

  return result.join('');
}

/**
 * 비음화
 * ㄱ,ㄷ,ㅂ + ㄴ,ㅁ → ㅇ,ㄴ,ㅁ
 * '국물' → [궁물], '작년' → [장년]
 */
export function applyNasalization(text: string): string {
  const chars = [...text];
  const result: string[] = [];

  // 비음화 변환
  const nasalChange: Record<string, string> = {
    ㄱ: 'ㅇ',
    ㄷ: 'ㄴ',
    ㅂ: 'ㅁ',
  };

  // 비음
  const nasals = ['ㄴ', 'ㅁ'];

  for (let i = 0; i < chars.length; i++) {
    const currentChar = chars[i];
    const nextChar = chars[i + 1];
    if (!currentChar) continue;

    const current = decompose(currentChar);
    const next = nextChar ? decompose(nextChar) : null;

    const newJong = current ? nasalChange[current.jong] : undefined;
    if (current && next && newJong && nasals.includes(next.cho)) {
      // 현재 글자 받침 비음화
      const newCurrent = compose({
        ...current,
        jong: newJong,
      });
      result.push(newCurrent ?? currentChar);
    } else {
      result.push(currentChar);
    }
  }

  return result.join('');
}

/**
 * 유음화
 * ㄴ + ㄹ, ㄹ + ㄴ → ㄹㄹ
 * '신라' → [실라], '설날' → [설랄]
 */
export function applyLiquidization(text: string): string {
  const chars = [...text];
  const result: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const currentChar = chars[i];
    const nextChar = chars[i + 1];
    if (!currentChar) continue;

    const current = decompose(currentChar);
    const next = nextChar ? decompose(nextChar) : null;

    if (current && next) {
      // ㄴ + ㄹ → ㄹㄹ
      if (current.jong === 'ㄴ' && next.cho === 'ㄹ') {
        const newCurrent = compose({ ...current, jong: 'ㄹ' });
        result.push(newCurrent ?? currentChar);
        continue;
      }

      // ㄹ + ㄴ → ㄹㄹ
      if (current.jong === 'ㄹ' && next.cho === 'ㄴ') {
        result.push(currentChar);
        const newNext = compose({ ...next, cho: 'ㄹ' });
        if (newNext) {
          chars[i + 1] = newNext;
        }
        continue;
      }
    }

    result.push(currentChar);
  }

  return result.join('');
}

/**
 * 구개음화
 * ㄷ,ㅌ + 이 → ㅈ,ㅊ + 이
 * '굳이' → [구지], '같이' → [가치]
 */
export function applyPalatalization(text: string): string {
  const chars = [...text];
  const result: string[] = [];

  const palatalChange: Record<string, string> = {
    ㄷ: 'ㅈ',
    ㅌ: 'ㅊ',
  };

  for (let i = 0; i < chars.length; i++) {
    const currentChar = chars[i];
    const nextChar = chars[i + 1];
    if (!currentChar) continue;

    const current = decompose(currentChar);
    const next = nextChar ? decompose(nextChar) : null;

    const newCho = current ? palatalChange[current.jong] : undefined;
    if (current && next && newCho && next.jung === 'ㅣ') {
      // 받침 제거, 다음 글자 초성 변경
      const newCurrent = compose({ ...current, jong: '' });
      const newNext = compose({ ...next, cho: newCho });

      result.push(newCurrent ?? currentChar);
      if (newNext) {
        chars[i + 1] = newNext;
      }
      continue;
    }

    result.push(currentChar);
  }

  return result.join('');
}

/**
 * 음절 끝소리 규칙 (받침 대표음)
 * 겹받침 및 특수 받침 → 7개 대표음 (ㄱ,ㄴ,ㄷ,ㄹ,ㅁ,ㅂ,ㅇ)
 */
export function applyFinalConsonantRule(jong: string): string {
  const representative: Record<string, string> = {
    // ㄱ 계열
    ㄱ: 'ㄱ',
    ㄲ: 'ㄱ',
    ㅋ: 'ㄱ',
    ㄳ: 'ㄱ',
    ㄺ: 'ㄱ',

    // ㄴ 계열
    ㄴ: 'ㄴ',
    ㄵ: 'ㄴ',
    ㄶ: 'ㄴ',

    // ㄷ 계열
    ㄷ: 'ㄷ',
    ㅅ: 'ㄷ',
    ㅆ: 'ㄷ',
    ㅈ: 'ㄷ',
    ㅊ: 'ㄷ',
    ㅌ: 'ㄷ',
    ㅎ: 'ㄷ',

    // ㄹ 계열
    ㄹ: 'ㄹ',
    ㄼ: 'ㄹ',
    ㄽ: 'ㄹ',
    ㄾ: 'ㄹ',
    ㄿ: 'ㄹ',
    ㅀ: 'ㄹ',

    // ㅁ 계열
    ㅁ: 'ㅁ',
    ㄻ: 'ㅁ',

    // ㅂ 계열
    ㅂ: 'ㅂ',
    ㅍ: 'ㅂ',
    ㅄ: 'ㅂ',

    // ㅇ
    ㅇ: 'ㅇ',
  };

  return representative[jong] ?? jong;
}

// ========================================
// 사이시옷 (맞춤법 제30항)
// ========================================

/**
 * 사이시옷 규칙 (맞춤법 제30항)
 *
 * 순우리말 합성어나 순우리말+한자어 합성어에서
 * 다음 조건 중 하나를 만족하면 사이시옷을 붙임:
 *
 * 1. 뒷말 첫소리가 된소리로 발음되는 경우
 *    - 나무 + 가지 → 나뭇가지 [나무까지]
 *    - 배 + 길 → 뱃길 [배낄→뱃낄]
 *
 * 2. 뒷말 첫소리 ㄴ,ㅁ 앞에서 ㄴ이 덧나는 경우
 *    - 아래 + 니 → 아랫니 [아랜니]
 *    - 빗 + 물 → 빗물 [빈물]
 *
 * 3. 뒷말 첫소리 모음 앞에서 ㄴㄴ이 덧나는 경우
 *    - 나무 + 잎 → 나뭇잎 [나문닙]
 *    - 도리 + 어깨 → 도리깻어깨
 *
 * 예외: 한자어+한자어는 사이시옷 X (6개 예외: 곳간, 셋방, 숫자, 찻간, 툇간, 횟수)
 */

/**
 * 사이시옷 삽입 여부 판단
 *
 * @param firstWord 앞말
 * @param secondWord 뒷말
 * @returns 사이시옷 필요 여부
 *
 * @example
 * needsSiot('나무', '잎') // true (나뭇잎)
 * needsSiot('바다', '가') // true (바닷가)
 * needsSiot('학교', '길') // false (한자어+한자어)
 */
export function needsSiot(firstWord: string, secondWord: string): boolean {
  if (!firstWord || !secondWord) return false;

  const lastChar = firstWord[firstWord.length - 1];
  const firstChar = secondWord[0];
  if (!lastChar || !firstChar) return false;

  const last = decompose(lastChar);
  const first = decompose(firstChar);
  if (!last || !first) return false;

  // 조건 1: 앞말이 모음으로 끝나야 함 (받침 없음)
  if (last.jong !== '') return false;

  // 조건 2: 뒷말 첫소리 확인
  const cho = first.cho;

  // 2-1: 된소리화 가능 자음 (ㄱ,ㄷ,ㅂ,ㅅ,ㅈ)
  const fortitionTargets = ['ㄱ', 'ㄷ', 'ㅂ', 'ㅅ', 'ㅈ'];
  if (fortitionTargets.includes(cho)) {
    return true;
  }

  // 2-2: ㄴ,ㅁ 앞에서 ㄴ 덧남
  if (cho === 'ㄴ' || cho === 'ㅁ') {
    return true;
  }

  // 2-3: 모음(ㅇ) 앞에서 ㄴㄴ 덧남
  if (cho === 'ㅇ') {
    return true;
  }

  return false;
}

/**
 * 사이시옷이 들어간 합성어 목록
 * (자동 규칙으로 판단하기 어려운 관용적 표현)
 */
const SIOT_COMPOUNDS: Record<string, string> = {
  // 순우리말 합성어
  나무잎: '나뭇잎',
  나무가지: '나뭇가지',
  바다가: '바닷가',
  바다물: '바닷물',
  배길: '뱃길',
  배멀미: '뱃멀미',
  코등: '콧등',
  코구멍: '콧구멍',
  코날: '콧날',
  이몸: '잇몸',
  귀밑: '귓밑',
  눈가: '눈가', // 사이시옷 X
  입가: '입가', // 사이시옷 X (입술과 혼동)
  빗물: '빗물',
  아래니: '아랫니',
  위니: '윗니',
  해님: '햇님',
  해볕: '햇볕',
  해살: '햇살',
  비소리: '빗소리',
  물가: '물가', // 사이시옷 X
  강가: '강가', // 사이시옷 X (한자어)
  촛불: '촛불',
  양초: '양초', // 한자어
  깻잎: '깻잎',
  들깨: '들깨',
  머리카락: '머리카락',
  뒤통수: '뒤통수',
  이마: '이마',
  // 순우리말 + 한자어
  전세방: '전셋방',
  대문간: '대문간', // 사이시옷 X
  // 한자어+한자어 예외 (6개)
  곳간: '곳간', // 庫間
  셋방: '셋방', // 貰房
  숫자: '숫자', // 數字
  찻간: '찻간', // 車間
  툇간: '툇간', // 退間
  횟수: '횟수', // 回數
};

/**
 * 합성어에 사이시옷 적용
 *
 * @param firstWord 앞말
 * @param secondWord 뒷말
 * @returns 사이시옷이 적용된 합성어
 *
 * @example
 * applySiot('나무', '잎') // '나뭇잎'
 * applySiot('바다', '가') // '바닷가'
 * applySiot('배', '길') // '뱃길'
 */
export function applySiot(firstWord: string, secondWord: string): string {
  if (!firstWord || !secondWord) return firstWord + secondWord;

  // 1. 사전에 등록된 합성어 확인
  const compound = firstWord + secondWord;
  const registered = SIOT_COMPOUNDS[compound];
  if (registered) return registered;

  // 2. 규칙 기반 판단
  if (!needsSiot(firstWord, secondWord)) {
    return compound;
  }

  // 3. 사이시옷 삽입
  const lastChar = firstWord[firstWord.length - 1];
  if (!lastChar) return compound;

  const last = decompose(lastChar);
  if (!last) return compound;

  // 앞말 마지막 글자에 ㅅ 받침 추가
  const newLast = compose({
    cho: last.cho,
    jung: last.jung,
    jong: 'ㅅ',
  });

  if (!newLast) return compound;

  return firstWord.slice(0, -1) + newLast + secondWord;
}

/**
 * 사이시옷 제거 (원형 복원)
 *
 * @param word 사이시옷이 포함된 단어
 * @returns 분리된 앞말과 뒷말, 또는 null
 *
 * @example
 * removeSiot('나뭇잎') // { first: '나무', second: '잎' }
 * removeSiot('바닷가') // { first: '바다', second: '가' }
 */
export function removeSiot(word: string): { first: string; second: string } | null {
  // 등록된 합성어에서 역방향 검색
  for (const [original, compound] of Object.entries(SIOT_COMPOUNDS)) {
    if (compound === word) {
      // original에서 정확한 분리점 찾기
      // original = firstWord + secondWord 형태
      // compound = firstWord에 ㅅ받침 추가 + secondWord
      for (let i = 1; i < original.length; i++) {
        const first = original.slice(0, i);
        const second = original.slice(i);

        // first의 마지막 글자에 ㅅ을 추가했을 때 compound와 일치하는지 확인
        const lastChar = first[first.length - 1];
        if (!lastChar) continue;

        const jamo = decompose(lastChar);
        if (!jamo) continue;

        // first가 모음으로 끝나는 경우에만 사이시옷 가능
        if (jamo.jong !== '') continue;

        // first에 ㅅ 받침을 추가한 글자
        const withSiot = compose({ ...jamo, jong: 'ㅅ' });
        if (!withSiot) continue;

        // 직접 재구성하여 비교 (applySiot 사용 시 사전 lookup 부작용 방지)
        const reconstructed = first.slice(0, -1) + withSiot + second;
        if (reconstructed === word) {
          return { first, second };
        }
      }
    }
  }

  // 규칙 기반 분석: ㅅ 받침 찾기
  for (let i = 1; i < word.length; i++) {
    const char = word[i - 1];
    if (!char) continue;

    const jamo = decompose(char);
    if (!jamo) continue;

    if (jamo.jong === 'ㅅ') {
      // ㅅ 받침 제거한 원형
      const restored = compose({
        cho: jamo.cho,
        jung: jamo.jung,
        jong: '',
      });
      if (restored) {
        const first = word.slice(0, i - 1) + restored;
        const second = word.slice(i);
        if (needsSiot(first, second)) {
          return { first, second };
        }
      }
    }
  }

  return null;
}

/**
 * 사이시옷 합성어 목록 조회
 */
export function getSiotCompounds(): Record<string, string> {
  return { ...SIOT_COMPOUNDS };
}

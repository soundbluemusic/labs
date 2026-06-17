// ========================================
// Syllable Combiner - 음절 결합
// ========================================

import { compose, decompose, JONG_LIST, splitDoubleJong } from '../jamo';

/**
 * 종성 자음을 초성 자음으로 변환
 */
function jongToCho(jong: string): string {
  const jongIndex = JONG_LIST.indexOf(jong as (typeof JONG_LIST)[number]);
  if (jongIndex === -1) return 'ㅇ';

  // 종성 → 초성 매핑
  const mapping: Record<string, string> = {
    ㄱ: 'ㄱ',
    ㄲ: 'ㄲ',
    ㄴ: 'ㄴ',
    ㄷ: 'ㄷ',
    ㄹ: 'ㄹ',
    ㅁ: 'ㅁ',
    ㅂ: 'ㅂ',
    ㅅ: 'ㅅ',
    ㅆ: 'ㅆ',
    ㅇ: 'ㅇ',
    ㅈ: 'ㅈ',
    ㅊ: 'ㅊ',
    ㅋ: 'ㅋ',
    ㅌ: 'ㅌ',
    ㅍ: 'ㅍ',
    ㅎ: 'ㅎ',
  };

  return mapping[jong] ?? 'ㅇ';
}

/**
 * 초성 자음을 종성 자음으로 변환
 */
export function choToJong(cho: string): string {
  const mapping: Record<string, string> = {
    ㄱ: 'ㄱ',
    ㄲ: 'ㄲ',
    ㄴ: 'ㄴ',
    ㄷ: 'ㄷ',
    ㄹ: 'ㄹ',
    ㅁ: 'ㅁ',
    ㅂ: 'ㅂ',
    ㅅ: 'ㅅ',
    ㅆ: 'ㅆ',
    ㅇ: 'ㅇ',
    ㅈ: 'ㅈ',
    ㅊ: 'ㅊ',
    ㅋ: 'ㅋ',
    ㅌ: 'ㅌ',
    ㅍ: 'ㅍ',
    ㅎ: 'ㅎ',
  };

  return mapping[cho] ?? '';
}

/**
 * 종성을 다음 음절의 초성으로 이동 (연음)
 * '음악을' → '으마글' (발음 기준)
 */
export function applyLiaison(text: string): string {
  const chars = [...text];
  const result: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const currentChar = chars[i];
    if (!currentChar) continue;
    const current = decompose(currentChar);
    const nextChar = chars[i + 1];
    const next = nextChar ? decompose(nextChar) : null;

    if (current && next && current.jong && next.cho === 'ㅇ') {
      // 현재 글자 받침 제거
      const newCurrent = compose({ ...current, jong: '' });

      // 다음 글자 초성을 현재 받침으로
      // 겹받침인 경우 뒤의 자음만 이동
      const doubled = splitDoubleJong(current.jong);
      let newCho: string;
      let remainJong = '';

      if (doubled) {
        remainJong = doubled[0];
        newCho = jongToCho(doubled[1]);
      } else {
        newCho = jongToCho(current.jong);
      }

      const newNext = compose({ ...next, cho: newCho });

      if (newCurrent && newNext) {
        if (remainJong) {
          result.push(compose({ ...current, jong: remainJong }) ?? currentChar);
        } else {
          result.push(newCurrent);
        }
        result.push(newNext);
        i++; // 다음 글자 처리 완료
        continue;
      }
    }

    result.push(currentChar);
  }

  return result.join('');
}

/**
 * 모음 축약
 */
function contractVowels(v1: string, v2: string): string | null {
  const contractions: Record<string, string> = {
    ㅏㅏ: 'ㅏ',
    ㅓㅓ: 'ㅓ',
    ㅗㅏ: 'ㅘ',
    ㅜㅓ: 'ㅝ',
    ㅡㅓ: 'ㅓ',
    ㅣㅓ: 'ㅕ',
    ㅏㅓ: 'ㅏ',
    ㅓㅏ: 'ㅓ',
  };

  return contractions[v1 + v2] ?? null;
}

/**
 * 두 음절 결합 (받침 처리 포함)
 * ('하', '아') → '하' (ㅏ+ㅏ 축약)
 * ('먹', '어') → '먹어'
 */
export function combineSyllables(first: string, second: string): string {
  if (!first || !second) return first + second;

  const firstLastChar = first[first.length - 1] ?? '';
  const secondFirstChar = second[0] ?? '';
  const firstJamo = decompose(firstLastChar);
  const secondJamo = decompose(secondFirstChar);

  if (!firstJamo || !secondJamo) return first + second;

  // 받침 없고 모음 충돌 시 축약 가능
  if (!firstJamo.jong && secondJamo.cho === 'ㅇ') {
    const contracted = contractVowels(firstJamo.jung, secondJamo.jung);
    if (contracted) {
      const newChar = compose({ ...firstJamo, jung: contracted });
      if (newChar) {
        return first.slice(0, -1) + newChar + second.slice(1);
      }
    }
  }

  return first + second;
}

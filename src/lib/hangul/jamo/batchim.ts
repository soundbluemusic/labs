// ========================================
// Batchim - 받침 처리
// ========================================

import { compose } from './compose';
import { DOUBLE_JONG } from './constants';
import { decompose } from './decompose';
import { isConsonant, isJamo } from './validators';

/**
 * 받침 유무 확인
 * '집' → true, '나' → false
 */
export function hasBatchim(char: string): boolean {
  const jamo = decompose(char);
  return jamo !== null && jamo.jong !== '';
}

/**
 * 받침 가져오기
 * '집' → 'ㅂ', '나' → ''
 */
export function getBatchim(char: string): string {
  const jamo = decompose(char);
  return jamo?.jong ?? '';
}

/**
 * 문자열의 마지막 글자 받침 유무
 */
export function hasLastBatchim(text: string): boolean {
  if (!text) return false;
  const lastChar = text[text.length - 1];
  if (!lastChar) return false;
  return hasBatchim(lastChar);
}

/**
 * 받침 변경
 * ('한', 'ㄹ') → '할'
 */
export function changeBatchim(char: string, newJong: string): string | null {
  const jamo = decompose(char);
  if (!jamo) return null;

  return compose({ ...jamo, jong: newJong });
}

/**
 * 받침 제거
 * '한' → '하'
 */
export function removeBatchim(char: string): string | null {
  return changeBatchim(char, '');
}

/**
 * 겹받침 분리
 * 'ㄳ' → ['ㄱ', 'ㅅ']
 */
export function splitDoubleJong(jong: string): [string, string] | null {
  return DOUBLE_JONG[jong] ?? null;
}

/**
 * 초성만 추출
 * '한글' → 'ㅎㄱ'
 */
export function extractCho(text: string): string {
  let result = '';

  for (const char of text) {
    const jamo = decompose(char);
    if (jamo) {
      result += jamo.cho;
    } else if (isJamo(char) && isConsonant(char)) {
      result += char;
    }
  }

  return result;
}

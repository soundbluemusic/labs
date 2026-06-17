// ========================================
// Validators - 한글 자모 검증
// ========================================

import { CHO_LIST, HANGUL_BASE, HANGUL_END, JONG_LIST, JUNG_LIST } from './constants';

/**
 * 한글 문자인지 확인
 */
export function isHangul(char: string): boolean {
  if (char.length !== 1) return false;
  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_END;
}

/**
 * 자모(낱자)인지 확인
 */
export function isJamo(char: string): boolean {
  if (char.length !== 1) return false;
  const code = char.charCodeAt(0);
  // ㄱ-ㅎ: 0x3131-0x314E, ㅏ-ㅣ: 0x314F-0x3163
  return code >= 0x3131 && code <= 0x3163;
}

/**
 * 모음인지 확인
 */
export function isVowel(char: string): boolean {
  return JUNG_LIST.includes(char as (typeof JUNG_LIST)[number]);
}

/**
 * 자음인지 확인
 */
export function isConsonant(char: string): boolean {
  return (
    CHO_LIST.includes(char as (typeof CHO_LIST)[number]) ||
    JONG_LIST.includes(char as (typeof JONG_LIST)[number])
  );
}

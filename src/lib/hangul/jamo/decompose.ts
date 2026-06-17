// ========================================
// Decompose - 한글 자모 분해
// ========================================

import type { Jamo } from '../types';
import {
  CHO_LIST,
  HANGUL_BASE,
  HANGUL_END,
  JONG_COUNT,
  JONG_LIST,
  JUNG_LIST,
  SYLLABLE_PER_CHO,
} from './constants';

/**
 * 메모이제이션 캐시 (11,172개 한글 음절만 캐싱 가능)
 * 성능: 반복 호출 시 O(1) 조회
 */
const decomposeCache = new Map<string, Jamo>();

/**
 * 한글 문자인지 확인 (internal)
 */
function isHangulChar(char: string): boolean {
  if (char.length !== 1) return false;
  const code = char.charCodeAt(0);
  return code >= HANGUL_BASE && code <= HANGUL_END;
}

/**
 * 한글 음절을 자모로 분해
 * '한' → { cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' }
 *
 * 성능: 메모이제이션으로 반복 호출 시 O(1)
 */
export function decompose(char: string): Jamo | null {
  if (!isHangulChar(char)) return null;

  // 캐시 확인
  const cached = decomposeCache.get(char);
  if (cached) return cached;

  const code = char.charCodeAt(0) - HANGUL_BASE;
  const choIndex = Math.floor(code / SYLLABLE_PER_CHO);
  const jungIndex = Math.floor((code % SYLLABLE_PER_CHO) / JONG_COUNT);
  const jongIndex = code % JONG_COUNT;

  const cho = CHO_LIST[choIndex];
  const jung = JUNG_LIST[jungIndex];
  const jong = JONG_LIST[jongIndex];

  if (cho === undefined || jung === undefined || jong === undefined) {
    return null;
  }

  const result: Jamo = { cho, jung, jong };
  decomposeCache.set(char, result);
  return result;
}

/**
 * 문자열을 자모 단위로 완전 분해
 * '한글' → ['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ']
 */
export function decomposeAll(text: string): string[] {
  const result: string[] = [];

  for (const char of text) {
    const jamo = decompose(char);
    if (jamo) {
      result.push(jamo.cho, jamo.jung);
      if (jamo.jong) result.push(jamo.jong);
    } else {
      result.push(char);
    }
  }

  return result;
}

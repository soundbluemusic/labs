// ========================================
// Syllable Analyzer - 음절 분석
// ========================================

import { decompose, isHangul } from '../jamo';
import type { Syllable } from '../types';

/**
 * 문자열을 음절 단위로 분석
 */
export function analyzeSyllables(text: string): Syllable[] {
  const result: Syllable[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (!char) continue;
    const jamo = decompose(char);

    if (jamo) {
      result.push({ char, jamo, index: i });
    }
  }

  return result;
}

/**
 * 단어의 음절 수 계산
 */
export function countSyllables(text: string): number {
  let count = 0;
  for (const char of text) {
    if (isHangul(char)) count++;
  }
  return count;
}

/**
 * 음절 경계 찾기
 * '안녕하세요' → [0, 1, 2, 3, 4]
 */
export function findSyllableBoundaries(text: string): number[] {
  const boundaries: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char && isHangul(char)) {
      boundaries.push(i);
    }
  }
  return boundaries;
}

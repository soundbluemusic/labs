// ========================================
// Similarity - 유사도 계산
// ========================================

import { isHangul } from '../jamo';
import { decomposeToJamos, jamoEditDistance } from './jamo-distance';

/**
 * 자모 분해 길이 캐시
 * 성능: 중복 decomposeToJamos 호출 제거
 */
const jamoLengthCache = new Map<string, number>();

/**
 * 자모 분해 길이 계산 (캐시 활용)
 */
function getJamoLength(text: string): number {
  const cached = jamoLengthCache.get(text);
  if (cached !== undefined) return cached;

  const length = decomposeToJamos(text).length;
  // 캐시 크기 제한 (메모리 관리)
  if (jamoLengthCache.size > 10000) {
    jamoLengthCache.clear();
  }
  jamoLengthCache.set(text, length);
  return length;
}

/**
 * 두 문자열의 유사도 계산 (0~1)
 * 성능: jamoEditDistance 내부에서 이미 자모 분해하므로 길이만 캐시 조회
 */
export function similarity(a: string, b: string): number {
  const len1 = getJamoLength(a);
  const len2 = getJamoLength(b);

  if (len1 === 0 || len2 === 0) return 0;

  const distance = jamoEditDistance(a, b);
  const maxLen = Math.max(len1, len2);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Calculates keyboard-aware similarity score between two Korean words
 * 키보드 인식 유사도 점수 계산 (0~1)
 */
export function calculateKeyboardSimilarity(word1: string, word2: string): number {
  return similarity(word1, word2);
}

/**
 * Check if text contains Korean characters
 * 텍스트에 한국어 문자가 포함되어 있는지 확인
 */
export function isKoreanText(text: string): boolean {
  for (const char of text) {
    if (isHangul(char)) return true;
  }
  return false;
}

/**
 * Levenshtein distance for non-Korean text
 * 영어/일반 텍스트용 편집 거리 계산
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    const row = dp[i];
    if (row) row[0] = i;
  }
  for (let j = 0; j <= n; j++) {
    const firstRow = dp[0];
    if (firstRow) firstRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const currentRow = dp[i];
      const prevRow = dp[i - 1];
      if (!currentRow || !prevRow) continue;

      if (str1[i - 1] === str2[j - 1]) {
        currentRow[j] = prevRow[j - 1] ?? 0;
      } else {
        const deleteVal = (prevRow[j] ?? 0) + 1;
        const insertVal = (currentRow[j - 1] ?? 0) + 1;
        const substituteVal = (prevRow[j - 1] ?? 0) + 1;
        currentRow[j] = Math.min(deleteVal, insertVal, substituteVal);
      }
    }
  }

  const lastRow = dp[m];
  return lastRow ? (lastRow[n] ?? 0) : 0;
}

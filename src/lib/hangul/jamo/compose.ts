// ========================================
// Compose - 한글 자모 조합
// ========================================

import type { Jamo } from '../types';
import {
  CHO_INDEX_MAP,
  HANGUL_BASE,
  JONG_COUNT,
  JONG_INDEX_MAP,
  JUNG_INDEX_MAP,
  SYLLABLE_PER_CHO,
} from './constants';

/**
 * 자모를 한글 음절로 조합
 * { cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' } → '한'
 *
 * 성능: indexOf() O(n) → Map.get() O(1)
 */
export function compose(jamo: Jamo): string | null {
  const choIndex = CHO_INDEX_MAP.get(jamo.cho);
  const jungIndex = JUNG_INDEX_MAP.get(jamo.jung);
  const jongIndex = jamo.jong ? JONG_INDEX_MAP.get(jamo.jong) : 0;

  if (choIndex === undefined || jungIndex === undefined || jongIndex === undefined) {
    return null;
  }

  const code = HANGUL_BASE + choIndex * SYLLABLE_PER_CHO + jungIndex * JONG_COUNT + jongIndex;
  return String.fromCharCode(code);
}

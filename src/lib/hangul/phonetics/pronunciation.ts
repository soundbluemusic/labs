// ========================================
// Pronunciation - 발음 변환
// ========================================

import { decompose } from '../jamo';
import {
  applyFortition,
  applyLiquidization,
  applyNasalization,
  applyPalatalization,
} from './rules';

/**
 * 모든 음운 규칙 적용 (발음 변환)
 */
export function toPronunciation(text: string): string {
  let result = text;

  // 순서가 중요: 연음 → 경음화 → 비음화 → 유음화 → 구개음화
  result = applyFortition(result);
  result = applyNasalization(result);
  result = applyLiquidization(result);
  result = applyPalatalization(result);

  return result;
}

/**
 * ㅏ/ㅓ 선택 (모음조화)
 * 양성모음(ㅏ,ㅗ) → 아, 음성모음 → 어
 */
export function selectAOrEo(stem: string): 'ㅏ' | 'ㅓ' {
  // 마지막 모음 확인
  for (let i = stem.length - 1; i >= 0; i--) {
    const char = stem[i];
    if (!char) continue;
    const jamo = decompose(char);
    if (jamo) {
      const vowel = jamo.jung;
      // 양성 모음
      if (['ㅏ', 'ㅗ', 'ㅑ', 'ㅛ'].includes(vowel)) {
        return 'ㅏ';
      }
      // 음성 모음
      return 'ㅓ';
    }
  }

  return 'ㅓ'; // 기본값
}

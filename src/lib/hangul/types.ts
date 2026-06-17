// ========================================
// @soundblue/hangul - Types
// 한글 처리 타입 정의
// ========================================

/**
 * 자모 구조 (Jamo Structure)
 * 한글 음절을 초성, 중성, 종성으로 분해한 구조
 */
export interface Jamo {
  cho: string; // 초성 (initial consonant)
  jung: string; // 중성 (medial vowel)
  jong: string; // 종성 (final consonant, empty string if none)
}

/**
 * 음절 구조 (Syllable Structure)
 */
export interface Syllable {
  char: string;
  jamo: Jamo;
  index: number;
}

/**
 * 불규칙 활용 타입 (Irregular Conjugation Types)
 */
export type IrregularType = 'ㄷ' | 'ㅂ' | 'ㅎ' | 'ㅅ' | '르' | '러' | '우' | '으';

/**
 * 초성 타입 (19개)
 */
export type ChoType =
  | 'ㄱ'
  | 'ㄲ'
  | 'ㄴ'
  | 'ㄷ'
  | 'ㄸ'
  | 'ㄹ'
  | 'ㅁ'
  | 'ㅂ'
  | 'ㅃ'
  | 'ㅅ'
  | 'ㅆ'
  | 'ㅇ'
  | 'ㅈ'
  | 'ㅉ'
  | 'ㅊ'
  | 'ㅋ'
  | 'ㅌ'
  | 'ㅍ'
  | 'ㅎ';

/**
 * 중성 타입 (21개)
 */
export type JungType =
  | 'ㅏ'
  | 'ㅐ'
  | 'ㅑ'
  | 'ㅒ'
  | 'ㅓ'
  | 'ㅔ'
  | 'ㅕ'
  | 'ㅖ'
  | 'ㅗ'
  | 'ㅘ'
  | 'ㅙ'
  | 'ㅚ'
  | 'ㅛ'
  | 'ㅜ'
  | 'ㅝ'
  | 'ㅞ'
  | 'ㅟ'
  | 'ㅠ'
  | 'ㅡ'
  | 'ㅢ'
  | 'ㅣ';

/**
 * 종성 타입 (28개, 빈 문자열 포함)
 */
export type JongType =
  | ''
  | 'ㄱ'
  | 'ㄲ'
  | 'ㄳ'
  | 'ㄴ'
  | 'ㄵ'
  | 'ㄶ'
  | 'ㄷ'
  | 'ㄹ'
  | 'ㄺ'
  | 'ㄻ'
  | 'ㄼ'
  | 'ㄽ'
  | 'ㄾ'
  | 'ㄿ'
  | 'ㅀ'
  | 'ㅁ'
  | 'ㅂ'
  | 'ㅄ'
  | 'ㅅ'
  | 'ㅆ'
  | 'ㅇ'
  | 'ㅈ'
  | 'ㅊ'
  | 'ㅋ'
  | 'ㅌ'
  | 'ㅍ'
  | 'ㅎ';

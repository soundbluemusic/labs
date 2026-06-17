// ========================================
// Hangul Jamo Constants - 한글 자모 상수
// 완전한 한글 자모 체계 (초성 19개, 중성 21개, 종성 28개)
// ========================================

// ========================================
// 유니코드 상수
// ========================================
export const HANGUL_BASE = 0xac00; // '가'
export const HANGUL_END = 0xd7a3; // '힣'
export const JUNG_COUNT = 21;
export const JONG_COUNT = 28;
export const SYLLABLE_PER_CHO = JUNG_COUNT * JONG_COUNT; // 588

// ========================================
// 초성 (19개)
// ========================================
export const CHO = [
  'ㄱ', // 0
  'ㄲ', // 1
  'ㄴ', // 2
  'ㄷ', // 3
  'ㄸ', // 4
  'ㄹ', // 5
  'ㅁ', // 6
  'ㅂ', // 7
  'ㅃ', // 8
  'ㅅ', // 9
  'ㅆ', // 10
  'ㅇ', // 11
  'ㅈ', // 12
  'ㅉ', // 13
  'ㅊ', // 14
  'ㅋ', // 15
  'ㅌ', // 16
  'ㅍ', // 17
  'ㅎ', // 18
] as const;

// 구 이름 호환성
export const CHO_LIST = CHO;

// ========================================
// 중성 (21개)
// ========================================
export const JUNG = [
  'ㅏ', // 0
  'ㅐ', // 1
  'ㅑ', // 2
  'ㅒ', // 3
  'ㅓ', // 4
  'ㅔ', // 5
  'ㅕ', // 6
  'ㅖ', // 7
  'ㅗ', // 8
  'ㅘ', // 9
  'ㅙ', // 10
  'ㅚ', // 11
  'ㅛ', // 12
  'ㅜ', // 13
  'ㅝ', // 14
  'ㅞ', // 15
  'ㅟ', // 16
  'ㅠ', // 17
  'ㅡ', // 18
  'ㅢ', // 19
  'ㅣ', // 20
] as const;

// 구 이름 호환성
export const JUNG_LIST = JUNG;

// ========================================
// 종성 (28개, 빈 종성 포함)
// ========================================
export const JONG = [
  '', // 0: 받침 없음
  'ㄱ', // 1
  'ㄲ', // 2
  'ㄳ', // 3: ㄱㅅ
  'ㄴ', // 4
  'ㄵ', // 5: ㄴㅈ
  'ㄶ', // 6: ㄴㅎ
  'ㄷ', // 7
  'ㄹ', // 8
  'ㄺ', // 9: ㄹㄱ
  'ㄻ', // 10: ㄹㅁ
  'ㄼ', // 11: ㄹㅂ
  'ㄽ', // 12: ㄹㅅ
  'ㄾ', // 13: ㄹㅌ
  'ㄿ', // 14: ㄹㅍ
  'ㅀ', // 15: ㄹㅎ
  'ㅁ', // 16
  'ㅂ', // 17
  'ㅄ', // 18: ㅂㅅ
  'ㅅ', // 19
  'ㅆ', // 20
  'ㅇ', // 21
  'ㅈ', // 22
  'ㅊ', // 23
  'ㅋ', // 24
  'ㅌ', // 25
  'ㅍ', // 26
  'ㅎ', // 27
] as const;

// 구 이름 호환성
export const JONG_LIST = JONG;

// ========================================
// 자모 분류
// ========================================

/**
 * 단순 자음 (14개)
 * 쌍자음과 겹자음을 제외한 기본 자음
 */
export const SIMPLE_CONSONANTS = [
  'ㄱ',
  'ㄴ',
  'ㄷ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅅ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

/**
 * 쌍자음 (5개)
 * 초성에만 사용
 */
export const DOUBLE_CONSONANTS = ['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'] as const;

/**
 * 겹자음 (11개)
 * 받침(종성)에만 사용
 */
export const COMPLEX_CONSONANTS = [
  'ㄳ',
  'ㄵ',
  'ㄶ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅄ',
] as const;

/**
 * 단순 모음 (10개)
 * 합성되지 않은 기본 모음
 */
export const SIMPLE_VOWELS = ['ㅏ', 'ㅐ', 'ㅓ', 'ㅔ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ', 'ㅛ', 'ㅠ'] as const;

/**
 * 복합 모음 (11개)
 * ㅗ, ㅜ, ㅡ 등이 합성된 모음
 */
export const COMPLEX_VOWELS = [
  'ㅑ',
  'ㅒ',
  'ㅕ',
  'ㅖ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅢ',
] as const;

// ========================================
// 겹받침 분리 맵
// ========================================
export const DOUBLE_JONG: Record<string, [string, string]> = {
  ㄳ: ['ㄱ', 'ㅅ'],
  ㄵ: ['ㄴ', 'ㅈ'],
  ㄶ: ['ㄴ', 'ㅎ'],
  ㄺ: ['ㄹ', 'ㄱ'],
  ㄻ: ['ㄹ', 'ㅁ'],
  ㄼ: ['ㄹ', 'ㅂ'],
  ㄽ: ['ㄹ', 'ㅅ'],
  ㄾ: ['ㄹ', 'ㅌ'],
  ㄿ: ['ㄹ', 'ㅍ'],
  ㅀ: ['ㄹ', 'ㅎ'],
  ㅄ: ['ㅂ', 'ㅅ'],
};

// ========================================
// 타입 정의 (상수 기반)
// ========================================
export type ChoType = (typeof CHO)[number];
export type JungType = (typeof JUNG)[number];
export type JongType = (typeof JONG)[number];
export type SimpleConsonantType = (typeof SIMPLE_CONSONANTS)[number];
export type DoubleConsonantType = (typeof DOUBLE_CONSONANTS)[number];
export type ComplexConsonantType = (typeof COMPLEX_CONSONANTS)[number];
export type SimpleVowelType = (typeof SIMPLE_VOWELS)[number];
export type ComplexVowelType = (typeof COMPLEX_VOWELS)[number];

// ========================================
// 역방향 조회 Map (O(1) 성능 최적화)
// indexOf() O(n) → Map.get() O(1)
// ========================================
export const CHO_INDEX_MAP = new Map<string, number>(CHO.map((c, i) => [c, i]));
export const JUNG_INDEX_MAP = new Map<string, number>(JUNG.map((c, i) => [c, i]));
export const JONG_INDEX_MAP = new Map<string, number>(JONG.map((c, i) => [c, i]));

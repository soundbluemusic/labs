/**
 * @module @soundblue/hangul
 *
 * # Korean Hangul Processing Library (한글 처리 라이브러리)
 *
 * A comprehensive TypeScript library for processing Korean Hangul text,
 * including decomposition, composition, phonetic rules, and keyboard-aware
 * similarity calculations.
 *
 * ## Features
 *
 * - **Jamo Processing**: Decompose syllables to Jamo and compose back
 * - **Batchim Handling**: Check, get, change, and remove final consonants
 * - **Distance Calculation**: Keyboard-aware edit distance for typo detection
 * - **Phonetic Rules**: Apply Korean pronunciation rules (연음, 비음화, 경음화 등)
 * - **Irregular Conjugation**: Handle Korean irregular verb/adjective stems
 * - **Syllable Analysis**: Analyze syllable structure and boundaries
 *
 * ## Installation
 *
 * ```bash
 * pnpm add @soundblue/hangul
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   decompose,
 *   compose,
 *   hasBatchim,
 *   jamoEditDistance,
 *   similarity,
 *   toPronunciation,
 * } from '@soundblue/hangul';
 *
 * // Decompose a syllable into Jamo
 * decompose('한');
 * // → { cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' }
 *
 * // Compose Jamo into a syllable
 * compose({ cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' });
 * // → '한'
 *
 * // Check for final consonant (받침)
 * hasBatchim('한');  // → true
 * hasBatchim('나');  // → false
 *
 * // Calculate similarity (typo detection)
 * similarity('한글', '한굴');  // → ~0.9 (similar - adjacent key typo)
 * similarity('한글', '영어');  // → ~0.0 (different)
 *
 * // Get pronunciation
 * toPronunciation('학교');  // → '학꾜' (경음화)
 * toPronunciation('신라');  // → '실라' (유음화)
 * ```
 *
 * ## Module Organization
 *
 * The library is organized into logical modules:
 *
 * | Module | Description | Key Functions |
 * |--------|-------------|---------------|
 * | Distance | Edit distance & similarity | `jamoEditDistance`, `similarity` |
 * | Jamo | Decomposition & composition | `decompose`, `compose`, `hasBatchim` |
 * | Irregulars | Irregular verb/adj handling | `applyIrregular`, `restoreIrregular` |
 * | Phonetics | Pronunciation rules | `toPronunciation`, `applyNasalization` |
 * | Syllable | Syllable analysis | `analyzeSyllables`, `countSyllables` |
 *
 * @packageDocumentation
 */

// ========================================
// Distance Module (편집 거리)
// ========================================
/**
 * ## Distance Functions
 *
 * Functions for calculating edit distance and similarity between Korean text.
 * These are essential for typo detection, fuzzy search, and autocomplete.
 *
 * The key innovation is **keyboard-aware distance**: typos caused by adjacent
 * keys (like ㄱ↔ㄷ) or Shift errors (ㄱ↔ㄲ) receive lower costs than random
 * substitutions.
 *
 * @example
 * ```typescript
 * import {
 *   jamoEditDistance,
 *   similarity,
 *   calculateKeyboardSimilarity,
 *   isKoreanText,
 *   levenshteinDistance,
 * } from '@soundblue/hangul';
 *
 * // Keyboard-aware Jamo edit distance
 * jamoEditDistance('사과', '사가');  // → 0.5 (adjacent key: ㅗ↔ㅏ)
 * jamoEditDistance('까다', '가다');  // → 0.3 (double consonant: ㄲ↔ㄱ)
 * jamoEditDistance('안녕', '안녕');  // → 0 (exact match)
 *
 * // Similarity score (0 to 1)
 * similarity('컴퓨터', '컴퓨타');  // → ~0.9 (very similar)
 * similarity('사과', '바나나');    // → ~0.2 (different)
 *
 * // Check if text contains Korean
 * isKoreanText('Hello');    // → false
 * isKoreanText('안녕');      // → true
 * isKoreanText('Hello안녕'); // → true
 *
 * // Standard Levenshtein (for non-Korean text)
 * levenshteinDistance('hello', 'hallo');  // → 1
 * ```
 */
export {
  /** Calculate keyboard-aware similarity score (0-1) between two Korean words */
  calculateKeyboardSimilarity,
  /** Decompose Korean text into individual Jamo characters */
  decomposeToJamos,
  /** Check if two Jamo are adjacent on the 2-beolsik keyboard */
  isAdjacentKey,
  /** Check if two Jamo are single/double consonant variants (ㄱ↔ㄲ) */
  isDoubleConsonantMistake,
  /** Check if text contains any Korean characters */
  isKoreanText,
  /** Calculate keyboard-weighted Jamo edit distance for Korean text */
  jamoEditDistance,
  /** Calculate Euclidean distance between two keys on 2-beolsik keyboard */
  keyboardDistance,
  /** Calculate standard Levenshtein distance (for non-Korean text) */
  levenshteinDistance,
  /** Calculate similarity score (0-1) using Jamo edit distance */
  similarity,
} from './distance';

// ========================================
// Irregulars Module (불규칙 활용)
// ========================================
/**
 * ## Irregular Conjugation Functions
 *
 * Korean has several irregular conjugation patterns where the stem changes
 * when certain endings are attached. These functions handle the 7 main
 * irregular types: ㅂ, ㄷ, ㅅ, ㅎ, 르, ㄹ, and 으.
 *
 * @example
 * ```typescript
 * import {
 *   applyIrregular,
 *   restoreIrregular,
 *   getIrregularType,
 *   irregularStems,
 * } from '@soundblue/hangul';
 *
 * // ㅂ irregular: 돕다 → 도와, 춥다 → 추워
 * getIrregularType('돕');  // → 'ㅂ'
 * applyIrregular('돕', 'ㅂ', 'ㅏ');  // → '도와'
 *
 * // ㄷ irregular: 듣다 → 들어, 걷다 → 걸어
 * getIrregularType('듣');  // → 'ㄷ'
 * applyIrregular('듣', 'ㄷ', 'ㅓ');  // → '들어'
 *
 * // 르 irregular: 부르다 → 불러, 모르다 → 몰라
 * getIrregularType('모르');  // → '르'
 * applyIrregular('부르', '르', 'ㅓ');  // → '불러'
 *
 * // Restore to dictionary form
 * restoreIrregular('도와', 'ㅂ');  // → '돕아'
 *
 * // Get map of known irregular stems
 * irregularStems;  // → { '돕': 'ㅂ', '듣': 'ㄷ', ... }
 * ```
 */
export {
  /** Apply irregular conjugation to a stem */
  applyIrregular,
  /** Get the irregular type of a stem (ㅂ, ㄷ, ㅅ, ㅎ, 르, ㄹ, 으) */
  getIrregularType,
  /** Map of known irregular stems to their irregular type */
  irregularStems,
  /** Restore an irregularly conjugated form to base stem */
  restoreIrregular,
} from './irregulars';

// ========================================
// Jamo Module (자모 처리)
// ========================================
/**
 * ## Jamo Processing Functions & Constants
 *
 * Core functions for working with Korean Jamo (자모), the individual
 * consonants and vowels that make up Korean syllables.
 *
 * ### Korean Syllable Structure
 *
 * A Korean syllable has 3 parts:
 * - **초성 (Choseong)**: Initial consonant (required) - 19 consonants
 * - **중성 (Jungseong)**: Medial vowel (required) - 21 vowels
 * - **종성 (Jongseong)**: Final consonant (optional) - 27 consonants + empty
 *
 * Unicode formula: `가 + (cho × 588) + (jung × 28) + jong`
 *
 * @example
 * ```typescript
 * import {
 *   // Decomposition & Composition
 *   decompose,
 *   decomposeAll,
 *   compose,
 *   // Batchim (받침) operations
 *   hasBatchim,
 *   getBatchim,
 *   changeBatchim,
 *   removeBatchim,
 *   hasLastBatchim,
 *   // Validators
 *   isHangul,
 *   isJamo,
 *   isVowel,
 *   isConsonant,
 *   // Constants
 *   CHO, JUNG, JONG,
 *   DOUBLE_JONG,
 * } from '@soundblue/hangul';
 *
 * // === Decomposition ===
 * decompose('한');
 * // → { cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' }
 *
 * decompose('가');
 * // → { cho: 'ㄱ', jung: 'ㅏ', jong: '' }
 *
 * decomposeAll('한글');
 * // → ['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ']
 *
 * // === Composition ===
 * compose({ cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' });
 * // → '한'
 *
 * // === Batchim (받침) ===
 * hasBatchim('집');  // → true (받침: ㅂ)
 * hasBatchim('나');  // → false
 * getBatchim('집');  // → 'ㅂ'
 * getBatchim('나');  // → ''
 *
 * changeBatchim('한', 'ㄹ');  // → '할'
 * removeBatchim('한');        // → '하'
 * hasLastBatchim('사람');     // → true (마지막 글자 '람'에 받침 있음)
 *
 * // === Validators ===
 * isHangul('한');   // → true (완성형 한글)
 * isHangul('a');    // → false
 * isJamo('ㄱ');     // → true (자모)
 * isJamo('가');     // → false (완성형)
 * isVowel('ㅏ');    // → true
 * isConsonant('ㄱ'); // → true
 *
 * // === Double Final Consonants (겹받침) ===
 * DOUBLE_JONG['ㄳ'];  // → ['ㄱ', 'ㅅ']
 * DOUBLE_JONG['ㄺ'];  // → ['ㄹ', 'ㄱ']
 * splitDoubleJong('ㄳ');  // → ['ㄱ', 'ㅅ']
 * ```
 */
export {
  /** Initial consonants (초성) - 19 consonants: ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ */
  CHO,
  /** @deprecated Use CHO instead */
  CHO_LIST,
  /** Complex/compound consonants (겹자음) - ㄳㄵㄶㄺㄻㄼㄽㄾㄿㅀㅄ */
  COMPLEX_CONSONANTS,
  /** Complex/compound vowels (복합 모음) - ㅑㅒㅕㅖㅘㅙㅚㅝㅞㅟㅢ */
  COMPLEX_VOWELS,
  /** Change the final consonant (받침) of a syllable */
  changeBatchim,
  /** Compose Jamo into a Korean syllable */
  compose,
  /** Double consonants (쌍자음) - ㄲㄸㅃㅆㅉ */
  DOUBLE_CONSONANTS,
  /** Double final consonant mapping: 겹받침 → [first, second] */
  DOUBLE_JONG,
  /** Decompose a Korean syllable into Jamo */
  decompose,
  /** Decompose entire text into individual Jamo array */
  decomposeAll,
  /** Extract initial consonants (초성) from text */
  extractCho,
  /** Get the final consonant (받침) of a syllable */
  getBatchim,
  /** Unicode code point of '가' (first Hangul syllable) */
  HANGUL_BASE,
  /** Unicode code point of '힣' (last Hangul syllable) */
  HANGUL_END,
  /** Check if a syllable has a final consonant (받침) */
  hasBatchim,
  /** Check if the last character of text has a 받침 */
  hasLastBatchim,
  /** Check if a character is a consonant (자음) */
  isConsonant,
  /** Check if a character is a complete Hangul syllable (가-힣) */
  isHangul,
  /** Check if a character is a Jamo (ㄱ-ㅣ) */
  isJamo,
  /** Check if a character is a vowel (모음) */
  isVowel,
  /** Final consonants (종성) - 28 including empty: ''ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ */
  JONG,
  /** Number of possible 종성 (28) */
  JONG_COUNT,
  /** @deprecated Use JONG instead */
  JONG_LIST,
  /** Medial vowels (중성) - 21 vowels: ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ */
  JUNG,
  /** Number of possible 중성 (21) */
  JUNG_COUNT,
  /** @deprecated Use JUNG instead */
  JUNG_LIST,
  /** Remove the final consonant (받침) from a syllable */
  removeBatchim,
  /** Simple consonants (단순 자음) - ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ */
  SIMPLE_CONSONANTS,
  /** Simple vowels (단순 모음) - ㅏㅐㅓㅔㅗㅜㅡㅣㅛㅠ */
  SIMPLE_VOWELS,
  /** Number of syllables per 초성 (588 = 21 × 28) */
  SYLLABLE_PER_CHO,
  /** Split a double final consonant (겹받침) into its components */
  splitDoubleJong,
} from './jamo';

// ========================================
// Phonetics Module (음운 규칙)
// ========================================
/**
 * ## Phonetic Rules Functions
 *
 * Functions for applying Korean phonetic rules (음운 규칙) to convert
 * written text to its actual pronunciation. Essential for text-to-speech,
 * romanization, and linguistic analysis.
 *
 * ### Supported Rules
 *
 * | Rule | Korean | Example |
 * |------|--------|---------|
 * | Liaison (연음) | 연음 법칙 | 음악 → 으막 |
 * | Nasalization | 비음화 | 국물 → 궁물 |
 * | Lateralization | 유음화 | 신라 → 실라 |
 * | Fortition | 경음화 | 학교 → 학꾜 |
 * | Palatalization | 구개음화 | 굳이 → 구지 |
 * | Final consonant | 받침 규칙 | 닭 → 닥 |
 *
 * @example
 * ```typescript
 * import {
 *   toPronunciation,
 *   applyNasalization,
 *   applyLiquidization,
 *   applyFortition,
 *   applyPalatalization,
 *   applyFinalConsonantRule,
 *   selectAOrEo,
 * } from '@soundblue/hangul';
 *
 * // === Complete pronunciation conversion ===
 * toPronunciation('학교');   // → '학꾜' (fortition: ㄱ+ㄱ→ㄱㄲ)
 * toPronunciation('신라');   // → '실라' (lateralization: ㄴ+ㄹ→ㄹㄹ)
 * toPronunciation('국물');   // → '궁물' (nasalization: ㄱ+ㅁ→ㅇㅁ)
 * toPronunciation('음악을'); // → '으마글' (liaison)
 *
 * // === Individual rules ===
 * applyNasalization('국', '물');   // → ['궁', '물'] (ㄱ→ㅇ before ㅁ)
 * applyLiquidization('신', '라');  // → ['실', '라'] (ㄴ→ㄹ before/after ㄹ)
 * applyFortition('학', '교');      // → ['학', '꾜'] (ㄱ→ㄲ after ㄱ받침)
 * applyPalatalization('굳', '이'); // → ['구', '지'] (ㄷ+이→지)
 *
 * // === Helper: Select 아/어 for conjugation ===
 * selectAOrEo('가');  // → 'ㅏ' (양성모음 → 아)
 * selectAOrEo('서');  // → 'ㅓ' (음성모음 → 어)
 * selectAOrEo('하');  // → 'ㅏ' (하다 → 해 special case)
 * ```
 */
export {
  /** Apply final consonant simplification rule (받침 규칙) */
  applyFinalConsonantRule,
  /** Apply fortition (경음화) - tensing of consonants */
  applyFortition,
  /** Apply 두음법칙 (Initial Sound Law) - 맞춤법 제10~12항 */
  applyInitialLaw,
  /** Apply lateralization (유음화) - ㄴ↔ㄹ assimilation */
  applyLiquidization,
  /** Apply nasalization (비음화) - consonant → nasal */
  applyNasalization,
  /** Apply palatalization (구개음화) - ㄷ,ㅌ + 이 → 지,치 */
  applyPalatalization,
  /** Apply 열/률 규칙 (렬→열, 률→율) - 맞춤법 제11항 붙임 */
  applyRyeolYul,
  /** Apply 사이시옷 to compound words - 맞춤법 제30항 */
  applySiot,
  /** Get dictionary of 사이시옷 compound words */
  getSiotCompounds,
  /** Check if 사이시옷 is needed between two words */
  needsSiot,
  /** Remove 사이시옷 and restore original words */
  removeSiot,
  /** Reverse 두음법칙 (표준어 → 한자 원음) - 번역용 */
  reverseInitialLaw,
  /** Select 아(ㅏ) or 어(ㅓ) based on vowel harmony */
  selectAOrEo,
  /** Convert written text to pronunciation (applies all rules) */
  toPronunciation,
} from './phonetics';

// ========================================
// Syllable Module (음절 처리)
// ========================================
/**
 * ## Syllable Analysis Functions
 *
 * Functions for analyzing and manipulating Korean syllables at a higher level.
 * Useful for text processing, typography, and linguistic analysis.
 *
 * @example
 * ```typescript
 * import {
 *   analyzeSyllables,
 *   countSyllables,
 *   combineSyllables,
 *   findSyllableBoundaries,
 *   applyLiaison,
 *   choToJong,
 * } from '@soundblue/hangul';
 *
 * // === Syllable Analysis ===
 * analyzeSyllables('한글');
 * // → [
 * //     { char: '한', cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' },
 * //     { char: '글', cho: 'ㄱ', jung: 'ㅡ', jong: 'ㄹ' }
 * //   ]
 *
 * countSyllables('안녕하세요');  // → 5
 * countSyllables('Hello');      // → 0 (non-Korean)
 *
 * // === Syllable Boundaries ===
 * findSyllableBoundaries('한글처리');
 * // → [0, 1, 2, 3, 4] (each character is a syllable)
 *
 * // === Liaison (연음) - Final consonant moves to next syllable ===
 * applyLiaison('음악');  // → '으막' (ㅁ moves to next syllable)
 * applyLiaison('책을');  // → '채글'
 *
 * // === Combine Syllables ===
 * combineSyllables(['한', '글']);  // → '한글'
 *
 * // === Convert initial to final consonant ===
 * choToJong('ㄱ');  // → 'ㄱ' (same)
 * choToJong('ㄲ');  // → 'ㄱ' (ㄲ not valid as 받침)
 * ```
 */
export {
  /** Analyze text into syllable components */
  analyzeSyllables,
  /** Apply liaison (연음) rule between syllables */
  applyLiaison,
  /** Convert initial consonant (초성) to valid final consonant (종성) */
  choToJong,
  /** Combine array of syllables into string */
  combineSyllables,
  /** Count Korean syllables in text */
  countSyllables,
  /** Find syllable boundary positions in text */
  findSyllableBoundaries,
} from './syllable';

// ========================================
// Types
// ========================================
/**
 * ## Type Definitions
 *
 * TypeScript types for working with Korean Jamo and syllables.
 *
 * @example
 * ```typescript
 * import type {
 *   Jamo,
 *   ChoType,
 *   JungType,
 *   JongType,
 *   Syllable,
 *   IrregularType,
 * } from '@soundblue/hangul';
 *
 * // Jamo object (decomposed syllable)
 * const jamo: Jamo = { cho: 'ㅎ', jung: 'ㅏ', jong: 'ㄴ' };
 *
 * // Type-safe consonant/vowel
 * const cho: ChoType = 'ㅎ';   // Initial consonant
 * const jung: JungType = 'ㅏ'; // Medial vowel
 * const jong: JongType = 'ㄴ'; // Final consonant (or '')
 *
 * // Irregular verb type
 * const irregType: IrregularType = 'ㅂ';  // ㅂ불규칙
 * ```
 */
export type {
  /** Initial consonant type (ㄱ-ㅎ, including doubles) */
  ChoType,
  /** Irregular conjugation type: 'ㅂ' | 'ㄷ' | 'ㅅ' | 'ㅎ' | '르' | 'ㄹ' | '으' */
  IrregularType,
  /** Decomposed Jamo object: { cho, jung, jong } */
  Jamo,
  /** Final consonant type ('' | ㄱ-ㅎ, including compounds) */
  JongType,
  /** Medial vowel type (ㅏ-ㅣ) */
  JungType,
  /** Analyzed syllable with position info */
  Syllable,
} from './types';

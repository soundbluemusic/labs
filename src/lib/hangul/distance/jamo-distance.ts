// ========================================
// Jamo Edit Distance - 자모 편집 거리
// ========================================
//
// This module provides keyboard-aware edit distance calculation for Korean text.
// Unlike standard Levenshtein distance which treats all character substitutions equally,
// this algorithm considers the physical keyboard layout to provide more accurate
// typo detection and fuzzy matching for Korean input.
//
// ## Algorithm Overview
//
// The algorithm decomposes Korean syllables (e.g., "한") into their constituent
// Jamo components (ㅎ, ㅏ, ㄴ) and calculates edit distance at the Jamo level.
// This is more accurate for Korean because:
//
// 1. A single Korean syllable contains 2-3 Jamo (initial consonant + vowel + optional final consonant)
// 2. Common typos involve adjacent keys on the 2-beolsik keyboard layout
// 3. Double consonant mistakes (e.g., ㄱ vs ㄲ) are very common
//
// ## Cost Model
//
// | Operation                    | Cost  | Rationale                              |
// |------------------------------|-------|----------------------------------------|
// | Exact match                  | 0.0   | No change needed                       |
// | Double consonant mistake     | 0.3   | Very common typo (Shift key error)     |
// | Adjacent key substitution    | 0.5   | Common physical keyboard typo          |
// | Near key substitution        | 0.6-0.8 | Based on Euclidean distance          |
// | Standard substitution        | 1.0   | Default substitution cost              |
// | Insertion/Deletion           | 1.0   | Standard edit operation                |
//
// ## Usage Examples
//
// ```typescript
// import { jamoEditDistance, decomposeToJamos, isAdjacentKey } from '@soundblue/hangul';
//
// // Basic distance calculation
// jamoEditDistance('한글', '한굴');  // → ~0.5 (adjacent key ㅡ→ㅜ)
// jamoEditDistance('안녕', '안녕');  // → 0 (exact match)
// jamoEditDistance('사과', '사가');  // → ~0.5 (adjacent key typo)
//
// // Double consonant detection
// jamoEditDistance('까다', '가다');  // → ~0.3 (double consonant mistake)
//
// // Decomposition for analysis
// decomposeToJamos('한글');  // → ['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ']
//
// // Keyboard adjacency check
// isAdjacentKey('ㄱ', 'ㄷ');  // → true (adjacent on 2-beolsik)
// isAdjacentKey('ㄱ', 'ㅁ');  // → false (not adjacent)
// ```
//
// ## 2-Beolsik Keyboard Layout Reference
//
// ```
// Row 0: ㅂ ㅈ ㄷ ㄱ ㅅ | ㅛ ㅕ ㅑ ㅐ ㅔ
// Row 1: ㅁ ㄴ ㅇ ㄹ ㅎ | ㅗ ㅓ ㅏ ㅣ
// Row 2: ㅋ ㅌ ㅊ ㅍ   | ㅠ ㅜ ㅡ
// ```
//
// ## Performance Considerations
//
// - Time complexity: O(m * n) where m, n are Jamo counts of input strings
// - Space complexity: O(m * n) for the DP table
// - Adjacent key lookup: O(1) using pre-computed Sets
// - Suitable for real-time typo correction in search/autocomplete
//
// ========================================

import { isHangul } from '../jamo';

/**
 * Initial consonants (초성) - 19 consonants in Unicode order.
 * These are the consonants that can appear at the beginning of a Korean syllable.
 *
 * Index mapping: 가=0, 까=1, 나=2, ... (used in syllable decomposition formula)
 */
const CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

/**
 * Medial vowels (중성) - 21 vowels in Unicode order.
 * These are the vowels that form the nucleus of a Korean syllable.
 *
 * Includes basic vowels (ㅏ, ㅓ, ㅗ, ㅜ, ㅡ, ㅣ) and compound vowels (ㅘ, ㅙ, ㅚ, etc.)
 */
const JUNGSEONG = [
  'ㅏ',
  'ㅐ',
  'ㅑ',
  'ㅒ',
  'ㅓ',
  'ㅔ',
  'ㅕ',
  'ㅖ',
  'ㅗ',
  'ㅘ',
  'ㅙ',
  'ㅚ',
  'ㅛ',
  'ㅜ',
  'ㅝ',
  'ㅞ',
  'ㅟ',
  'ㅠ',
  'ㅡ',
  'ㅢ',
  'ㅣ',
];

/**
 * Final consonants (종성) - 28 consonants (including empty) in Unicode order.
 * These are the optional consonants that can appear at the end of a Korean syllable.
 *
 * The first element is empty string '' representing syllables without a final consonant.
 * Includes single consonants and compound consonants (겹받침) like ㄳ, ㄵ, ㄺ, etc.
 */
const JONGSEONG = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

/**
 * Korean 2-beolsik (두벌식) keyboard layout position map.
 *
 * Maps each Jamo to its physical position on a standard Korean keyboard.
 * Positions are defined as {row, col} where:
 * - row 0: Top row (QWERTY row on English keyboard)
 * - row 1: Home row (ASDF row on English keyboard)
 * - row 2: Bottom row (ZXCV row on English keyboard)
 *
 * Double consonants (ㄲ, ㄸ, ㅃ, ㅆ, ㅉ) share positions with their single counterparts
 * as they are typed with Shift + single consonant.
 *
 * @internal Used for calculating keyboard distance between Jamo
 */
const KEYBOARD_LAYOUT: Record<string, { row: number; col: number }> = {
  // 1행 (자음)
  ㅂ: { row: 0, col: 0 },
  ㅃ: { row: 0, col: 0 },
  ㅈ: { row: 0, col: 1 },
  ㅉ: { row: 0, col: 1 },
  ㄷ: { row: 0, col: 2 },
  ㄸ: { row: 0, col: 2 },
  ㄱ: { row: 0, col: 3 },
  ㄲ: { row: 0, col: 3 },
  ㅅ: { row: 0, col: 4 },
  ㅆ: { row: 0, col: 4 },
  // 1행 (모음)
  ㅛ: { row: 0, col: 5 },
  ㅕ: { row: 0, col: 6 },
  ㅑ: { row: 0, col: 7 },
  ㅐ: { row: 0, col: 8 },
  ㅒ: { row: 0, col: 8 },
  ㅔ: { row: 0, col: 9 },
  ㅖ: { row: 0, col: 9 },

  // 2행 (자음)
  ㅁ: { row: 1, col: 0 },
  ㄴ: { row: 1, col: 1 },
  ㅇ: { row: 1, col: 2 },
  ㄹ: { row: 1, col: 3 },
  ㅎ: { row: 1, col: 4 },
  // 2행 (모음)
  ㅗ: { row: 1, col: 5 },
  ㅓ: { row: 1, col: 6 },
  ㅏ: { row: 1, col: 7 },
  ㅣ: { row: 1, col: 8 },

  // 3행 (자음)
  ㅋ: { row: 2, col: 0 },
  ㅌ: { row: 2, col: 1 },
  ㅊ: { row: 2, col: 2 },
  ㅍ: { row: 2, col: 3 },
  // 3행 (모음)
  ㅠ: { row: 2, col: 4 },
  ㅜ: { row: 2, col: 5 },
  ㅡ: { row: 2, col: 6 },
};

/**
 * Pre-computed adjacent key mapping for O(1) neighbor lookup.
 *
 * Each entry maps a Jamo to a Set of its physically adjacent keys on the
 * 2-beolsik keyboard. This allows instant determination of whether two
 * Jamo are neighbors, which is essential for typo detection.
 *
 * Adjacent keys are determined by physical proximity on the keyboard,
 * considering both horizontal and diagonal neighbors.
 *
 * @example
 * ```typescript
 * ADJACENT_KEYS['ㄱ'] // → Set(['ㄷ', 'ㅅ', 'ㅇ', 'ㄹ'])
 * ADJACENT_KEYS['ㅏ'] // → Set(['ㅓ', 'ㅑ', 'ㅐ', 'ㅣ', 'ㅡ'])
 * ```
 *
 * @internal Used by isAdjacentKey() for fast lookup
 */
const ADJACENT_KEYS: Record<string, Set<string>> = {
  // 자음
  ㅂ: new Set(['ㅈ', 'ㅁ']),
  ㅈ: new Set(['ㅂ', 'ㄷ', 'ㅁ', 'ㄴ']),
  ㄷ: new Set(['ㅈ', 'ㄱ', 'ㄴ', 'ㅇ']),
  ㄱ: new Set(['ㄷ', 'ㅅ', 'ㅇ', 'ㄹ']),
  ㅅ: new Set(['ㄱ', 'ㅛ', 'ㄹ', 'ㅎ']),
  ㅁ: new Set(['ㅂ', 'ㅈ', 'ㅋ']),
  ㄴ: new Set(['ㅈ', 'ㄷ', 'ㅁ', 'ㅇ', 'ㅋ', 'ㅌ']),
  ㅇ: new Set(['ㄷ', 'ㄱ', 'ㄴ', 'ㄹ', 'ㅌ', 'ㅊ']),
  ㄹ: new Set(['ㄱ', 'ㅅ', 'ㅇ', 'ㅎ', 'ㅊ', 'ㅍ']),
  ㅎ: new Set(['ㅅ', 'ㅛ', 'ㄹ', 'ㅗ', 'ㅍ', 'ㅠ']),
  ㅋ: new Set(['ㅁ', 'ㄴ']),
  ㅌ: new Set(['ㄴ', 'ㅇ', 'ㅋ', 'ㅊ']),
  ㅊ: new Set(['ㅇ', 'ㄹ', 'ㅌ', 'ㅍ']),
  ㅍ: new Set(['ㄹ', 'ㅎ', 'ㅊ', 'ㅠ']),

  // 모음
  ㅛ: new Set(['ㅅ', 'ㅕ', 'ㅎ', 'ㅗ']),
  ㅕ: new Set(['ㅛ', 'ㅑ', 'ㅗ', 'ㅓ']),
  ㅑ: new Set(['ㅕ', 'ㅐ', 'ㅓ', 'ㅏ']),
  ㅐ: new Set(['ㅑ', 'ㅔ', 'ㅏ', 'ㅣ']),
  ㅔ: new Set(['ㅐ', 'ㅣ']),
  ㅗ: new Set(['ㅎ', 'ㅛ', 'ㅕ', 'ㅓ', 'ㅠ', 'ㅜ']),
  ㅓ: new Set(['ㅗ', 'ㅕ', 'ㅑ', 'ㅏ', 'ㅜ', 'ㅡ']),
  ㅏ: new Set(['ㅓ', 'ㅑ', 'ㅐ', 'ㅣ', 'ㅡ']),
  ㅣ: new Set(['ㅏ', 'ㅐ', 'ㅔ']),
  ㅠ: new Set(['ㅍ', 'ㅎ', 'ㅗ', 'ㅜ']),
  ㅜ: new Set(['ㅠ', 'ㅗ', 'ㅓ', 'ㅡ']),
  ㅡ: new Set(['ㅜ', 'ㅓ', 'ㅏ']),
};

/**
 * Double consonant (쌍자음) pairs for typo detection.
 *
 * These pairs represent the single consonant and its doubled form,
 * which are commonly confused due to Shift key timing errors.
 * For example, intending to type 'ㄱ' but accidentally holding Shift → 'ㄲ'
 *
 * When calculating edit distance, substitution between these pairs
 * receives a reduced cost (0.3) since it's a very common typo pattern.
 */
const DOUBLE_CONSONANT_PAIRS: [string, string][] = [
  ['ㄱ', 'ㄲ'],
  ['ㄷ', 'ㄸ'],
  ['ㅂ', 'ㅃ'],
  ['ㅅ', 'ㅆ'],
  ['ㅈ', 'ㅉ'],
];

/**
 * Calculates the Euclidean distance between two Jamo on the 2-beolsik keyboard.
 *
 * This function computes the physical distance between two keys based on their
 * row and column positions. The result is used to determine substitution cost
 * in the edit distance algorithm - closer keys result in lower substitution costs.
 *
 * @param jamo1 - First Jamo character (consonant or vowel)
 * @param jamo2 - Second Jamo character (consonant or vowel)
 * @returns Euclidean distance between the keys. Returns 2 if either Jamo
 *          is not in the keyboard layout (e.g., compound consonants).
 *
 * @example
 * ```typescript
 * keyboardDistance('ㄱ', 'ㄷ'); // → ~1.0 (adjacent horizontally)
 * keyboardDistance('ㄱ', 'ㅇ'); // → ~1.41 (diagonal)
 * keyboardDistance('ㄱ', 'ㅁ'); // → ~2.24 (far apart)
 * keyboardDistance('ㄳ', 'ㄱ'); // → 2 (compound consonant not in layout)
 * ```
 */
export function keyboardDistance(jamo1: string, jamo2: string): number {
  const pos1 = KEYBOARD_LAYOUT[jamo1];
  const pos2 = KEYBOARD_LAYOUT[jamo2];

  if (!pos1 || !pos2) return 2; // Not in layout (compound consonants, etc.)

  return Math.sqrt((pos1.row - pos2.row) ** 2 + (pos1.col - pos2.col) ** 2);
}

/**
 * Checks if two Jamo are adjacent keys on the 2-beolsik keyboard.
 *
 * Adjacent keys are pre-computed for O(1) lookup performance.
 * This is a key function for typo detection - adjacent key substitutions
 * receive a reduced cost (0.5) in the edit distance calculation.
 *
 * @param jamo1 - First Jamo character
 * @param jamo2 - Second Jamo character
 * @returns `true` if the keys are physically adjacent, `false` otherwise
 *
 * @example
 * ```typescript
 * isAdjacentKey('ㄱ', 'ㄷ'); // → true (horizontally adjacent)
 * isAdjacentKey('ㄱ', 'ㅇ'); // → true (diagonally adjacent)
 * isAdjacentKey('ㄱ', 'ㅁ'); // → false (not adjacent)
 * isAdjacentKey('ㅏ', 'ㅓ'); // → true (adjacent vowels)
 * ```
 */
export function isAdjacentKey(jamo1: string, jamo2: string): boolean {
  return ADJACENT_KEYS[jamo1]?.has(jamo2) || false;
}

/**
 * Checks if two Jamo are a single/double consonant pair (쌍자음 오타).
 *
 * This detects one of the most common Korean typo patterns: accidentally
 * typing a double consonant instead of a single one (or vice versa).
 * This happens when the Shift key is pressed/released at the wrong time.
 *
 * These substitutions receive the lowest cost (0.3) in the edit distance
 * algorithm since they're extremely common and clearly unintentional.
 *
 * @param jamo1 - First Jamo character
 * @param jamo2 - Second Jamo character
 * @returns `true` if one is the doubled form of the other, `false` otherwise
 *
 * @example
 * ```typescript
 * isDoubleConsonantMistake('ㄱ', 'ㄲ'); // → true
 * isDoubleConsonantMistake('ㄲ', 'ㄱ'); // → true (order doesn't matter)
 * isDoubleConsonantMistake('ㅅ', 'ㅆ'); // → true
 * isDoubleConsonantMistake('ㄱ', 'ㅋ'); // → false (different consonants)
 * isDoubleConsonantMistake('ㅏ', 'ㅓ'); // → false (vowels, not consonants)
 * ```
 */
export function isDoubleConsonantMistake(jamo1: string, jamo2: string): boolean {
  return DOUBLE_CONSONANT_PAIRS.some(
    ([a, b]) => (jamo1 === a && jamo2 === b) || (jamo1 === b && jamo2 === a),
  );
}

/**
 * Decomposes Korean text into individual Jamo characters.
 *
 * This function breaks down complete Korean syllables (e.g., "한") into their
 * constituent Jamo components (ㅎ, ㅏ, ㄴ). This is essential for accurate
 * edit distance calculation because:
 *
 * 1. Korean syllables are composed of 2-3 Jamo
 * 2. Typos often affect a single Jamo within a syllable
 * 3. Comparing at the Jamo level gives finer-grained distance measurements
 *
 * Non-Korean characters (numbers, English, punctuation) are passed through unchanged.
 *
 * ## Korean Syllable Structure
 *
 * A Korean syllable consists of:
 * - 초성 (Choseong): Initial consonant (required)
 * - 중성 (Jungseong): Medial vowel (required)
 * - 종성 (Jongseong): Final consonant (optional)
 *
 * The Unicode formula for decomposition:
 * ```
 * syllable_index = char_code - 0xAC00
 * choseong_index = syllable_index / 588
 * jungseong_index = (syllable_index % 588) / 28
 * jongseong_index = syllable_index % 28
 * ```
 *
 * @param text - Input text containing Korean and/or other characters
 * @returns Array of individual Jamo characters and non-Korean characters
 *
 * @example
 * ```typescript
 * decomposeToJamos('한글');
 * // → ['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ']
 *
 * decomposeToJamos('가나다');
 * // → ['ㄱ', 'ㅏ', 'ㄴ', 'ㅏ', 'ㄷ', 'ㅏ']
 *
 * decomposeToJamos('Hello한글123');
 * // → ['H', 'e', 'l', 'l', 'o', 'ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ', '1', '2', '3']
 *
 * decomposeToJamos('ㄱㅏㄴ');  // Already decomposed Jamo
 * // → ['ㄱ', 'ㅏ', 'ㄴ']
 * ```
 */
export function decomposeToJamos(text: string): string[] {
  const jamos: string[] = [];

  for (const char of text) {
    if (isHangul(char)) {
      const code = char.charCodeAt(0);

      // Complete syllables (완성형 한글): 가(0xAC00) to 힣(0xD7A3)
      if (code >= 0xac00 && code <= 0xd7a3) {
        const syllableIndex = code - 0xac00;
        const cho = Math.floor(syllableIndex / 588);
        const jung = Math.floor((syllableIndex % 588) / 28);
        const jong = syllableIndex % 28;

        const choChar = CHOSEONG[cho];
        const jungChar = JUNGSEONG[jung];
        if (choChar) jamos.push(choChar);
        if (jungChar) jamos.push(jungChar);
        if (jong > 0) {
          const jongChar = JONGSEONG[jong];
          if (jongChar) jamos.push(jongChar);
        }
      }
      // Individual Jamo (자모): ㄱ-ㅎ (0x3131-0x314E), ㅏ-ㅣ (0x314F-0x3163)
      else {
        jamos.push(char);
      }
    } else {
      // Non-Korean characters pass through unchanged
      jamos.push(char);
    }
  }

  return jamos;
}

/**
 * Calculates keyboard-weighted Jamo edit distance between two Korean words.
 *
 * This is the main function of the module, providing a keyboard-aware edit distance
 * metric specifically designed for Korean text. Unlike standard Levenshtein distance,
 * this algorithm:
 *
 * 1. **Decomposes syllables**: Breaks Korean syllables into Jamo for finer comparison
 * 2. **Weighs substitutions**: Common typos (adjacent keys, double consonants) cost less
 * 3. **Uses keyboard layout**: Physical key proximity affects substitution cost
 *
 * ## Algorithm Details
 *
 * Uses dynamic programming (Wagner-Fischer algorithm) with modified substitution costs:
 *
 * ```
 * dp[i][j] = minimum of:
 *   - dp[i-1][j] + 1           (deletion)
 *   - dp[i][j-1] + 1           (insertion)
 *   - dp[i-1][j-1] + cost      (substitution, cost varies by typo type)
 * ```
 *
 * ## Use Cases
 *
 * - **Typo correction**: Find the closest match from a dictionary
 * - **Fuzzy search**: Rank search results by similarity
 * - **Autocomplete**: Suggest completions even with typos
 * - **Spell checking**: Detect and suggest corrections
 *
 * @param word1 - First Korean word or phrase
 * @param word2 - Second Korean word or phrase
 * @returns Edit distance as a number. Lower values indicate more similarity.
 *          - 0: Exact match
 *          - 0.3: Single double-consonant difference
 *          - 0.5: Single adjacent-key difference
 *          - 1+: Multiple differences or distant keys
 *
 * @example
 * ```typescript
 * // Exact match
 * jamoEditDistance('안녕', '안녕');  // → 0
 *
 * // Double consonant typo (lowest cost)
 * jamoEditDistance('까다', '가다');  // → 0.3
 *
 * // Adjacent key typo
 * jamoEditDistance('한글', '한굴');  // → 0.5 (ㅡ→ㅜ adjacent)
 *
 * // Multiple differences
 * jamoEditDistance('안녕', '인녕');  // → 0.5 (ㅏ→ㅣ adjacent)
 * jamoEditDistance('컴퓨터', '콤퓨터');  // → 0.5 (ㅓ→ㅗ adjacent)
 *
 * // Completely different
 * jamoEditDistance('사과', '바나나');  // → high value
 *
 * // Practical usage: finding closest match
 * const dictionary = ['사과', '사탕', '사람', '사건'];
 * const typo = '사가';  // intended: 사과
 * const closest = dictionary
 *   .map(word => ({ word, dist: jamoEditDistance(typo, word) }))
 *   .sort((a, b) => a.dist - b.dist)[0];
 * // closest.word === '사과'
 * ```
 *
 * @see decomposeToJamos - For understanding how syllables are broken down
 * @see isAdjacentKey - For adjacent key detection
 * @see isDoubleConsonantMistake - For double consonant detection
 */
export function jamoEditDistance(word1: string, word2: string): number {
  const jamos1 = decomposeToJamos(word1);
  const jamos2 = decomposeToJamos(word2);

  const m = jamos1.length;
  const n = jamos2.length;

  // Initialize DP table with dimensions (m+1) x (n+1)
  // dp[i][j] represents the edit distance between jamos1[0..i-1] and jamos2[0..j-1]
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Base cases: transforming empty string to/from prefix
  for (let i = 0; i <= m; i++) {
    const row = dp[i];
    if (row) row[0] = i; // Deleting i characters from word1
  }
  for (let j = 0; j <= n; j++) {
    const firstRow = dp[0];
    if (firstRow) firstRow[j] = j; // Inserting j characters into empty string
  }

  // Fill DP table using recurrence relation
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const currentRow = dp[i];
      const prevRow = dp[i - 1];
      if (!currentRow || !prevRow) continue;

      if (jamos1[i - 1] === jamos2[j - 1]) {
        // Characters match - no operation needed
        currentRow[j] = prevRow[j - 1] ?? 0;
      } else {
        const j1 = jamos1[i - 1] ?? '';
        const j2 = jamos2[j - 1] ?? '';

        // Calculate substitution cost based on typo type
        let substituteCost = 1;

        // Double consonant mistake: lowest cost (0.3)
        // e.g., ㄱ↔ㄲ, ㅂ↔ㅃ - very common Shift key error
        if (isDoubleConsonantMistake(j1, j2)) {
          substituteCost = 0.3;
        }
        // Adjacent key typo: low cost (0.5)
        // e.g., ㄱ↔ㄷ, ㅏ↔ㅓ - common physical keyboard typo
        else if (isAdjacentKey(j1, j2)) {
          substituteCost = 0.5;
        }
        // Keyboard distance-based cost
        else {
          const kbDist = keyboardDistance(j1, j2);
          if (kbDist < 1.5) {
            substituteCost = 0.6; // Near keys
          } else if (kbDist < 2.5) {
            substituteCost = 0.8; // Moderately far
          }
          // else: default cost of 1.0 for far keys
        }

        // Compute minimum of delete, insert, and substitute operations
        const deleteVal = (prevRow[j] ?? 0) + 1;
        const insertVal = (currentRow[j - 1] ?? 0) + 1;
        const substituteVal = (prevRow[j - 1] ?? 0) + substituteCost;
        currentRow[j] = Math.min(deleteVal, insertVal, substituteVal);
      }
    }
  }

  // Return the final edit distance
  const lastRow = dp[m];
  return lastRow ? (lastRow[n] ?? 0) : 0;
}

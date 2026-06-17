// ========================================
// Apply Irregulars - 불규칙 활용 적용
// ========================================

import { compose, decompose } from '../jamo';
import type { IrregularType } from '../types';
import { irregularStems } from './stems';

/**
 * 불규칙 유형 확인
 */
export function getIrregularType(stem: string): IrregularType | null {
  for (const [type, stems] of Object.entries(irregularStems)) {
    if (stems.includes(stem)) {
      return type as IrregularType;
    }
  }
  return null;
}

/**
 * 불규칙 활용 적용
 * @param stem 어간 (예: '듣', '돕')
 * @param ending 어미 (예: '어요', '았어요')
 * @returns 활용형 (예: '들어요', '도와요')
 */
export function applyIrregular(stem: string, ending: string): string {
  if (!stem || !ending) return stem + ending;

  const type = getIrregularType(stem);
  if (!type) return stem + ending;

  // 어미가 자음으로 시작하면 불규칙 적용 안 함
  const firstEndingChar = ending[0] ?? '';
  const firstEndingJamo = decompose(firstEndingChar);
  const startsWithVowel = firstEndingJamo?.cho === 'ㅇ';

  if (!startsWithVowel) return stem + ending;

  switch (type) {
    case 'ㄷ':
      return applyDieut(stem, ending);
    case 'ㅂ':
      return applyBieup(stem, ending);
    case 'ㅎ':
      return applyHieut(stem, ending);
    case 'ㅅ':
      return applySiot(stem, ending);
    case '르':
      return applyReu(stem, ending);
    case '러':
      return applyReo(stem, ending);
    case '우':
      return applyU(stem, ending);
    case '으':
      return applyEu(stem, ending);
    default:
      return stem + ending;
  }
}

/**
 * ㄷ불규칙: ㄷ → ㄹ
 * 듣 + 어요 → 들어요
 */
function applyDieut(stem: string, ending: string): string {
  const lastChar = stem[stem.length - 1] ?? '';
  const jamo = decompose(lastChar);

  if (jamo && jamo.jong === 'ㄷ') {
    const newChar = compose({ ...jamo, jong: 'ㄹ' });
    if (newChar) {
      return stem.slice(0, -1) + newChar + ending;
    }
  }

  return stem + ending;
}

/**
 * ㅂ불규칙: ㅂ → 우/오
 * 돕 + 아요 → 도와요
 * 춥 + 어요 → 추워요
 */
function applyBieup(stem: string, ending: string): string {
  const lastChar = stem[stem.length - 1] ?? '';
  const jamo = decompose(lastChar);

  if (jamo && jamo.jong === 'ㅂ') {
    // 받침 제거
    const newChar = compose({ ...jamo, jong: '' });
    if (!newChar) return stem + ending;

    // 어미의 첫 모음 확인
    const firstEnding = ending[0] ?? '';
    const endingJamo = decompose(firstEnding);
    if (!endingJamo) return stem + ending;

    // 아/어에 따라 와/워 결합
    if (endingJamo.jung === 'ㅏ') {
      // 돕 + 아요 → 도 + 와요
      return `${stem.slice(0, -1) + newChar}와${ending.slice(1)}`;
    }
    // 춥 + 어요 → 추 + 워요
    return `${stem.slice(0, -1) + newChar}워${ending.slice(1)}`;
  }

  return stem + ending;
}

/**
 * ㅎ불규칙: ㅎ 탈락 + 모음 변화
 * 파랗 + 아요 → 파래요
 */
function applyHieut(stem: string, ending: string): string {
  const lastChar = stem[stem.length - 1] ?? '';
  const jamo = decompose(lastChar);

  if (jamo && jamo.jong === 'ㅎ') {
    // ㅎ 탈락
    const newChar = compose({ ...jamo, jong: '' });
    if (!newChar) return stem + ending;

    // 어미 모음과 결합하여 ㅐ/ㅔ로
    const firstEndingForHieut = ending[0] ?? '';
    const endingJamoHieut = decompose(firstEndingForHieut);
    if (!endingJamoHieut) return stem + ending;

    let newVowel: string;
    const endingJamo = endingJamoHieut;
    if (endingJamo.jung === 'ㅏ') {
      newVowel = 'ㅐ';
    } else if (endingJamo.jung === 'ㅓ') {
      newVowel = 'ㅔ';
    } else {
      return stem.slice(0, -1) + newChar + ending;
    }

    // 어간 마지막 글자에 새 모음 적용
    const combined = compose({ ...jamo, jong: '', jung: newVowel });
    if (combined) {
      return stem.slice(0, -1) + combined + ending.slice(1);
    }
  }

  return stem + ending;
}

/**
 * ㅅ불규칙: ㅅ 탈락
 * 짓 + 어요 → 지어요
 */
function applySiot(stem: string, ending: string): string {
  const lastChar = stem[stem.length - 1] ?? '';
  const jamo = decompose(lastChar);

  if (jamo && jamo.jong === 'ㅅ') {
    const newChar = compose({ ...jamo, jong: '' });
    if (newChar) {
      return stem.slice(0, -1) + newChar + ending;
    }
  }

  return stem + ending;
}

/**
 * 르불규칙: 르 → ㄹㄹ
 * 빠르 + 아요 → 빨라요
 */
function applyReu(stem: string, ending: string): string {
  if (!stem.endsWith('르')) return stem + ending;

  // '르' 앞 글자에 ㄹ 받침 추가
  const beforeReu = stem.slice(0, -1);
  if (!beforeReu) return stem + ending;

  const lastChar = beforeReu[beforeReu.length - 1] ?? '';
  const jamo = decompose(lastChar);

  if (jamo && !jamo.jong) {
    const withBatchim = compose({ ...jamo, jong: 'ㄹ' });
    if (!withBatchim) return stem + ending;

    // 어미 시작을 ㄹ+모음으로
    const firstEndingForReu = ending[0] ?? '';
    const endingJamo = decompose(firstEndingForReu);
    if (!endingJamo) return stem + ending;

    const newEndingFirst = compose({ cho: 'ㄹ', jung: endingJamo.jung, jong: endingJamo.jong });
    if (newEndingFirst) {
      return beforeReu.slice(0, -1) + withBatchim + newEndingFirst + ending.slice(1);
    }
  }

  return stem + ending;
}

/**
 * 러불규칙
 * 이르 + 어 → 이르러
 */
function applyReo(stem: string, ending: string): string {
  if (ending.startsWith('어')) {
    return `${stem}러${ending.slice(1)}`;
  }
  return stem + ending;
}

/**
 * 우불규칙
 * 푸 + 어요 → 퍼요
 */
function applyU(stem: string, ending: string): string {
  if (stem === '푸') {
    const firstEndingForU = ending[0] ?? '';
    const endingJamo = decompose(firstEndingForU);
    if (endingJamo && endingJamo.jung === 'ㅓ') {
      return `퍼${ending.slice(1)}`;
    }
  }
  return stem + ending;
}

/**
 * 으불규칙: 으 탈락
 * 쓰 + 어요 → 써요, 크 + 어요 → 커요
 */
function applyEu(stem: string, ending: string): string {
  const lastChar = stem[stem.length - 1] ?? '';
  const jamo = decompose(lastChar);

  if (jamo && jamo.jung === 'ㅡ' && !jamo.jong) {
    const firstEndingForEu = ending[0] ?? '';
    const endingJamo = decompose(firstEndingForEu);
    if (!endingJamo) return stem + ending;

    // 으 탈락 후 어미 모음과 결합
    // 초성 + 어미모음
    const combined = compose({
      cho: jamo.cho,
      jung: endingJamo.jung,
      jong: endingJamo.jong,
    });

    if (combined) {
      return stem.slice(0, -1) + combined + ending.slice(1);
    }
  }

  return stem + ending;
}

/**
 * 어간에서 원형 복원 (활용형 → 기본형)
 * '들' (듣+어) → '듣'
 */
export function restoreIrregular(_conjugated: string, _type: IrregularType): string | null {
  // TODO: 역변환 로직 구현
  // 복잡한 로직이 필요하므로 기본적인 케이스만 처리
  return null;
}

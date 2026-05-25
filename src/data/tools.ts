import type { Locale } from '../i18n/ui';

export type LocalizedString = Record<Locale, string>;

export interface Tool {
  /** URL slug, e.g. /tools/voice-script-builder */
  slug: string;
  /** Display name per locale */
  name: LocalizedString;
  /** One-line summary shown on cards and as the page subtitle */
  tagline: LocalizedString;
  /** Longer description shown on the detail page */
  description: LocalizedString;
  /** Category label */
  category: LocalizedString;
  /** claude.site embed URL (…/embed) used inside the iframe */
  embedUrl: string;
  /** Original published artifact URL (without /embed) */
  artifactUrl: string;
  /** Whether the tool calls Claude at runtime and therefore needs the viewer to be logged in */
  requiresLogin: boolean;
}

export const tools: Tool[] = [
  {
    slug: 'voice-script-builder',
    name: {
      ko: '한국어 보이스 클로닝 대본 생성기',
      en: 'Korean Voice Cloning Script Builder',
      ja: '韓国語ボイスクローニング台本ジェネレーター',
    },
    tagline: {
      ko: '음성 복제 학습용 한국어 녹음 대본을 Claude로 자동 생성합니다.',
      en: 'Auto-generates Korean recording scripts for voice-cloning training, powered by Claude.',
      ja: 'Claudeで音声クローニング学習用の韓国語録音台本を自動生成します。',
    },
    description: {
      ko: '한글을 초성·중성·종성 단위로 분석해, 모든 발음이 골고루 들어간 자연스러운 A/B 대화 대본을 약 200개 만들어 줍니다. 음성 복제(TTS) 모델 학습을 위한 녹음 대본으로 바로 쓸 수 있고, 생성한 대본은 텍스트로, 전체 데이터는 JSON으로 저장하거나 다시 불러올 수 있습니다.',
      en: 'Analyzes Korean Hangul down to its onset/nucleus/coda components and produces around 200 natural A/B dialogue scripts that cover every pronunciation evenly. Use them directly as recording scripts for TTS / voice-cloning model training. Export scripts as plain text and the full dataset as JSON, then re-import any time.',
      ja: 'ハングルを初声・中声・終声に分解して分析し、すべての発音が均等に含まれる自然なA/B対話台本を約200本生成します。音声クローニング(TTS)モデル学習用の録音台本としてそのまま使え、生成した台本はテキストで、全データはJSONで保存・読み込みできます。',
    },
    category: {
      ko: '음성 · 오디오',
      en: 'Voice · Audio',
      ja: '音声・オーディオ',
    },
    embedUrl: 'https://claude.site/public/artifacts/83e81ef4-f3af-4092-a2f8-3dba0a87414d/embed',
    artifactUrl: 'https://claude.site/public/artifacts/83e81ef4-f3af-4092-a2f8-3dba0a87414d',
    requiresLogin: true,
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

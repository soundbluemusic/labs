import type { Locale } from "../i18n/ui";

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
  /** claude.site embed URL (…/embed) used inside the iframe. Omit for native tools. */
  embedUrl?: string;
  /** Canonical artifact page on claude.ai where a logged-in user can run it.
   * (claude.site only serves the /embed path; its bare URL 404s.) Omit for native tools. */
  artifactUrl?: string;
  /** Native in-browser tool (runs client-side, no iframe). When true, the detail
   * page renders the tool's own component instead of a claude.site embed. */
  native?: boolean;
  /** Whether the tool calls Claude at runtime and therefore needs the viewer to be logged in */
  requiresLogin: boolean;
  /** Date the tool/artifact was last updated (ISO YYYY-MM-DD); bump when republishing */
  updatedAt: string;
}

export const tools: Tool[] = [
  {
    slug: "voice-script-builder",
    name: {
      ko: "한국어 보이스 클로닝 대본 생성기",
      en: "Korean Voice Cloning Script Builder",
      ja: "韓国語ボイスクローニング台本ジェネレーター",
    },
    tagline: {
      ko: "음성 복제 학습용 한국어 녹음 대본을 Claude로 자동 생성합니다.",
      en: "Auto-generates Korean recording scripts for voice-cloning training, powered by Claude.",
      ja: "Claudeで音声クローニング学習用の韓国語録音台本を自動生成します。",
    },
    description: {
      ko: "한글을 초성·중성·종성 단위로 분석해, 모든 발음이 골고루 들어간 자연스러운 A/B 대화 대본을 약 200개 만들어 줍니다. 음성 복제(TTS) 모델 학습을 위한 녹음 대본으로 바로 쓸 수 있고, 생성한 대본은 텍스트로, 전체 데이터는 JSON으로 저장하거나 다시 불러올 수 있습니다.",
      en: "Analyzes Korean Hangul down to its onset/nucleus/coda components and produces around 200 natural A/B dialogue scripts that cover every pronunciation evenly. Use them directly as recording scripts for TTS / voice-cloning model training. Export scripts as plain text and the full dataset as JSON, then re-import any time.",
      ja: "ハングルを初声・中声・終声に分解して分析し、すべての発音が均等に含まれる自然なA/B対話台本を約200本生成します。音声クローニング(TTS)モデル学習用の録音台本としてそのまま使え、生成した台本はテキストで、全データはJSONで保存・読み込みできます。",
    },
    category: {
      ko: "음성 · 오디오",
      en: "Voice · Audio",
      ja: "音声・オーディオ",
    },
    embedUrl:
      "https://claude.site/public/artifacts/a956aeb4-94be-4b24-9706-2948f61c00e1/embed",
    artifactUrl:
      "https://claude.ai/public/artifacts/a956aeb4-94be-4b24-9706-2948f61c00e1",
    requiresLogin: true,
    updatedAt: "2026-05-31",
  },
  {
    slug: "voice-script-generator",
    name: {
      ko: "한국어 보이스 대본 생성기 (알고리즘)",
      en: "Korean Voice Script Generator (Algorithmic)",
      ja: "韓国語ボイス台本ジェネレーター(アルゴリズム)",
    },
    tagline: {
      ko: "로그인 없이, 브라우저에서 바로 음소 균형 잡힌 한국어 녹음 대본을 만듭니다.",
      en: "Builds phoneme-balanced Korean recording scripts right in your browser — no login.",
      ja: "ログイン不要、ブラウザ上で音素バランスの取れた韓国語録音台本をすぐ作成。",
    },
    description: {
      ko: "Claude 호출 없이 순수 알고리즘으로 동작하는 버전입니다. 엄선된 자연스러운 대화 코퍼스에서 한글 음소(초성·중성·종성)를 분석해, 모든 발음이 골고루 들어가도록 약 200개의 A/B 대화를 즉석에서 선별합니다. 일상어에 잘 안 나오는 희귀 자모(웬일·얘기·부엌·읊다 등)는 별도 시드 문장으로 채워 음소 균형을 맞춥니다. 로그인·인터넷 없이 동작하며, 생성한 대본은 텍스트로 내려받을 수 있습니다.",
      en: "A pure-algorithm version that needs no Claude calls. It analyzes Hangul phonemes (onset/nucleus/coda) over a curated corpus of natural dialogues and selects ~200 A/B dialogues on the fly so every pronunciation is covered evenly. Rare jamo that seldom appear in everyday speech are filled in with dedicated seed lines. Runs with no login and no internet; download the script as plain text.",
      ja: "Claude呼び出し不要の純アルゴリズム版です。厳選した自然な対話コーパスからハングル音素(初声・中声・終声)を分析し、すべての発音が均等に入るよう約200本のA/B対話をその場で選びます。日常語に出にくい希少字母は専用のシード文で補います。ログイン・インターネット不要で動作し、台本はテキストでダウンロードできます。",
    },
    category: {
      ko: "음성 · 오디오",
      en: "Voice · Audio",
      ja: "音声・オーディオ",
    },
    native: true,
    requiresLogin: false,
    updatedAt: "2026-06-18",
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

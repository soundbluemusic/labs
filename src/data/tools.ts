export interface Tool {
  /** URL slug, e.g. /tools/voice-script-builder */
  slug: string;
  /** Display name (ko) */
  name: string;
  /** One-line summary shown on cards and as the page subtitle */
  tagline: string;
  /** Longer description shown on the detail page */
  description: string;
  /** Category label */
  category: string;
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
    name: '한국어 보이스 클로닝 대본 생성기',
    tagline: '음성 복제 학습용 한국어 녹음 대본을 Claude로 자동 생성합니다.',
    description:
      '한글을 초성·중성·종성 단위로 분석해, 모든 발음이 골고루 들어간 자연스러운 A/B 대화 대본을 약 200개 만들어 줍니다. 음성 복제(TTS) 모델 학습을 위한 녹음 대본으로 바로 쓸 수 있고, 생성한 대본은 텍스트로, 전체 데이터는 JSON으로 저장하거나 다시 불러올 수 있습니다.',
    category: '음성 · 오디오',
    embedUrl: 'https://claude.site/public/artifacts/83e81ef4-f3af-4092-a2f8-3dba0a87414d/embed',
    artifactUrl: 'https://claude.site/public/artifacts/83e81ef4-f3af-4092-a2f8-3dba0a87414d',
    requiresLogin: true,
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

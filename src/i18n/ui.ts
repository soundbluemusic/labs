export const locales = ["ko", "en", "ja"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

export const localeNames: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

export const localeShortLabels: Record<Locale, string> = {
  ko: "KO",
  en: "EN",
  ja: "JA",
};

export const htmlLangAttr: Record<Locale, string> = {
  ko: "ko",
  en: "en",
  ja: "ja",
};

export const ogLocale: Record<Locale, string> = {
  ko: "ko_KR",
  en: "en_US",
  ja: "ja_JP",
};

/** BCP-47 tags for Intl date formatting. */
export const dateLocale: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
};

export const ui = {
  ko: {
    siteName: "labs by soundbluemusic",
    siteDescription:
      "Claude로 동작하는 도구. Claude에 로그인하면 바로 쓸 수 있습니다.",
    homeHeroTitle: "Claude로 동작하는 도구",
    homeHeroLead: (n: number) =>
      `Claude에 로그인하면 쓸 수 있는 도구 ${n}개. 아래에서 바로 시작하세요.`,
    homeSectionLabel: "도구",
    homeCountSuffix: (n: number) => `${n}개`,
    cardOpen: "열기",
    cardRequiresLogin: "Claude 로그인 필요",
    backToTools: "← 모든 도구",
    breadcrumbHome: "홈",
    toolRequiresLoginTitle: "이 도구는 Claude 로그인이 필요합니다.",
    toolRequiresLoginBody:
      "도구가 Claude AI를 직접 호출하기 때문에, Claude에 로그인되어 있어야 사용할 수 있어요. 생성 사용량은 본인 Claude 계정에서 소모됩니다.",
    toolRequiresLoginHint:
      "아래 임베드 안의 로그인 버튼이 동작하지 않으면(Safari 등 3rd-party 쿠키 제한), 「Claude에서 열기」로 새 탭에서 로그인 상태 그대로 사용하세요.",
    toolOpenInClaude: "Claude에서 열기 ↗",
    toolUpdatedAt: "최근 업데이트",
    toolSourceLabel: "원본 아티팩트:",
    toolSourceLink: "claude.ai에서 보기 ↗",
    embedFullscreen: "전체화면",
    embedNewTab: "새 탭에서 열기 ↗",
    notFoundTitle: "페이지를 찾을 수 없어요",
    notFoundLead: "주소가 바뀌었거나 삭제된 페이지일 수 있어요.",
    notFoundHome: "← 홈으로 돌아가기",
    notFoundPageTitle: "페이지를 찾을 수 없어요 (404)",
    notFoundPageDescription: "요청하신 페이지를 찾을 수 없습니다.",
    langSwitcherLabel: "언어",
  },
  en: {
    siteName: "labs by soundbluemusic",
    siteDescription:
      "Tools that run on Claude. Sign in to Claude and start using them right away.",
    homeHeroTitle: "Tools powered by Claude",
    homeHeroLead: (n: number) =>
      `${n} tool${n === 1 ? "" : "s"} you can use once you sign in to Claude. Start below.`,
    homeSectionLabel: "Tools",
    homeCountSuffix: (n: number) => `${n}`,
    cardOpen: "Open",
    cardRequiresLogin: "Claude login required",
    backToTools: "← All tools",
    breadcrumbHome: "Home",
    toolRequiresLoginTitle: "This tool requires a Claude login.",
    toolRequiresLoginBody:
      "Because the tool calls Claude AI directly, you need to be signed in to Claude to use it. Generation usage is billed to your own Claude account.",
    toolRequiresLoginHint:
      "If the login button inside the embed below doesn't respond (some browsers block third-party cookies, e.g. Safari), use “Open in Claude” to launch it in a new tab with your session intact.",
    toolOpenInClaude: "Open in Claude ↗",
    toolUpdatedAt: "Last updated",
    toolSourceLabel: "Original artifact:",
    toolSourceLink: "View on claude.ai ↗",
    embedFullscreen: "Fullscreen",
    embedNewTab: "Open in new tab ↗",
    notFoundTitle: "Page not found",
    notFoundLead:
      "The address may have changed, or the page may have been removed.",
    notFoundHome: "← Back to home",
    notFoundPageTitle: "Page not found (404)",
    notFoundPageDescription: "The page you requested couldn't be found.",
    langSwitcherLabel: "Language",
  },
  ja: {
    siteName: "labs by soundbluemusic",
    siteDescription:
      "Claudeで動くツール集。Claudeにログインすればすぐに使えます。",
    homeHeroTitle: "Claudeで動くツール",
    homeHeroLead: (n: number) =>
      `Claudeにログインすれば使えるツールが${n}個。下からどうぞ。`,
    homeSectionLabel: "ツール",
    homeCountSuffix: (n: number) => `${n}個`,
    cardOpen: "開く",
    cardRequiresLogin: "Claudeログインが必要",
    backToTools: "← すべてのツール",
    breadcrumbHome: "ホーム",
    toolRequiresLoginTitle: "このツールはClaudeへのログインが必要です。",
    toolRequiresLoginBody:
      "ツールが直接Claude AIを呼び出すため、Claudeにログインしている必要があります。生成に使う消費量はご自身のClaudeアカウントから引かれます。",
    toolRequiresLoginHint:
      "下の埋め込み内のログインボタンが反応しない場合(Safariなどサードパーティ Cookie 制限)、「Claudeで開く」から新しいタブでログイン状態のまま使用してください。",
    toolOpenInClaude: "Claudeで開く ↗",
    toolUpdatedAt: "最終更新",
    toolSourceLabel: "元のアーティファクト:",
    toolSourceLink: "claude.aiで開く ↗",
    embedFullscreen: "全画面",
    embedNewTab: "新しいタブで開く ↗",
    notFoundTitle: "ページが見つかりません",
    notFoundLead: "URLが変わったか、ページが削除された可能性があります。",
    notFoundHome: "← ホームに戻る",
    notFoundPageTitle: "ページが見つかりません (404)",
    notFoundPageDescription: "お探しのページは見つかりませんでした。",
    langSwitcherLabel: "言語",
  },
} as const;

export type UIDict = (typeof ui)[Locale];

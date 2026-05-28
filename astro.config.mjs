import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://labs.soundbluemusic.com",
  i18n: {
    defaultLocale: "ko",
    locales: ["ko", "en", "ja"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "ko",
        locales: { ko: "ko-KR", en: "en-US", ja: "ja-JP" },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});

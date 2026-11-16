import type { Metadata } from "next";
import { Cormorant_Garamond, Figtree, Fraunces, Geist_Mono, Newsreader, Noto_Serif_JP, Noto_Serif_SC, Nunito_Sans } from "next/font/google";
import { siteUrl } from "./site-url";
import "./globals.css";
import "./upgrade.css";
import "./savora-theme.css";
import "./savora-system.css";
import "./website-localization.css";
import { LanguageProvider } from "./i18n";
import { FullPageTranslator } from "./full-page-translator";
import { RouteFocusManager } from "./route-focus-manager";
import { NavigationProgress } from "./navigation-progress";
import { MobileTabBar } from "./mobile-tab-bar";
import { Suspense } from "react";

const themeBootstrap = `(() => {
  try {
    const saved = window.localStorage.getItem("savora-theme");
    const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    root.style.colorScheme = dark ? "dark" : "light";
    if (!window.sessionStorage.getItem("savora-launch")) {
      window.sessionStorage.setItem("savora-launch", "1");
      root.dataset.launch = "1";
    }
  } catch {}
})();`;

// Next.js self-hosts and optimizes fonts imported through next/font.
// Source: https://nextjs.org/docs/app/getting-started/fonts
const savoraSans = Nunito_Sans({
  preload: false,
  variable: "--font-savora-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const savoraSerif = Newsreader({
  preload: false,
  variable: "--font-savora-serif",
  subsets: ["latin"],
  display: "swap",
});

const recipeDisplay = Cormorant_Garamond({
  preload: false,
  variable: "--font-recipe-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  preload: false,
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Design system v2 faces. Legacy faces above stay until every page is migrated.
const svDisplay = Fraunces({
  preload: false,
  variable: "--font-sv-display",
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const svText = Figtree({
  variable: "--font-sv-text",
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  display: "swap",
});

// Headline faces for Chinese and Japanese. Not preloaded: browsers fetch only the
// unicode-range slices a page actually uses, and only when a zh/ja headline is shown.
const svCjkSc = Noto_Serif_SC({ variable: "--font-sv-cjk-sc", weight: ["600"], preload: false, display: "swap" });
const svCjkJp = Noto_Serif_JP({ variable: "--font-sv-cjk-jp", weight: ["600"], preload: false, display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  // Absolute URLs always use the public canonical origin (SAVORA_SITE_URL), never a request Host header.
  const origin = siteUrl();

  return {
    metadataBase: new URL(origin),
    applicationName: "Savora",
    title: {
      default: "Savora — Taste the world, one dish at a time",
      template: "%s · Savora",
    },
    description:
      "Discover culturally grounded recipes, trusted cooking videos, and stories from home cooks around the world.",
    openGraph: {
      siteName: "Savora",
      url: origin,
      title: "Savora — Taste the world, one dish at a time",
      description:
        "Culturally grounded recipes, trusted cooking videos, and stories from home cooks worldwide.",
      type: "website",
      images: [{ url: `${origin}/og-v2.png`, width: 1200, height: 630, alt: "Savora global table with ramen, tacos, butter chicken, and tagine" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Savora — Taste the world, one dish at a time",
      description: "Cook beloved dishes with context, trusted guidance, and stories.",
      images: [`${origin}/og-v2.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body
        className={`${savoraSans.variable} ${savoraSerif.variable} ${recipeDisplay.variable} ${geistMono.variable} ${svDisplay.variable} ${svText.variable} ${svCjkSc.variable} ${svCjkJp.variable} antialiased`}
      >
        <LanguageProvider>
          <a className="skip-link" href="#main-content">Skip to main content</a>
          {children}
          <RouteFocusManager />
          <Suspense fallback={null}><NavigationProgress /></Suspense>
          <MobileTabBar />
          <FullPageTranslator />
        </LanguageProvider>
      </body>
    </html>
  );
}

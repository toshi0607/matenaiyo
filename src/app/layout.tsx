import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, Zen_Maru_Gothic } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

// 見出し用の丸ゴシック。「待てないよ」の親しみやすさを担う。
const zenMaru = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
});

// 本文用の可読性の高いゴシック。
const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

// OGP/Twitter 画像は opengraph-image.png / twitter-image.png のファイル規約で自動付与される。
// 絶対URL化のため metadataBase を本番ドメインに設定する。
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: "vwKho_fXf_PTz2Iocs5Sa_lZHI5dYDPuNIxDnp8XqVU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${zenMaru.variable} ${zenKaku.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader />
          {children}
          <SiteFooter />
        </ThemeProvider>
      </body>
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}

import { JsonLd } from "@/components/json-ld";
import { FAQ_ITEMS } from "@/lib/faq";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { EventTitleForm } from "./event-title-form";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "SchedulerApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "JPY",
  },
  inLanguage: "ja",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const STEPS = [
  {
    step: 1,
    title: "候補日を選んでイベント作成",
    text: "カレンダーから候補日を並べるだけ。タイトルを入れて作成すれば準備完了です。",
  },
  {
    step: 2,
    title: "共有URLをメンバーに送る",
    text: "発行された URL を LINE やメールで送るだけ。アプリのインストールは不要です。",
  },
  {
    step: 3,
    title: "みんなが ○△× をタップ",
    text: "名前と ○△× を選ぶだけで回答完了。集計は自動で反映されます。",
  },
];

const FEATURES = [
  { icon: "🗓️", text: "カレンダー UI で候補日をかんたん選択" },
  { icon: "⚡", text: "回答が即座に画面へ反映されるリアルタイム集計" },
  { icon: "📅", text: "確定後は .ics ダウンロードと Google カレンダー連携" },
  { icon: "🌙", text: "ダークモードに対応" },
  { icon: "📱", text: "スマホでも使いやすい最適化レイアウト" },
  { icon: "🗑️", text: "6ヶ月後に自動削除されデータが残り続けない" },
];

const HIGHLIGHTS = [
  { icon: "🗓️", text: "候補を並べて共有URLを送るだけ" },
  { icon: "👆", text: "○△× をタップで回答完了" },
  { icon: "✨", text: "○最多の候補を自動ハイライト" },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-14 sm:py-20">
      <JsonLd data={jsonLd} />
      <JsonLd data={faqJsonLd} />
      <div className="w-full max-w-xl space-y-9">
        <div className="space-y-4 text-center">
          <span className="animate-rise inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
            <span aria-hidden="true">🍊</span>
            ログイン不要・URLひとつで完結
          </span>
          <h1 className="animate-rise text-[2.65rem] leading-[1.1] font-bold tracking-tight sm:text-6xl [animation-delay:70ms]">
            待たせない、
            <br />
            <span className="text-primary">日程調整</span>。
          </h1>
          <p className="animate-rise text-muted-foreground text-base sm:text-lg [animation-delay:140ms]">
            候補日を並べて共有するだけ。
            <br className="hidden sm:block" />
            名前と ○△× をタップすれば集計まで自動です。
          </p>
        </div>

        <EventTitleForm />

        <ul className="animate-rise mx-auto grid max-w-md gap-3 sm:grid-cols-3 [animation-delay:280ms]">
          {HIGHLIGHTS.map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-3 rounded-2xl bg-card/70 p-3.5 text-sm ring-1 ring-foreground/5 sm:flex-col sm:items-start sm:gap-2"
            >
              <span aria-hidden="true" className="text-xl">
                {item.icon}
              </span>
              <span className="text-muted-foreground leading-snug">
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-24 w-full max-w-2xl space-y-24">
        <section aria-labelledby="how-it-works-heading" className="space-y-6">
          <h2
            id="how-it-works-heading"
            className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            使い方は3ステップ
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((item) => (
              <li
                key={item.step}
                className="rounded-2xl bg-card/70 p-5 ring-1 ring-foreground/5"
              >
                <span className="text-primary text-sm font-bold">
                  STEP {item.step}
                </span>
                <p className="mt-1 font-bold">{item.title}</p>
                <p className="mt-2 text-muted-foreground text-sm leading-snug">
                  {item.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="features-heading" className="space-y-6">
          <h2
            id="features-heading"
            className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            matenaiyo の特徴
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((item) => (
              <li
                key={item.text}
                className="flex items-center gap-3 rounded-2xl bg-card/70 p-3.5 text-sm ring-1 ring-foreground/5"
              >
                <span aria-hidden="true" className="text-xl">
                  {item.icon}
                </span>
                <span className="text-muted-foreground leading-snug">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-heading" className="space-y-6">
          <h2
            id="faq-heading"
            className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            よくある質問
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl bg-card/70 p-4 ring-1 ring-foreground/5"
              >
                <summary className="cursor-pointer list-none font-bold marker:content-none">
                  {item.question}
                </summary>
                <p className="mt-2 text-muted-foreground text-sm leading-snug">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

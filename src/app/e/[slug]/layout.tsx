import type { Metadata } from "next";

// /e/ 配下は参加者名が載る UGC のため、配下の全ページを検索インデックス対象外にする。
// layout の metadata は robots を自分で設定しない子ページすべてに継承される。
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

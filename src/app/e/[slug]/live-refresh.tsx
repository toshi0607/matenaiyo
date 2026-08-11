"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 5000;

/**
 * 集計ページの自動更新。ブラウザからDBへ直接接続せず、約5秒ごとに
 * router.refresh() でRSCを再取得してサーバーを真実の源にする。
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    return startPolling(() => {
      router.refresh();
    });
  }, [router]);

  return null;
}

function startPolling(onChange: () => void): () => void {
  const timer = setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) {
      return;
    }
    onChange();
  }, POLL_INTERVAL_MS);

  return () => {
    clearInterval(timer);
  };
}

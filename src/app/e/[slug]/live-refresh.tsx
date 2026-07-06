"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 5000;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * 集計ページの自動更新。
 * Supabase 環境変数が設定されていれば Realtime(postgres_changes)を購読し、
 * 未設定ならポーリングにフォールバックする。どちらの経路でも差分マージはせず、
 * router.refresh() で RSC を再取得してサーバーを真実の源にする。
 */
export function LiveRefresh({ eventId }: { eventId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      return subscribeRealtime(SUPABASE_URL, SUPABASE_ANON_KEY, eventId, () => {
        router.refresh();
      });
    }
    return startPolling(() => {
      router.refresh();
    });
  }, [router, eventId]);

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

function subscribeRealtime(
  url: string,
  anonKey: string,
  eventId: string,
  onChange: () => void,
): () => void {
  let cleanup: (() => void) | undefined;
  let cancelled = false;

  import("@supabase/supabase-js")
    .then(({ createClient }) => {
      if (cancelled) {
        return;
      }
      const client = createClient(url, anonKey);
      const channel = client.channel(`matenaiyo-tally-${eventId}`);
      // 全書き込み Server Action(submitAnswer / updateAnswer / closeEvent /
      // decideSlot / deleteParticipant)が同一トランザクション内で必ず
      // events.lastActivityAt を更新するため、events 行の変更購読だけで
      // participants / answers の変更も検知できる。
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        () => {
          onChange();
        },
      );
      channel.subscribe();

      cleanup = () => {
        client.removeChannel(channel);
      };
    })
    .catch((error) => {
      console.warn(
        "Supabase Realtime の初期化に失敗したためポーリングに切り替えます",
        error,
      );
      // Supabase クライアントの読み込みに失敗した場合はポーリングに退避する
      if (!cancelled) {
        cleanup = startPolling(onChange);
      }
    });

  return () => {
    cancelled = true;
    cleanup?.();
  };
}

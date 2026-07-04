"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { closeEvent, decideSlot, deleteParticipant } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadAdminToken } from "@/lib/local-storage";

export interface AdminSlot {
  id: string;
  label: string;
}

export interface AdminParticipant {
  id: string;
  name: string;
  comment: string;
}

export function AdminPanel({
  slug,
  closed,
  decidedSlotId,
  slots,
  participants,
}: {
  slug: string;
  closed: boolean;
  decidedSlotId: string | null;
  slots: AdminSlot[];
  participants: AdminParticipant[];
}) {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setAdminToken(loadAdminToken(slug));
    setReady(true);
  }, [slug]);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "操作を実行できませんでした");
        return;
      }
      router.refresh();
    });
  }

  if (!ready) {
    return null;
  }

  if (!adminToken) {
    return (
      <Card data-testid="admin-not-recognized">
        <CardHeader>
          <CardTitle>この端末は幹事として認識されていません</CardTitle>
          <CardDescription>
            イベントを作成した端末でのみ管理操作ができます。管理トークンはイベント作成時の端末に保存されています。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-panel">
      {error ? (
        <p
          className="text-destructive text-sm"
          role="alert"
          data-testid="admin-error"
        >
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>日程を確定する</CardTitle>
          <CardDescription>
            確定するとイベントページに確定バナーとカレンダー連携が表示されます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {slots.map((slot) => {
            const isDecided = slot.id === decidedSlotId;
            return (
              <div
                key={slot.id}
                className="flex items-center justify-between gap-3 rounded-md border p-2"
              >
                <span className="text-sm font-medium">{slot.label}</span>
                <Button
                  type="button"
                  size="sm"
                  variant={isDecided ? "default" : "outline"}
                  disabled={pending}
                  onClick={() =>
                    run(() => decideSlot({ slug, adminToken, slotId: slot.id }))
                  }
                  data-testid={`decide-slot-${slot.id}`}
                >
                  {isDecided ? "確定中" : "この日程で確定"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>受付を締め切る</CardTitle>
          <CardDescription>
            締め切ると新しい回答を受け付けなくなります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            disabled={pending || closed}
            onClick={() => run(() => closeEvent({ slug, adminToken }))}
            data-testid="close-event"
          >
            {closed ? "締め切り済み" : "締め切る"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>参加者を削除する</CardTitle>
          <CardDescription>
            重複や不要な回答行を削除できます。この操作は元に戻せません。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {participants.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              まだ回答がありません。
            </p>
          ) : (
            participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between gap-3 rounded-md border p-2"
                data-testid="participant-row"
              >
                <span className="text-sm">
                  <span className="font-medium">{participant.name}</span>
                  {participant.comment ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — {participant.comment}
                    </span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      deleteParticipant({
                        slug,
                        adminToken,
                        participantId: participant.id,
                      }),
                    )
                  }
                  data-testid={`delete-participant-${participant.id}`}
                >
                  削除
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

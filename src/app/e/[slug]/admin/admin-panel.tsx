"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  addSlots,
  closeEvent,
  decideSlot,
  deleteParticipant,
  deleteSlot,
} from "@/app/actions";
import { SlotPicker, useSlotPicker } from "@/components/slot-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadAdminToken } from "@/lib/local-storage";
import { MAX_SLOTS_PER_EVENT } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export interface AdminSlot {
  id: string;
  label: string;
  yes: number;
  maybe: number;
  no: number;
  unanswered: number;
  isBest: boolean;
}

export interface AdminParticipant {
  id: string;
  name: string;
  comment: string;
}

// 残り枠は上限が近いときだけ知らせる(遠い数字は行動を変えないため)。
const REMAINING_HINT_THRESHOLD = 10;

/** エラーの表示位置。操作した場所のそばに出すため、追加パネル内と全体で出し分ける。 */
type ErrorScope = "global" | "add";

interface AdminError {
  scope: ErrorScope;
  message: string;
}

interface RunOptions {
  onSuccess?: () => void;
  scope?: ErrorScope;
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
  const [error, setError] = useState<AdminError | null>(null);
  // 実行中の操作の種類。進行中コピーを実際に押した操作にだけ出すために持つ。
  const [busyScope, setBusyScope] = useState<ErrorScope | null>(null);
  const [pending, startTransition] = useTransition();
  const picker = useSlotPicker();
  const [adding, setAdding] = useState(false);
  // 削除は取り消せないため、行ごとに一度だけ確認を挟む。キーは "slot:id" / "participant:id"。
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  useEffect(() => {
    setAdminToken(loadAdminToken(slug));
    setReady(true);
  }, [slug]);

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    { onSuccess, scope = "global" }: RunOptions = {},
  ) {
    setError(null);
    setBusyScope(scope);
    startTransition(async () => {
      const result = await action();
      setBusyScope(null);
      if (!result.ok) {
        setError({
          scope,
          message: result.error ?? "操作を実行できませんでした",
        });
        return;
      }
      onSuccess?.();
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

  const remainingSlots = MAX_SLOTS_PER_EVENT - slots.length;
  const selectedCount = picker.slotInputs.length;
  const isOnlySlot = slots.length <= 1;
  const hasAnswers = participants.length > 0;

  function handleAddSlots() {
    if (selectedCount === 0) {
      setError({
        scope: "add",
        message: "カレンダーで候補日を選び、時刻を1つ以上つけてください",
      });
      return;
    }
    if (selectedCount > remainingSlots) {
      setError({
        scope: "add",
        message: `あと${remainingSlots}件まで追加できます(選択中${selectedCount}件)`,
      });
      return;
    }
    run(() => addSlots({ slug, adminToken, slots: picker.slotInputs }), {
      scope: "add",
      onSuccess: () => {
        sendGAEvent("event", "add_slots", { candidate_count: selectedCount });
        picker.reset();
        setAdding(false);
      },
    });
  }

  return (
    <div className="space-y-6" data-testid="admin-panel">
      {error?.scope === "global" ? (
        <p
          className="text-destructive text-sm"
          role="alert"
          data-testid="admin-error"
        >
          {error.message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>候補日程</CardTitle>
          <CardDescription>
            {hasAnswers ? (
              "各候補の集計(○参加 / △未定 / ×不参加)を見ながら日程を確定できます。○が最多の候補に「ベスト」が付きます。"
            ) : (
              <>
                まだ回答がありません。
                <Link
                  href={`/e/${slug}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  data-testid="share-url-link"
                >
                  集計ページの共有URL
                </Link>
                をメンバーに送ってください。
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {slots.map((slot) => {
            const isDecided = slot.id === decidedSlotId;
            const confirmKey = `slot:${slot.id}`;
            return (
              <div
                key={slot.id}
                className={cn(
                  "flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between",
                  isDecided && "border-primary/50 bg-primary/5",
                )}
                data-testid="candidate-row"
                data-best={slot.isBest ? "true" : "false"}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{slot.label}</span>
                    {isDecided ? (
                      <span
                        className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground"
                        data-testid="admin-decided-badge"
                      >
                        確定中
                      </span>
                    ) : null}
                    {slot.isBest ? (
                      <span
                        className="rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white"
                        data-testid="admin-best-badge"
                      >
                        ベスト
                      </span>
                    ) : null}
                  </div>
                  {hasAnswers ? (
                    <div
                      className="text-muted-foreground mt-0.5 text-xs"
                      data-testid="slot-tally"
                    >
                      <span aria-hidden="true">
                        ○ {slot.yes}・△ {slot.maybe}・× {slot.no}
                        {slot.unanswered > 0
                          ? `・未回答 ${slot.unanswered}`
                          : null}
                      </span>
                      <span className="sr-only">
                        参加 {slot.yes}、未定 {slot.maybe}、不参加 {slot.no}
                        {slot.unanswered > 0
                          ? `、未回答 ${slot.unanswered}`
                          : null}
                      </span>
                    </div>
                  ) : null}
                </div>
                <RowActions>
                  {confirmingKey === confirmKey ? (
                    <DeleteConfirm
                      warning="回答も消えます"
                      pending={pending}
                      testId={`delete-slot-${slot.id}`}
                      onCancel={() => setConfirmingKey(null)}
                      onConfirm={() =>
                        run(
                          () =>
                            deleteSlot({ slug, adminToken, slotId: slot.id }),
                          {
                            onSuccess: () => {
                              sendGAEvent("event", "delete_slot");
                              setConfirmingKey(null);
                            },
                          },
                        )
                      }
                    />
                  ) : (
                    <>
                      {isDecided ? null : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () =>
                                decideSlot({
                                  slug,
                                  adminToken,
                                  slotId: slot.id,
                                }),
                              {
                                onSuccess: () =>
                                  sendGAEvent("event", "decide_slot"),
                              },
                            )
                          }
                          data-testid={`decide-slot-${slot.id}`}
                        >
                          この日程で確定
                        </Button>
                      )}
                      <DeleteRequest
                        ariaLabel={`${slot.label}を削除`}
                        disabled={pending || isOnlySlot}
                        testId={`delete-slot-${slot.id}`}
                        onRequest={() => setConfirmingKey(confirmKey)}
                      />
                    </>
                  )}
                </RowActions>
              </div>
            );
          })}

          {isOnlySlot ? (
            <p className="text-muted-foreground text-right text-xs">
              候補が1件のときは削除できません。
            </p>
          ) : null}

          <div className="border-t pt-3">
            {remainingSlots <= 0 ? (
              <p className="text-muted-foreground text-sm">
                候補は最大{MAX_SLOTS_PER_EVENT}
                件までです。追加するには不要な候補を削除してください。
              </p>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  // ghost バリアントの hover:/aria-expanded: が text-primary に勝つため、
                  // アクセント色を各状態で明示する(ホバーで色が抜けるのを防ぐ)。
                  className="text-primary hover:text-primary aria-expanded:text-primary dark:hover:text-primary"
                  aria-expanded={adding}
                  aria-controls="add-slots-panel"
                  onClick={() => setAdding((open) => !open)}
                  data-testid="add-slots-toggle"
                >
                  {adding ? (
                    <>
                      <Minus />
                      閉じる
                    </>
                  ) : (
                    <>
                      <Plus />
                      候補を追加
                      {selectedCount > 0 ? `（${selectedCount}件選択中）` : ""}
                    </>
                  )}
                </Button>

                {adding ? (
                  <div
                    id="add-slots-panel"
                    className="animate-rise mt-3 space-y-4"
                    data-testid="add-slots-card"
                  >
                    <p className="text-muted-foreground text-sm">
                      追加した候補は一覧の末尾に並びます。すでに回答した人には未回答として表示されるので、必要なら再回答を依頼してください。
                    </p>
                    {closed ? (
                      <p className="text-muted-foreground text-sm">
                        受付を締め切っているため、追加しても回答は集まりません。
                      </p>
                    ) : null}
                    <SlotPicker
                      picker={picker}
                      previewLabel="追加される候補"
                      footer={
                        remainingSlots <= REMAINING_HINT_THRESHOLD ? (
                          <p className="text-muted-foreground text-xs">
                            あと{remainingSlots}件まで追加できます。
                          </p>
                        ) : null
                      }
                    />
                    {error?.scope === "add" ? (
                      <p
                        className="text-destructive text-sm"
                        role="alert"
                        data-testid="admin-error"
                      >
                        {error.message}
                      </p>
                    ) : null}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending || selectedCount === 0}
                        onClick={handleAddSlots}
                        data-testid="add-slots-submit"
                      >
                        {busyScope === "add"
                          ? "追加中…"
                          : selectedCount > 0
                            ? `${selectedCount}件の候補を追加`
                            : "候補を追加"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>受付を締め切る</CardTitle>
          <CardDescription>
            {closed
              ? "新しい回答は受け付けていません。"
              : "締め切ると新しい回答を受け付けなくなります。"}
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

      {/* 回答が無いうちは幹事にできることが無いのでカードごと出さない。 */}
      {hasAnswers ? (
        <Card>
          <CardHeader>
            <CardTitle>参加者を削除する</CardTitle>
            <CardDescription>
              重複や不要な回答行を削除できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {participants.map((participant) => {
              const confirmKey = `participant:${participant.id}`;
              return (
                <div
                  key={participant.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
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
                  <RowActions>
                    {confirmingKey === confirmKey ? (
                      <DeleteConfirm
                        warning="元に戻せません"
                        pending={pending}
                        testId={`delete-participant-${participant.id}`}
                        onCancel={() => setConfirmingKey(null)}
                        onConfirm={() =>
                          run(
                            () =>
                              deleteParticipant({
                                slug,
                                adminToken,
                                participantId: participant.id,
                              }),
                            { onSuccess: () => setConfirmingKey(null) },
                          )
                        }
                      />
                    ) : (
                      <DeleteRequest
                        ariaLabel={`${participant.name}の回答を削除`}
                        disabled={pending}
                        testId={`delete-participant-${participant.id}`}
                        onRequest={() => setConfirmingKey(confirmKey)}
                      />
                    )}
                  </RowActions>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/** 行の操作クラスタ。狭い画面では行の2段目に、sm 以上では右端に置く。 */
function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2">{children}</div>;
}

/** 行の削除トリガー。警告色はホバー/フォーカス時だけに留めて赤の多用を避ける。 */
function DeleteRequest({
  ariaLabel,
  disabled,
  testId,
  onRequest,
}: {
  ariaLabel: string;
  disabled: boolean;
  testId: string;
  onRequest: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20 dark:hover:text-destructive"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onRequest}
      data-testid={testId}
    >
      <Trash2 />
    </Button>
  );
}

/** 削除の最終確認。行の操作をこの1問に絞る。 */
function DeleteConfirm({
  warning,
  pending,
  testId,
  onConfirm,
  onCancel,
}: {
  warning: string;
  pending: boolean;
  testId: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // キーボード操作で削除トリガーが消えるためフォーカスを引き継ぐ。
  // Enter の連打で削除が通らないよう、安全側の「やめる」に当てる。
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <>
      <span className="text-muted-foreground text-xs">{warning}</span>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={onConfirm}
        data-testid={`confirm-${testId}`}
      >
        削除する
      </Button>
      <Button
        ref={cancelRef}
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={onCancel}
        data-testid={`cancel-${testId}`}
      >
        やめる
      </Button>
    </>
  );
}

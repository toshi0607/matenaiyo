import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { events } from "@/db/schema";
import { markMeta } from "@/lib/marks";
import { slotLabel } from "@/lib/slot-label";
import { type SlotAnswer, tallySlots } from "@/lib/tally";
import { AdminLink } from "./admin-link";
import { DecidedBanner } from "./decided-banner";
import { LiveRefresh } from "./live-refresh";
import { ShareUrl } from "./share-url";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: {
      slots: true,
      participants: {
        with: { answers: true },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const orderedSlots = [...event.slots].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const orderedParticipants = [...event.participants].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const slotIds = orderedSlots.map((slot) => slot.id);
  const allAnswers: SlotAnswer[] = orderedParticipants.flatMap((participant) =>
    participant.answers.map((answer) => ({
      slotId: answer.slotId,
      mark: answer.mark,
    })),
  );
  const tallies = tallySlots(slotIds, allAnswers);
  const tallyBySlot = new Map(tallies.map((t) => [t.slotId, t]));

  const answerBySlotParticipant = new Map<string, string>();
  for (const participant of orderedParticipants) {
    for (const answer of participant.answers) {
      answerBySlotParticipant.set(
        `${participant.id}:${answer.slotId}`,
        answer.mark,
      );
    }
  }

  const hasParticipants = orderedParticipants.length > 0;

  const decidedSlot = event.decidedSlotId
    ? orderedSlots.find((slot) => slot.id === event.decidedSlotId)
    : undefined;

  return (
    <main className="flex flex-1 flex-col items-center bg-background px-4 py-10">
      <LiveRefresh />
      <div className="w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
          {event.description ? (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {event.description}
            </p>
          ) : null}
        </header>

        {decidedSlot ? (
          <DecidedBanner
            slotLabel={slotLabel(decidedSlot)}
            startsAt={
              decidedSlot.startsAt ? decidedSlot.startsAt.toISOString() : null
            }
            title={event.title}
            description={event.description}
          />
        ) : null}

        <ShareUrl slug={slug} />

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/e/${slug}/answer`}
            className={buttonVariants()}
            data-testid="answer-cta"
          >
            回答する
          </Link>
          <AdminLink slug={slug} />
          <MarkLegend />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>集計</CardTitle>
            <CardDescription>
              ○が最多の候補日を「ベスト」として強調しています。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasParticipants ? (
              <div className="overflow-x-auto">
                <table
                  className="w-full border-collapse text-sm"
                  data-testid="tally-table"
                >
                  <thead>
                    <tr>
                      <th className="bg-background sticky left-0 z-10 border-b p-2 text-left font-medium">
                        候補日程
                      </th>
                      {orderedParticipants.map((participant) => (
                        <th
                          key={participant.id}
                          className="border-b p-2 text-center font-medium whitespace-nowrap"
                        >
                          {participant.name}
                        </th>
                      ))}
                      <th className="border-b p-2 text-center font-medium whitespace-nowrap">
                        ○ / △ / ×
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedSlots.map((slot) => {
                      const tally = tallyBySlot.get(slot.id);
                      const isBest = tally?.isBest ?? false;
                      return (
                        <tr
                          key={slot.id}
                          className={
                            isBest
                              ? "bg-emerald-50 dark:bg-emerald-950/40"
                              : undefined
                          }
                          data-testid="tally-row"
                          data-best={isBest ? "true" : "false"}
                        >
                          <th
                            scope="row"
                            className={`sticky left-0 z-10 border-b p-2 text-left font-medium ${
                              isBest
                                ? "bg-emerald-50 dark:bg-emerald-950/40"
                                : "bg-background"
                            }`}
                          >
                            <span className="flex items-center gap-2 whitespace-nowrap">
                              {slotLabel(slot)}
                              {isBest ? (
                                <span
                                  className="rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white"
                                  data-testid="best-badge"
                                >
                                  ベスト
                                </span>
                              ) : null}
                            </span>
                          </th>
                          {orderedParticipants.map((participant) => {
                            const raw = answerBySlotParticipant.get(
                              `${participant.id}:${slot.id}`,
                            );
                            const meta = raw
                              ? markMeta(raw as "yes" | "maybe" | "no")
                              : null;
                            return (
                              <td
                                key={participant.id}
                                className="border-b p-2 text-center whitespace-nowrap"
                              >
                                {meta ? (
                                  <span title={meta.label}>
                                    <span aria-hidden="true">
                                      {meta.symbol}
                                    </span>
                                    <span className="sr-only">
                                      {meta.label}
                                    </span>
                                  </span>
                                ) : (
                                  <span
                                    title="未回答"
                                    className="text-muted-foreground"
                                  >
                                    <span aria-hidden="true">−</span>
                                    <span className="sr-only">未回答</span>
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="border-b p-2 text-center whitespace-nowrap">
                            {tally
                              ? `${tally.yes} / ${tally.maybe} / ${tally.no}`
                              : "0 / 0 / 0"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className="text-muted-foreground py-8 text-center"
                data-testid="empty-state"
              >
                <p>まだ回答がありません。</p>
                <p className="text-sm">
                  「回答する」から最初の回答を登録してください。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function MarkLegend() {
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {[
        { symbol: "○", label: "参加" },
        { symbol: "△", label: "未定" },
        { symbol: "×", label: "不参加" },
      ].map((item) => (
        <li key={item.label} className="whitespace-nowrap">
          <span aria-hidden="true">{item.symbol}</span> {item.label}
        </li>
      ))}
    </ul>
  );
}

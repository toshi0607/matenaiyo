import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/db";
import { events } from "@/db/schema";
import { slotLabel } from "@/lib/slot-label";
import { type SlotAnswer, tallySlots } from "@/lib/tally";
import {
  AdminPanel,
  type AdminParticipant,
  type AdminSlot,
} from "./admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: {
      slots: true,
      participants: { with: { answers: true } },
    },
  });

  if (!event) {
    notFound();
  }

  const orderedSlots = [...event.slots].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const allAnswers: SlotAnswer[] = event.participants.flatMap((participant) =>
    participant.answers.map((answer) => ({
      slotId: answer.slotId,
      mark: answer.mark,
    })),
  );
  const tallyBySlot = new Map(
    tallySlots(
      orderedSlots.map((slot) => slot.id),
      allAnswers,
    ).map((tally) => [tally.slotId, tally]),
  );

  const slots: AdminSlot[] = orderedSlots.map((slot) => {
    const tally = tallyBySlot.get(slot.id);
    return {
      id: slot.id,
      label: slotLabel(slot),
      yes: tally?.yes ?? 0,
      maybe: tally?.maybe ?? 0,
      no: tally?.no ?? 0,
      isBest: tally?.isBest ?? false,
    };
  });

  const participants: AdminParticipant[] = [...event.participants]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((participant) => ({
      id: participant.id,
      name: participant.name,
      comment: participant.comment,
    }));

  return (
    <main className="flex flex-1 flex-col items-center bg-background px-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">幹事管理</h1>
          <p className="text-muted-foreground">{event.title}</p>
          <Link
            href={`/e/${slug}`}
            className={buttonVariants({ variant: "link", className: "px-0" })}
          >
            ← 集計ページに戻る
          </Link>
        </header>

        <AdminPanel
          slug={slug}
          closed={event.status === "closed"}
          decidedSlotId={event.decidedSlotId}
          slots={slots}
          participants={participants}
        />
      </div>
    </main>
  );
}

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { events } from "@/db/schema";
import { slotLabel } from "@/lib/slot-label";
import { AnswerForm, type SlotView } from "./answer-form";

export const dynamic = "force-dynamic";

export default async function AnswerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: {
      slots: true,
    },
  });

  if (!event) {
    notFound();
  }

  const slots: SlotView[] = [...event.slots]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((slot) => ({ id: slot.id, label: slotLabel(slot) }));

  return (
    <main className="flex flex-1 flex-col items-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
          <p className="text-muted-foreground text-sm">回答フォーム</p>
        </header>
        <AnswerForm
          slug={slug}
          slots={slots}
          closed={event.status === "closed"}
        />
      </div>
    </main>
  );
}

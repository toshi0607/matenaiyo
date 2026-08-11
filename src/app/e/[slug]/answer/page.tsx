import { notFound } from "next/navigation";
import { getPublicEventDTO } from "@/lib/event-access";
import { AnswerForm } from "./answer-form";

export const dynamic = "force-dynamic";

export default async function AnswerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const event = await getPublicEventDTO(slug);

  if (!event) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
          <p className="text-muted-foreground text-sm">回答フォーム</p>
        </header>
        <AnswerForm
          slug={slug}
          slots={event.slots}
          closed={event.status === "closed"}
        />
      </div>
    </main>
  );
}

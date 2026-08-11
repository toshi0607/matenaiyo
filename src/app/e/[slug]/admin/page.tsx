import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { getPublicEventDTO } from "@/lib/event-access";
import { AdminPanel } from "./admin-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage({
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

        <AdminPanel slug={slug} />
      </div>
    </main>
  );
}

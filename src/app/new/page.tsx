import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NewEventForm } from "./new-event-form";

export const dynamic = "force-dynamic";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Query strings can contain an event title. Redirect before rendering analytics.
  if (Object.keys(await searchParams).length > 0) {
    redirect("/new");
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        <Suspense fallback={null}>
          <NewEventForm />
        </Suspense>
      </div>
    </main>
  );
}

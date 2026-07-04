import { Suspense } from "react";
import { NewEventForm } from "./new-event-form";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
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

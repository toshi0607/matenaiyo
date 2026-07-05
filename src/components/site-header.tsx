import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
        <Link
          href="/"
          className="group flex items-center gap-2"
          data-testid="site-brand"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-2xl bg-primary text-base shadow-sm ring-1 ring-primary/25 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-105"
          >
            🍊
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">
            matenaiyo
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

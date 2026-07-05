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
            className="flex size-8 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/25 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-105"
          >
            <svg
              viewBox="0 0 100 100"
              className="size-5"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <g transform="rotate(-6 50 50)">
                <circle cx="50" cy="50" r="26.5" strokeWidth="11" />
                <path
                  d="M50 23.5 C 60 23.5, 70 30, 71 40"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
              </g>
            </svg>
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

import Link from "next/link";
import { SITE_DESCRIPTION, SITE_GITHUB_URL, SITE_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex h-12 w-full max-w-4xl items-center justify-between px-4 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          {SITE_NAME} — {SITE_DESCRIPTION}
        </Link>
        <a
          href={SITE_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareUrl({ slug }: { slug: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/e/${slug}`);
  }, [slug]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        readOnly
        value={url}
        aria-label="共有URL"
        data-testid="share-url"
        className="flex-1"
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleCopy}
        data-testid="copy-url"
      >
        {copied ? "コピーしました" : "URLをコピー"}
      </Button>
    </div>
  );
}

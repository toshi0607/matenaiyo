"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { loadAdminToken } from "@/lib/local-storage";

/** 幹事トークンを保持する端末でのみ「幹事管理」リンクを表示する。 */
export function AdminLink({ slug }: { slug: string }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(loadAdminToken(slug) !== null);
  }, [slug]);

  if (!isAdmin) {
    return null;
  }

  return (
    <Link
      href={`/e/${slug}/admin`}
      className={buttonVariants({ variant: "outline" })}
      data-testid="admin-link"
    >
      幹事管理
    </Link>
  );
}

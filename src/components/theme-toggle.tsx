"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;
type ThemeValue = (typeof ORDER)[number];

const META: Record<ThemeValue, { label: string; icon: typeof Sun }> = {
  light: { label: "ライト", icon: Sun },
  dark: { label: "ダーク", icon: Moon },
  system: { label: "システム", icon: Monitor },
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current: ThemeValue = mounted && isThemeValue(theme) ? theme : "system";
  const { label, icon: Icon } = META[current];

  function cycle() {
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    setTheme(next);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={cycle}
      data-testid="theme-toggle"
      data-theme={current}
      aria-label={`テーマ: ${label}（クリックで切替）`}
      title={`テーマ: ${label}`}
    >
      <Icon aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

function isThemeValue(value: string | undefined): value is ThemeValue {
  return value === "light" || value === "dark" || value === "system";
}

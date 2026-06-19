"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n, LOCALES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Compact language switcher: a flag button that opens a small popover with the
 * available locales. Lives in the status bar, outside the account popover.
 */
export function LocaleSwitcher() {
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);

  const active = LOCALES.find((option) => option.code === locale) ?? LOCALES[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={t("account.language")}
            title={t("account.language")}
          >
            <span aria-hidden className="text-base leading-none">
              {active.flag}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-40 space-y-1 p-1">
        {LOCALES.map((option) => (
          <Button
            key={option.code}
            type="button"
            variant={locale === option.code ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "w-full justify-start gap-2",
              locale === option.code && "pointer-events-none",
            )}
            aria-pressed={locale === option.code}
            onClick={() => {
              setLocale(option.code);
              setOpen(false);
            }}
          >
            <span aria-hidden className="text-base leading-none">
              {option.flag}
            </span>
            {option.label}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

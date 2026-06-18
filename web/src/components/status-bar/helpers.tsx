import { Badge } from "@/components/ui/badge";
import type { TFunc } from "@/lib/i18n";
import { toast } from "sonner";

export async function copy(value: string, label: string, t: TFunc) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(t("copy.copied", { label }));
  } catch (err) {
    toast.error(err instanceof Error ? err.message : String(err));
  }
}

export function formatAgo(ts: number, now: number, t: TFunc): string {
  const secs = Math.max(0, Math.floor((now - ts) / 1000));
  if (secs < 5) return t("time.justNow");
  if (secs < 60) return t("time.secondsAgo", { count: secs });
  const mins = Math.floor(secs / 60);
  if (mins < 60) return t("time.minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  return t("time.hoursAgo", { count: hours });
}

export type StatusTone = "ok" | "warn" | "error" | "pending";

export function syncLabel(
  state: string | null,
  t: TFunc,
): {
  label: string;
  tone: StatusTone;
} {
  switch (state) {
    case "PREPARED":
    case "SYNCING":
      return { label: t("sync.synced"), tone: "ok" };
    case "CATCHUP":
      return { label: t("sync.catchingUp"), tone: "pending" };
    case "RECONNECTING":
      return { label: t("sync.reconnecting"), tone: "pending" };
    case "ERROR":
      return { label: t("sync.error"), tone: "error" };
    case "STOPPED":
      return { label: t("sync.stopped"), tone: "error" };
    default:
      return { label: state ?? t("sync.connecting"), tone: "pending" };
  }
}

const STATUS_DOT: Record<StatusTone, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  error: "bg-destructive",
  pending: "bg-muted-foreground/40 animate-pulse",
};

export function StatusPill({
  tone,
  title,
  children,
}: {
  tone: StatusTone;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge variant="outline" title={title} className="gap-1.5 font-normal">
      <span
        aria-hidden
        className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[tone]}`}
      />
      {children}
    </Badge>
  );
}

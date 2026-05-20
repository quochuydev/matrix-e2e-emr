"use client";

import { useEffect, useState } from "react";
import { useMatrix } from "@/lib/matrix/provider";
import { Badge } from "@/components/ui/badge";

function formatAgo(ts: number, now: number): string {
  const secs = Math.max(0, Math.floor((now - ts) / 1000));
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

function syncLabel(state: string | null): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (state) {
    case "PREPARED":
    case "SYNCING":
      return { label: "Synced", variant: "default" };
    case "CATCHUP":
      return { label: "Catching up", variant: "secondary" };
    case "RECONNECTING":
      return { label: "Reconnecting", variant: "secondary" };
    case "ERROR":
      return { label: "Sync error", variant: "destructive" };
    case "STOPPED":
      return { label: "Stopped", variant: "destructive" };
    default:
      return { label: state ?? "Connecting", variant: "secondary" };
  }
}

export function StatusBar() {
  const {
    status,
    syncState,
    lastSyncedAt,
    cryptoStatus,
    session,
    ready,
    notReadyReason,
  } = useMatrix();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  if (status !== "ready") return null;

  const sync = syncLabel(syncState);
  const encOk =
    !!cryptoStatus &&
    cryptoStatus.crossSigningReady &&
    cryptoStatus.secretStorageReady;
  const backupOn = !!cryptoStatus?.backupVersion;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge variant={ready ? "default" : "destructive"}>
        {ready ? "Ready" : "Read-only"}
      </Badge>
      <Badge variant={sync.variant}>{sync.label}</Badge>
      <Badge variant={encOk ? "default" : "secondary"}>
        {encOk ? "E2E ready" : "E2E locked"}
      </Badge>
      <Badge variant={backupOn ? "default" : "secondary"}>
        {backupOn ? `Backup v${cryptoStatus?.backupVersion}` : "No backup"}
      </Badge>
      {lastSyncedAt && (
        <span className="text-muted-foreground">
          synced {formatAgo(lastSyncedAt, now)}
        </span>
      )}
      {session?.deviceId && (
        <span className="text-muted-foreground font-mono">
          {session.deviceId}
        </span>
      )}
      {!ready && notReadyReason && (
        <span className="text-destructive">{notReadyReason}</span>
      )}
    </div>
  );
}

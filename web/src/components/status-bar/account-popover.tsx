"use client";

import { useEffect, useState } from "react";
import { useDeviceVerification, useMatrix } from "matrix-client/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon, CopyIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { copy, formatAgo, StatusPill, syncLabel } from "./helpers";

/**
 * The account button + popover: live crypto/sync status pills, copyable
 * identifiers, and the entry points into the recovery-key, reset-backup, and
 * sign-out flows (which the parent StatusBar opens as dialogs).
 */
export function AccountPopover({
  onOpenRecoveryKey,
  onOpenReset,
  onOpenSignOut,
}: {
  onOpenRecoveryKey: () => void;
  onOpenReset: () => void;
  onOpenSignOut: () => void;
}) {
  const {
    syncState,
    lastSyncedAt,
    cryptoStatus,
    session,
    ready,
    pendingBackup,
  } = useMatrix();
  const verification = useDeviceVerification();
  const deviceVerified = verification?.deviceVerified ?? null;
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const sync = syncLabel(syncState, t);
  const encOk =
    !!cryptoStatus &&
    cryptoStatus.crossSigningReady &&
    cryptoStatus.secretStorageReady;
  const backupOn = !!cryptoStatus?.backupVersion;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <span
              aria-hidden
              title={
                ready && encOk ? t("account.allReady") : t("account.actionNeeded")
              }
              className={`mr-1 size-2 shrink-0 rounded-full ${
                ready && encOk ? "bg-success" : "bg-warning"
              }`}
            />
            <span className="font-mono truncate max-w-[160px]">
              {session?.userId ?? t("account.label")}
            </span>
            {pendingBackup > 0 && (
              <Badge variant="secondary" className="ml-1">
                {t("account.backingUpShort", { count: pendingBackup })}
              </Badge>
            )}
            <ChevronDownIcon className="ml-1 size-3.5" />
          </Button>
        }
      />
      <PopoverContent className="w-80 space-y-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("account.status")}
          </Label>
          <div className="flex flex-wrap gap-1.5">
            <StatusPill tone={ready ? "ok" : "error"}>
              {ready ? t("account.ready") : t("account.readOnly")}
            </StatusPill>
            <StatusPill tone={sync.tone}>{sync.label}</StatusPill>
            <StatusPill tone={encOk ? "ok" : "warn"}>
              {encOk ? t("account.e2eReady") : t("account.e2eLocked")}
            </StatusPill>
            <StatusPill
              tone={
                deviceVerified === null
                  ? "pending"
                  : deviceVerified
                    ? "ok"
                    : "error"
              }
              title={
                deviceVerified === null
                  ? t("account.checkingDevice")
                  : deviceVerified
                    ? t("account.deviceSigned")
                    : t("account.deviceNotSigned")
              }
            >
              {deviceVerified === null
                ? t("account.deviceChecking")
                : deviceVerified
                  ? t("account.deviceVerified")
                  : t("account.deviceUnverified")}
            </StatusPill>
            <StatusPill tone={backupOn ? "ok" : "warn"}>
              {backupOn
                ? t("account.backupVersion", {
                    version: cryptoStatus?.backupVersion ?? "",
                  })
                : t("account.noBackup")}
            </StatusPill>
            {backupOn && pendingBackup > 0 && (
              <StatusPill tone="pending">
                {pendingBackup === 1
                  ? t("account.uploadingKeysOne", { count: pendingBackup })
                  : t("account.uploadingKeysOther", { count: pendingBackup })}
              </StatusPill>
            )}
          </div>
          {lastSyncedAt && (
            <span className="text-xs text-muted-foreground">
              {t("account.syncedAgo", { ago: formatAgo(lastSyncedAt, now, t) })}
            </span>
          )}
        </div>
        <div className="border-t -mx-3" />
        <div className="space-y-2">
          {session?.userId && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t("account.userId")}
              </Label>
              <button
                type="button"
                onClick={() => copy(session.userId, t("account.userId"), t)}
                title={t("account.copyUserId")}
                className="group flex w-full items-center justify-between gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-left font-mono text-xs hover:bg-muted cursor-pointer"
              >
                <span className="truncate">{session.userId}</span>
                <CopyIcon className="size-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
              </button>
            </div>
          )}
          {session?.deviceId && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t("account.deviceId")}
              </Label>
              <button
                type="button"
                onClick={() => copy(session.deviceId, t("account.deviceId"), t)}
                title={t("account.copyDeviceId")}
                className="group flex w-full items-center justify-between gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-left font-mono text-xs hover:bg-muted cursor-pointer"
              >
                <span className="truncate">{session.deviceId}</span>
                <CopyIcon className="size-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
              </button>
            </div>
          )}
        </div>
        <div className="border-t -mx-3" />
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              setOpen(false);
              onOpenRecoveryKey();
            }}
            title={t("account.recoveryKeyTitle")}
          >
            {t("account.recoveryKey")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              setOpen(false);
              onOpenReset();
            }}
            title={t("account.resetBackupTitle")}
          >
            {t("account.resetBackup")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-destructive hover:text-destructive"
            disabled={pendingBackup > 0}
            onClick={() => {
              setOpen(false);
              onOpenSignOut();
            }}
            title={
              pendingBackup > 0
                ? pendingBackup === 1
                  ? t("account.backingUpWaitOne", { count: pendingBackup })
                  : t("account.backingUpWaitOther", { count: pendingBackup })
                : undefined
            }
          >
            {pendingBackup > 0
              ? t("account.backingUpShort", { count: pendingBackup })
              : t("account.signOut")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

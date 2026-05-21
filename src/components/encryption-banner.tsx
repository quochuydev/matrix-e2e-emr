"use client";

import { useState } from "react";
import { useMatrix } from "@/lib/matrix/provider";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";

export function EncryptionBanner() {
  const { cryptoStatus, hasKeyThisSession, unlock } = useMatrix();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  if (!cryptoStatus) return null;
  const sdkReady =
    cryptoStatus.secretStorageReady && cryptoStatus.crossSigningReady;
  const backupExists = !!cryptoStatus.backupVersion;
  const needsUnlock = !sdkReady || (backupExists && !hasKeyThisSession);
  if (!needsUnlock) return null;
  const refreshedBackupOnly = sdkReady && backupExists && !hasKeyThisSession;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setBusy(true);
    try {
      const outcome = await unlock(key);
      setKey("");
      const imported = outcome.keyBackupRestored?.imported ?? 0;
      toast.success(
        imported > 0
          ? `Unlocked. Restored ${imported} message keys.`
          : "Unlocked.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-b bg-amber-50 dark:bg-amber-950/30">
      <div className="mx-auto w-full max-w-6xl px-8 py-3">
        <form
          onSubmit={onSubmit}
          className="flex flex-wrap items-center gap-3 text-sm"
        >
          <div className="flex-1 min-w-[260px]">
            <div className="font-medium">
              {refreshedBackupOnly
                ? "Re-enter your recovery key for this session"
                : "Encrypted history is locked"}
            </div>
            <div className="text-xs text-muted-foreground">
              {refreshedBackupOnly
                ? "The page refresh cleared the in-memory recovery key. Type it again so this browser can pull missing message keys from backup."
                : "Enter your Matrix recovery key to decrypt past messages on this browser."}
            </div>
          </div>
          <PasswordInput
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="EsTz cDAu oLhr WV1d …"
            autoComplete="off"
            spellCheck={false}
            className="max-w-xs"
          />
          <Button type="submit" disabled={busy || !key.trim()} size="sm">
            {busy ? "Unlocking…" : "Unlock"}
          </Button>
        </form>
      </div>
    </div>
  );
}

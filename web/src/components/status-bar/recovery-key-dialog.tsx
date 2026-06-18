"use client";

import { useEffect, useState } from "react";
import { useMatrix } from "matrix-client/react";
import {
  generateRecoveryKey,
  hasSecretStorage,
  unlockWithSecurityKey,
} from "matrix-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function RecoveryKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { client, markKeyUnlocked } = useMatrix();
  const [keying, setKeying] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [genPassword, setGenPassword] = useState("");
  // null = still probing; true = SSSS exists (Enter mode); false = no SSSS
  // (Generate mode).
  const [hasSSSS, setHasSSSS] = useState<boolean | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !client) return;
    let cancelled = false;
    void hasSecretStorage(client).then((v) => {
      if (!cancelled) setHasSSSS(v);
    });
    return () => {
      cancelled = true;
    };
  }, [open, client]);

  const close = () => {
    setKeyValue("");
    setGenPassword("");
    setGeneratedKey(null);
    // Back to the "checking…" state so the next open re-probes from scratch.
    // The dialog body only renders while open, so this stale-reset is unseen.
    setHasSSSS(null);
    onOpenChange(false);
  };

  const confirmKey = async () => {
    if (!client) return;
    if (!keyValue.trim()) return;
    setKeying(true);
    try {
      const outcome = await unlockWithSecurityKey(client, keyValue.trim());
      markKeyUnlocked();
      const imported = outcome.keyBackupRestored?.imported ?? 0;
      toast.success(
        imported > 0
          ? `Unlocked. Restored ${imported} message key${imported === 1 ? "" : "s"} from backup.`
          : "Unlocked.",
      );
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setKeying(false);
    }
  };

  const confirmGenerate = async () => {
    if (!client) return;
    if (!genPassword) return;
    setKeying(true);
    try {
      const { recoveryKey } = await generateRecoveryKey(client, {
        password: genPassword,
      });
      setGeneratedKey(recoveryKey);
      setGenPassword("");
      markKeyUnlocked();
      toast.success("Recovery key generated. Save it before closing.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setKeying(false);
    }
  };

  const copyGenerated = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      toast.success("Copied to clipboard.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (keying) return;
        if (!o) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        {generatedKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Save your recovery key</DialogTitle>
              <DialogDescription>
                Write this down or copy it to a password manager. This is
                the only time it will be shown. Without it you can&apos;t
                read encrypted messages on other devices.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border bg-muted px-3 py-2 font-mono text-sm break-all">
              {generatedKey}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={copyGenerated}>
                Copy
              </Button>
              <Button onClick={close}>I&apos;ve saved it</Button>
            </div>
          </>
        ) : hasSSSS === null ? (
          <>
            <DialogHeader>
              <DialogTitle>Recovery key</DialogTitle>
              <DialogDescription>
                Checking your account&apos;s secret storage…
              </DialogDescription>
            </DialogHeader>
          </>
        ) : hasSSSS ? (
          <>
            <DialogHeader>
              <DialogTitle>Enter recovery key</DialogTitle>
              <DialogDescription>
                Loads the backup decryption key into this browser&apos;s
                crypto store so messages sent from other devices can be
                decrypted.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="cache-security-key" className="text-xs">
                Recovery key
              </Label>
              <PasswordInput
                id="cache-security-key"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="EsTz cDAu oLhr WV1d …"
                autoComplete="off"
                spellCheck={false}
                disabled={keying}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close} disabled={keying}>
                Cancel
              </Button>
              <Button onClick={confirmKey} disabled={keying || !keyValue.trim()}>
                {keying ? "Unlocking…" : "Unlock"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Set up recovery key</DialogTitle>
              <DialogDescription>
                Your account doesn&apos;t have secret storage set up yet.
                Generate a recovery key to enable encrypted backups and
                cross-device decryption.
              </DialogDescription>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              We&apos;ll create a new secret storage entry, store your
              cross-signing keys in it, and create a new key backup — all
              encrypted under the recovery key shown next. Your password is
              needed to authorize uploading the cross-signing public keys to
              the server.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="gen-password" className="text-xs">
                Account password
              </Label>
              <PasswordInput
                id="gen-password"
                value={genPassword}
                onChange={(e) => setGenPassword(e.target.value)}
                autoComplete="current-password"
                disabled={keying}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close} disabled={keying}>
                Cancel
              </Button>
              <Button
                onClick={confirmGenerate}
                disabled={keying || !genPassword}
              >
                {keying ? "Generating…" : "Generate recovery key"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

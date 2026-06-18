"use client";

import { useState } from "react";
import { useMatrix } from "matrix-client/react";
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

export function ResetBackupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { resetBackup } = useMatrix();
  const [resetting, setResetting] = useState(false);
  const [resetSecurityKey, setResetSecurityKey] = useState("");

  const close = () => {
    setResetSecurityKey("");
    onOpenChange(false);
  };

  const confirmReset = async () => {
    if (!resetSecurityKey.trim()) return;
    setResetting(true);
    try {
      await resetBackup(resetSecurityKey.trim());
      toast.success(
        "Backup reset. Other devices will re-upload their keys here.",
      );
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (resetting) return;
        if (!o) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Reset key backup?</DialogTitle>
          <DialogDescription>
            This creates a new server-side backup version and stores a fresh
            decryption key in your secret storage. Use this only when the
            current backup is in a broken state (e.g. the recovery key
            doesn&apos;t match the backup).
          </DialogDescription>
        </DialogHeader>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            <span className="font-medium text-foreground">What changes:</span>{" "}
            the previous backup is replaced. Other devices will detect the
            new version and re-upload their message keys.
          </p>
          <p>
            <span className="font-medium text-foreground">What you lose:</span>{" "}
            any Megolm sessions that lived only in the old backup are
            unreachable. Past messages where the sender device still has the
            session locally will eventually become readable again.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-security-key" className="text-xs">
            Recovery key (needed to encrypt the new backup key into SSSS)
          </Label>
          <PasswordInput
            id="reset-security-key"
            value={resetSecurityKey}
            onChange={(e) => setResetSecurityKey(e.target.value)}
            placeholder="EsTz cDAu oLhr WV1d …"
            autoComplete="off"
            spellCheck={false}
            disabled={resetting}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={resetting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmReset}
            disabled={resetting || !resetSecurityKey.trim()}
          >
            {resetting ? "Resetting…" : "Reset backup"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

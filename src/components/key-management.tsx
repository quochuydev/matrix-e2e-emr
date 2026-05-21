"use client";

import { useRef, useState } from "react";
import { useMatrix } from "@/lib/matrix/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  exportEncryptedKeys,
  importEncryptedKeys,
  pushAllKeysToBackup,
} from "@/lib/matrix/key-export";
import { toast } from "sonner";

export function PushToBackupButton() {
  const { client } = useMatrix();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!client) return;
    setBusy(true);
    try {
      const r = await pushAllKeysToBackup(client);
      const stats = `Local: ${r.localTotal} sessions (${r.localBackedUp} marked backed-up). Server: ${r.after}.`;
      if (r.pushed === 0) {
        toast.info(`Nothing new to push. ${stats}`);
      } else {
        toast.success(
          `Pushed ${r.pushed} new keys (${r.before} → ${r.after}). ${stats}`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={busy}>
      {busy ? "Pushing…" : "Push to backup"}
    </Button>
  );
}

export function ExportKeysDialog() {
  const { client } = useMatrix();
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    if (!client || !pass) return;
    setBusy(true);
    try {
      const { blob, sessionCount } = await exportEncryptedKeys(client, pass);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.download = `matrix-keys-${stamp}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(
        `Exported ${sessionCount} room key${sessionCount === 1 ? "" : "s"}. Keep the file safe.`,
      );
      setPass("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Export
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Export encryption keys</DialogTitle>
          <DialogDescription>
            Save this browser&apos;s room keys to a file. Pick a passphrase
            you&apos;ll re-enter on the other device to import.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="exportPass">Passphrase</Label>
            <PasswordInput
              id="exportPass"
              autoComplete="new-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
          <Button onClick={onExport} disabled={busy || pass.length < 4}>
            {busy ? "Exporting…" : "Export keys"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ImportKeysDialog() {
  const { client } = useMatrix();
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!client || !file || !pass) return;
    setBusy(true);
    try {
      const text = await file.text();
      const r = await importEncryptedKeys(client, text, pass);
      toast.success(
        `Imported ${r.total} keys locally; pushed ${r.uploadedToBackup} to backup (server now has ${r.backupCount}).`,
      );
      setPass("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Import
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Import encryption keys</DialogTitle>
          <DialogDescription>
            Load room keys from a file exported on another device. Format
            matches Element&apos;s Export E2E Room Keys.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="importFile">Key file</Label>
            <Input
              id="importFile"
              type="file"
              accept=".txt,text/plain"
              ref={fileInputRef}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="importPass">Passphrase</Label>
            <PasswordInput
              id="importPass"
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>
          <Button onClick={onImport} disabled={busy || !pass}>
            {busy ? "Importing…" : "Import keys"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useRef, useState } from "react";
import { useMatrix } from "@/lib/matrix/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function KeyManagementDialog() {
  const { client } = useMatrix();
  const [open, setOpen] = useState(false);
  const [exportPass, setExportPass] = useState("");
  const [importPass, setImportPass] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onExport = async () => {
    if (!client || !exportPass) return;
    setExportBusy(true);
    try {
      const { blob, sessionCount } = await exportEncryptedKeys(
        client,
        exportPass,
      );
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
      setExportPass("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setExportBusy(false);
    }
  };

  const onPushAll = async () => {
    if (!client) return;
    setPushBusy(true);
    try {
      const r = await pushAllKeysToBackup(client);
      if (r.pushed === 0) {
        toast.info(
          `Backup already up to date (${r.after} keys on server). Nothing new to push.`,
        );
      } else {
        toast.success(
          `Pushed ${r.pushed} new keys to backup (server: ${r.before} → ${r.after}).`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPushBusy(false);
    }
  };

  const onImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!client || !file || !importPass) return;
    setImportBusy(true);
    try {
      const text = await file.text();
      const r = await importEncryptedKeys(client, text, importPass);
      toast.success(
        `Imported ${r.total} keys locally; pushed ${r.uploadedToBackup} to backup (server now has ${r.backupCount}).`,
      );
      setImportPass("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Keys
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Encryption keys</DialogTitle>
          <DialogDescription>
            Export this browser&apos;s room keys to a file, or import keys from
            another device. File format matches Element&apos;s Export E2E Room
            Keys.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="font-semibold text-sm">Push all to backup</h3>
            <p className="text-xs text-muted-foreground">
              Send every Megolm session in this browser to the server-side key
              backup. Run this before signing out so other devices can decrypt
              your latest data.
            </p>
            <Button onClick={onPushAll} disabled={pushBusy}>
              {pushBusy ? "Pushing…" : "Push everything to backup"}
            </Button>
          </section>
          <section className="space-y-3 border-t pt-4">
            <h3 className="font-semibold text-sm">Export</h3>
            <p className="text-xs text-muted-foreground">
              Pick a passphrase. You&apos;ll need it on the other device to
              import.
            </p>
            <div className="space-y-2">
              <Label htmlFor="exportPass">Passphrase</Label>
              <Input
                id="exportPass"
                type="password"
                autoComplete="new-password"
                value={exportPass}
                onChange={(e) => setExportPass(e.target.value)}
              />
            </div>
            <Button
              onClick={onExport}
              disabled={exportBusy || exportPass.length < 4}
            >
              {exportBusy ? "Exporting…" : "Export keys"}
            </Button>
          </section>
          <section className="space-y-3 border-t pt-4">
            <h3 className="font-semibold text-sm">Import</h3>
            <p className="text-xs text-muted-foreground">
              Choose a file exported from this account on another device.
            </p>
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
              <Input
                id="importPass"
                type="password"
                autoComplete="current-password"
                value={importPass}
                onChange={(e) => setImportPass(e.target.value)}
              />
            </div>
            <Button onClick={onImport} disabled={importBusy || !importPass}>
              {importBusy ? "Importing…" : "Import keys"}
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

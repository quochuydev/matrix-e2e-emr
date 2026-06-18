"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMatrix } from "matrix-client/react";
import { createPatient } from "matrix-client/patients";
import { notReadyMessage } from "@/lib/not-ready-message";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { EMPTY, PatientFormFields, type FormValues } from "./form-fields";

const MATRIX_ID_RE = /^@[^:\s]+:[^:\s]+$/;

export function NewPatientDialog({ onCreated }: { onCreated?: () => void }) {
  const { client, ready, notReadyReason } = useMatrix();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [inviteInput, setInviteInput] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !ready) return;
    const inviteId = inviteInput.trim();
    if (!inviteId) {
      toast.error("A Matrix user to invite is required.");
      return;
    }
    if (!MATRIX_ID_RE.test(inviteId)) {
      toast.error(
        `Not a valid Matrix user ID: ${inviteId}. Expected @user:server.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await createPatient(client, values, {
        inviteUserIds: [inviteId],
      });
      const display = `${values.firstName} ${values.lastName}`.trim();
      toast.success(
        `Patient room created for ${display}; invited ${inviteId}.`,
      );
      setValues(EMPTY);
      setInviteInput("");
      setOpen(false);
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={!ready} title={notReadyMessage(notReadyReason, t) || undefined}>
            New patient
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New patient</DialogTitle>
            <DialogDescription>
              Creates an end-to-end encrypted Matrix room for this patient.
            </DialogDescription>
          </DialogHeader>
          <PatientFormFields values={values} onChange={setValues} />
          <div className="space-y-2">
            <Label htmlFor="invite">Invite Matrix user</Label>
            <Input
              id="invite"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="@alice:example.org"
              autoComplete="off"
              spellCheck={false}
              required
            />
            <p className="text-xs text-muted-foreground">
              They&apos;ll be invited to the room and can decrypt every
              message from creation onward.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={
                submitting ||
                !values.firstName.trim() ||
                !values.lastName.trim() ||
                !inviteInput.trim() ||
                !ready
              }
              title={notReadyMessage(notReadyReason, t) || undefined}
            >
              {submitting ? "Creating…" : "Create patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

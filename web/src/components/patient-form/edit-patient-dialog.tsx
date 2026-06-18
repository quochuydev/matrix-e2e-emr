"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMatrix } from "matrix-client/react";
import { updatePatient } from "matrix-client/patients";
import { notReadyMessage } from "@/lib/not-ready-message";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { PatientFormFields, type FormValues } from "./form-fields";

export function EditPatientDialog({
  roomId,
  initial,
  onUpdated,
}: {
  roomId: string;
  initial: FormValues;
  onUpdated?: () => void;
}) {
  const { ready, notReadyReason } = useMatrix();
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            disabled={!ready}
            title={notReadyMessage(notReadyReason, t) || undefined}
          >
            Edit profile
          </Button>
        }
      />
      <DialogContent className="p-6 sm:max-w-[620px]">
        {open && (
          <EditPatientForm
            roomId={roomId}
            initial={initial}
            onDone={() => {
              setOpen(false);
              onUpdated?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditPatientForm({
  roomId,
  initial,
  onDone,
}: {
  roomId: string;
  initial: FormValues;
  onDone: () => void;
}) {
  const { client, ready, notReadyReason } = useMatrix();
  const t = useT();
  const [values, setValues] = useState<FormValues>(initial);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !ready) return;
    setSubmitting(true);
    try {
      await updatePatient(client, roomId, values);
      toast.success("Profile updated");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <DialogHeader className="gap-1.5">
        <DialogTitle className="text-lg">Edit profile</DialogTitle>
        <DialogDescription>
          Saves a new revision in the profile thread. Older revisions are kept
          for audit.
        </DialogDescription>
      </DialogHeader>
      <PatientFormFields values={values} onChange={setValues} />
      <DialogFooter className="-mx-6 -mb-6 px-6 py-4">
        <DialogClose render={<Button variant="outline" type="button" />}>
          Cancel
        </DialogClose>
        <Button
          type="submit"
          disabled={
            submitting ||
            !values.firstName.trim() ||
            !values.lastName.trim() ||
            !ready
          }
          title={notReadyMessage(notReadyReason, t) || undefined}
        >
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

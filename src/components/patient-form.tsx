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
import { useMatrix } from "@/lib/matrix/provider";
import { createPatient, updatePatient } from "@/lib/matrix/patients";
import type { PatientRecord } from "@/lib/matrix/types";
import { toast } from "sonner";

type FormValues = Omit<PatientRecord, "updatedAt">;

const EMPTY: FormValues = {
  name: "",
  dob: "",
  phone: "",
  email: "",
  notes: "",
};

function PatientFormFields({
  values,
  onChange,
}: {
  values: FormValues;
  onChange: (next: FormValues) => void;
}) {
  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) =>
    onChange({ ...values, [k]: v });
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="dob">Date of birth</Label>
          <Input
            id="dob"
            type="date"
            value={values.dob ?? ""}
            onChange={(e) => set("dob", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={values.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={values.email ?? ""}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          value={values.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    </>
  );
}

export function NewPatientDialog({ onCreated }: { onCreated?: () => void }) {
  const { client, ready, notReadyReason } = useMatrix();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<FormValues>(EMPTY);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !ready) return;
    setSubmitting(true);
    try {
      await createPatient(client, values);
      toast.success(`Patient room created for ${values.name}`);
      setValues(EMPTY);
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
          <Button disabled={!ready} title={notReadyReason ?? undefined}>
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
          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting || !values.name || !ready}
              title={notReadyReason ?? undefined}
            >
              {submitting ? "Creating…" : "Create patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            disabled={!ready}
            title={notReadyReason ?? undefined}
          >
            Edit profile
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
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
    <form onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>
          Saves a new revision in the profile thread. Older revisions are kept
          for audit.
        </DialogDescription>
      </DialogHeader>
      <PatientFormFields values={values} onChange={setValues} />
      <DialogFooter>
        <Button
          type="submit"
          disabled={submitting || !values.name || !ready}
          title={notReadyReason ?? undefined}
        >
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

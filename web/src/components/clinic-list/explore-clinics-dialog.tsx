"use client";

import { useMemo, useState } from "react";
import { useMatrix } from "matrix-client/react";
import { joinClinic } from "matrix-client/patients";
import { CLINICS, type Clinic } from "@/lib/config";
import { notReadyMessage } from "@/lib/not-ready-message";
import { useT } from "@/lib/i18n";
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
import {
  EMPTY,
  PatientFormFields,
  type FormValues,
} from "@/components/patient-form";
import { toast } from "sonner";
import { listClinicRelations } from "./relations";

/**
 * Modal letting a patient browse clinics they don't yet have a record with and
 * start one. "Join" is the patient-initiated mirror of the clinic's New patient
 * flow: it creates the encrypted record room, shares the patient's profile, and
 * invites the clinic — which then accepts on its side.
 */
export function ExploreClinicsDialog() {
  const { client, ready, notReadyReason } = useMatrix();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Clinic | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  // Clinics the patient already relates to (joined or invited) are hidden — you
  // can't start a second record with a clinic you're already connected to.
  const relatedUserIds = useMemo(() => {
    if (!client || !open) return new Set<string>();
    return new Set(listClinicRelations(client).map((r) => r.clinicUserId));
  }, [client, open]);
  const available = CLINICS.filter((c) => !relatedUserIds.has(c.userId));

  const reset = () => {
    setSelected(null);
    setValues(EMPTY);
  };

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !ready || !selected) return;
    setSubmitting(true);
    try {
      await joinClinic(client, selected.userId, values);
      toast.success(
        `Request sent to ${selected.name}. They'll appear here once they accept.`,
      );
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            disabled={!ready}
            title={notReadyMessage(notReadyReason, t) || undefined}
          >
            Explore clinics
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        {selected ? (
          <form onSubmit={onJoin} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Join {selected.name}</DialogTitle>
              <DialogDescription>
                Creates an end-to-end encrypted room and invites the clinic. The
                details below are shared with them as your record.
              </DialogDescription>
            </DialogHeader>
            <PatientFormFields values={values} onChange={setValues} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={reset}>
                Back
              </Button>
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
                {submitting ? "Joining…" : "Join clinic"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Explore clinics</DialogTitle>
              <DialogDescription>
                Browse clinics and start an end-to-end-encrypted record. The
                clinic accepts your request on its side.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {available.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No other clinics available right now.
                </p>
              ) : (
                available.map((clinic) => (
                  <div
                    key={clinic.userId}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {clinic.name}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {clinic.userId}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={!ready}
                      title={notReadyMessage(notReadyReason, t) || undefined}
                      onClick={() => setSelected(clinic)}
                    >
                      Join
                    </Button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

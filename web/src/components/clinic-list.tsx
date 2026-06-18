"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MatrixClient, Room } from "matrix-js-sdk";
import { useMatrix, usePatientInvites } from "matrix-client/react";
import { joinClinic, subscribeRooms } from "matrix-client/patients";
import { CLINICS, findClinicByUserId, type Clinic } from "@/lib/config";
import { notReadyMessage } from "@/lib/not-ready-message";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type Membership = "invite" | "join";

export type ClinicRelation = {
  clinicName: string;
  clinicUserId: string;
  roomId: string;
  roomName: string;
  membership: Membership;
};

function findClinicMember(room: Room): string | null {
  for (const clinic of CLINICS) {
    const member = room.getMember(clinic.userId);
    if (member) return clinic.userId;
  }
  return null;
}

export function listClinicRelations(client: MatrixClient): ClinicRelation[] {
  const rels: ClinicRelation[] = [];
  for (const room of client.getRooms()) {
    const membership = room.getMyMembership();
    if (membership !== "invite" && membership !== "join") continue;
    const clinicUserId = findClinicMember(room);
    if (!clinicUserId) continue;
    const clinic = findClinicByUserId(clinicUserId);
    if (!clinic) continue;
    rels.push({
      clinicName: clinic.name,
      clinicUserId,
      roomId: room.roomId,
      roomName: room.name ?? "(unnamed room)",
      membership: membership as Membership,
    });
  }
  return rels.sort((a, b) => a.clinicName.localeCompare(b.clinicName));
}

/**
 * Table of the signed-in user's clinic relations (joined records + pending
 * invites). Joined rows open the patient-side detail at /clinics/[roomId] —
 * the mirror of the clinic-side /patients/[roomId].
 */
export function ClinicRelations() {
  const { client, ready, notReadyReason } = useMatrix();
  const { accept: acceptInvite, decline: declineInvite } = usePatientInvites();
  const [relations, setRelations] = useState<ClinicRelation[]>([]);
  const [busyRoom, setBusyRoom] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    const refresh = () => setRelations(listClinicRelations(client));
    refresh();
    return subscribeRooms(client, refresh);
  }, [client]);

  const handleAccept = async (roomId: string, clinicName: string) => {
    setBusyRoom(roomId);
    try {
      await acceptInvite(roomId);
      toast.success(`Joined ${clinicName}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyRoom(null);
    }
  };

  const handleDecline = async (roomId: string) => {
    setBusyRoom(roomId);
    try {
      await declineInvite(roomId);
      toast.success("Declined.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyRoom(null);
    }
  };

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Clinic</TableHead>
            <TableHead>Clinic ID</TableHead>
            <TableHead>Room</TableHead>
            <TableHead className="w-[110px]">Status</TableHead>
            <TableHead className="w-[200px] text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {relations.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-12 text-center text-muted-foreground"
              >
                No clinics yet. When a clinic creates a record for you, it will
                appear here.
              </TableCell>
            </TableRow>
          )}
          {relations.map((rel) => {
            const busy = busyRoom === rel.roomId;
            const isInvite = rel.membership === "invite";
            return (
              <TableRow key={rel.roomId}>
                <TableCell className="font-medium">
                  {isInvite ? (
                    rel.clinicName
                  ) : (
                    <Link
                      href={`/clinics/${encodeURIComponent(rel.roomId)}`}
                      className="hover:underline"
                    >
                      {rel.clinicName}
                    </Link>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {rel.clinicUserId}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {rel.roomName}
                </TableCell>
                <TableCell>
                  <Badge variant={isInvite ? "destructive" : "default"}>
                    {isInvite ? "Invited" : "Joined"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {isInvite ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || !!busyRoom}
                          onClick={() => handleDecline(rel.roomId)}
                        >
                          {busy ? "…" : "Decline"}
                        </Button>
                        <Button
                          size="sm"
                          disabled={busy || !!busyRoom || !ready}
                          title={
                            !ready ? notReadyMessage(notReadyReason) : undefined
                          }
                          onClick={() => handleAccept(rel.roomId, rel.clinicName)}
                        >
                          {busy ? "…" : "Accept"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="icon"
                        title="Open record"
                        aria-label="Open clinic record"
                        render={
                          <Link
                            href={`/clinics/${encodeURIComponent(rel.roomId)}`}
                          >
                            <ArrowRight className="size-4" />
                          </Link>
                        }
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Modal letting a patient browse clinics they don't yet have a record with and
 * start one. "Join" is the patient-initiated mirror of the clinic's New patient
 * flow: it creates the encrypted record room, shares the patient's profile, and
 * invites the clinic — which then accepts on its side.
 */
function ExploreClinicsDialog() {
  const { client, ready, notReadyReason } = useMatrix();
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
            title={notReadyMessage(notReadyReason) || undefined}
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
                title={notReadyMessage(notReadyReason) || undefined}
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
                      title={notReadyMessage(notReadyReason) || undefined}
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

/** Full-page Clinics list — the patient-role mirror of the Patients page. */
export function ClinicList() {
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Clinics</h1>
          <p className="text-sm text-muted-foreground">
            Clinics that keep an end-to-end-encrypted record for you. Open one to
            view your record and message the clinic.
          </p>
        </div>
        <ExploreClinicsDialog />
      </header>
      <ClinicRelations />
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MatrixClient, Room } from "matrix-js-sdk";
import { useMatrix, usePatientInvites } from "matrix-client/react";
import { subscribeRooms } from "matrix-client/patients";
import { CLINICS, findClinicByUserId } from "@/lib/config";
import { notReadyMessage } from "@/lib/not-ready-message";
import { useT } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const t = useT();
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
                            !ready ? notReadyMessage(notReadyReason, t) : undefined
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

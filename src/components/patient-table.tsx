"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMatrix } from "@/lib/matrix/provider";
import {
  deletePatient,
  listPatients,
  subscribeRooms,
} from "@/lib/matrix/patients";
import type { Patient } from "@/lib/matrix/types";
import { NewPatientDialog } from "./patient-form";
import { toast } from "sonner";

function formatDate(ts: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export function PatientTable() {
  const { client, session, signOut, ready, notReadyReason, pendingBackup } =
    useMatrix();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!client) return;
    const refresh = () => setPatients(listPatients(client));
    refresh();
    return subscribeRooms(client, refresh);
  }, [client]);

  const filtered = patients.filter((p) =>
    p.record.name.toLowerCase().includes(filter.toLowerCase()),
  );

  const onDelete = async (roomId: string, name: string) => {
    if (!client || !ready) return;
    if (!confirm(`Delete patient room for ${name}? You can't undo this.`))
      return;
    try {
      await deletePatient(client, roomId);
      toast.success(`Removed ${name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-mono">{session?.userId}</span> · each row is
            an E2E-encrypted Matrix room.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={pendingBackup > 0}
            onClick={async () => {
              try {
                await signOut();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : String(err));
              }
            }}
            title={
              pendingBackup > 0
                ? `Backing up ${pendingBackup} message key${pendingBackup === 1 ? "" : "s"}… please wait`
                : undefined
            }
          >
            {pendingBackup > 0
              ? `Backing up ${pendingBackup}…`
              : "Sign out"}
          </Button>
          <NewPatientDialog />
        </div>
      </div>

      <Input
        placeholder="Filter by name…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>DOB</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[140px]">Room</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-12"
                >
                  No patients yet. Click <b>New patient</b> to create one.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => (
              <TableRow key={p.roomId}>
                <TableCell className="font-medium">
                  <Link
                    href={`/patients/${encodeURIComponent(p.roomId)}`}
                    className="hover:underline"
                  >
                    {p.record.name}
                  </Link>
                </TableCell>
                <TableCell>{p.record.dob || "—"}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {p.record.phone && <div>{p.record.phone}</div>}
                    {p.record.email && (
                      <div className="text-muted-foreground">
                        {p.record.email}
                      </div>
                    )}
                    {!p.record.phone && !p.record.email && "—"}
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {p.record.notes || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(p.record.updatedAt)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {p.roomId.slice(0, 10)}…
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon">
                          ⋯
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        render={
                          <Link
                            href={`/patients/${encodeURIComponent(p.roomId)}`}
                          >
                            Open
                          </Link>
                        }
                      />
                      <DropdownMenuItem
                        onClick={() => onDelete(p.roomId, p.record.name)}
                        variant="destructive"
                        disabled={!ready}
                        title={notReadyReason ?? undefined}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

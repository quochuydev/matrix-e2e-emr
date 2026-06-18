"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMatrix } from "matrix-client/react";
import {
  deletePatient,
  listPatients,
  subscribeRooms,
  type Patient,
} from "matrix-client/patients";
import { toast } from "sonner";
import { NewPatientDialog } from "@/components/patient-form";
import { PatientRow } from "./patient-row";
import { DeletePatientDialog } from "./delete-patient-dialog";

export function PatientTable() {
  const { client, session, ready } = useMatrix();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{
    roomId: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!client) return;
    const refresh = () => setPatients(listPatients(client));
    refresh();
    return subscribeRooms(client, refresh);
  }, [client]);

  const confirmDelete = async () => {
    if (!client || !ready || !pendingDelete) return;
    setDeleting(true);
    try {
      await deletePatient(client, pendingDelete.roomId);
      toast.success(`Removed ${pendingDelete.name}`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
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
          <NewPatientDialog />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>DOB</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[70px] text-right">Edits</TableHead>
              <TableHead className="w-[140px]">Room</TableHead>
              <TableHead className="w-[90px] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-12"
                >
                  No patients yet. Click <b>New patient</b> to create one.
                </TableCell>
              </TableRow>
            )}
            {patients.map((p) => (
              <PatientRow
                key={p.roomId}
                patient={p}
                onRequestDelete={setPendingDelete}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <DeletePatientDialog
        target={pendingDelete}
        deleting={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

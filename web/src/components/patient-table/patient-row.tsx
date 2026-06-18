"use client";

import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMatrix } from "matrix-client/react";
import {
  exportRoomEvents,
  fullName,
  listPatientHistory,
  type Patient,
} from "matrix-client/patients";
import { notReadyMessage } from "@/lib/not-ready-message";
import { useT } from "@/lib/i18n";
import { downloadJson, formatDate, slugify } from "./export-utils";

export function PatientRow({
  patient: p,
  onRequestDelete,
}: {
  patient: Patient;
  onRequestDelete: (target: { roomId: string; name: string }) => void;
}) {
  const { client, ready, notReadyReason } = useMatrix();
  const t = useT();

  const onExport = () => {
    if (!client) return;
    const history = listPatientHistory(client, p.roomId);
    const events = exportRoomEvents(client, p.roomId);
    downloadJson(
      `patient-${slugify(fullName(p.record))}-${p.roomId.slice(1, 11)}.json`,
      {
        exportedAt: new Date().toISOString(),
        roomId: p.roomId,
        record: p.record,
        history,
        events,
      },
    );
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          href={`/patients/${encodeURIComponent(p.roomId)}`}
          className="hover:underline"
        >
          {fullName(p.record)}
        </Link>
      </TableCell>
      <TableCell>{p.record.dob || "—"}</TableCell>
      <TableCell>
        <div className="text-sm">
          {p.record.phone && <div>{p.record.phone}</div>}
          {p.record.email && (
            <div className="text-muted-foreground">{p.record.email}</div>
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
      <TableCell className="text-right font-mono text-sm text-muted-foreground">
        {p.record.updatedTimes}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="font-mono text-xs">
          {p.roomId.slice(0, 10)}…
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
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
                  <Link href={`/patients/${encodeURIComponent(p.roomId)}`}>
                    Edit
                  </Link>
                }
              />
              <DropdownMenuItem onClick={onExport}>
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onRequestDelete({
                    roomId: p.roomId,
                    name: fullName(p.record),
                  })
                }
                variant="destructive"
                disabled={!ready}
                title={notReadyMessage(notReadyReason, t) || undefined}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

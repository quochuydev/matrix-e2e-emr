"use client";

import {
  Calendar,
  Clock,
  FileText,
  Hash,
  Mail,
  Pencil,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  fullName,
  type PatientMember,
  type PatientRecord,
} from "matrix-client/patients";
import { Badge } from "@/components/ui/badge";
import { EditPatientDialog } from "@/components/patient-form";

function recordInitials(r: { firstName: string; lastName: string }): string {
  const a = (r.firstName?.[0] ?? "").toUpperCase();
  const b = (r.lastName?.[0] ?? "").toUpperCase();
  return a + b || "?";
}

function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 200 ? age : null;
}

function RecordField({
  icon: Icon,
  label,
  value,
  mono,
  multiline,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="flex gap-3 px-6 py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd
          className={`mt-0.5 ${mono ? "font-mono text-xs break-all" : ""} ${
            multiline ? "whitespace-pre-wrap" : "truncate"
          }`}
        >
          {value || "—"}
        </dd>
      </div>
    </div>
  );
}

export function PatientRecordCard({
  record: r,
  roomId,
  members,
}: {
  record: PatientRecord;
  roomId: string;
  members: PatientMember[];
}) {
  const age = ageFromDob(r.dob);
  const editInitial = {
    firstName: r.firstName ?? "",
    lastName: r.lastName ?? "",
    dob: r.dob ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    notes: r.notes ?? "",
  };

  return (
    <div className="shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-start gap-4 p-6">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-lg font-semibold text-white shadow-sm">
          {recordInitials(r)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{fullName(r)}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>Patient record</span>
            {age !== null && (
              <>
                <span aria-hidden>·</span>
                <span>{age} yrs</span>
              </>
            )}
          </div>
          {members.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {members.map((m) => (
                <span
                  key={m.userId}
                  className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"
                  title={m.userId}
                >
                  <User className="size-3 shrink-0" />
                  <span className="truncate">{m.userId}</span>
                  {m.membership === "invite" && (
                    <span className="font-sans text-[10px] text-amber-600">
                      invited
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="size-3" />
              End-to-end encrypted
            </Badge>
          </div>
        </div>
        <EditPatientDialog roomId={roomId} initial={editInitial} />
      </div>
      <dl className="divide-y border-t text-sm">
        <RecordField icon={Calendar} label="Date of birth" value={r.dob} />
        <RecordField icon={Phone} label="Phone" value={r.phone} />
        <RecordField icon={Mail} label="Email" value={r.email} />
        <RecordField
          icon={Clock}
          label="Last updated"
          value={r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ""}
        />
        <RecordField
          icon={Pencil}
          label="Times updated"
          value={String(r.updatedTimes)}
        />
        <RecordField icon={FileText} label="Notes" value={r.notes} multiline />
        <RecordField icon={Hash} label="Room" value={roomId} mono />
      </dl>
    </div>
  );
}

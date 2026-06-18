"use client";

import { useMemo } from "react";
import { useMatrix } from "matrix-client/react";
import { findClinicByUserId, isClinicUser } from "@/lib/config";
import { Badge } from "@/components/ui/badge";

function initialsOf(userId: string | undefined): string {
  if (!userId) return "?";
  const local = userId.replace(/^@/, "").split(":")[0] ?? "";
  const letters = local.replace(/[^a-zA-Z]/g, "");
  return (letters.slice(0, 2) || local.slice(0, 1) || "?").toUpperCase();
}

export function PatientAccount() {
  const { session } = useMatrix();

  const userIsClinic = isClinicUser(session?.userId);
  const ownClinic = useMemo(
    () => findClinicByUserId(session?.userId),
    [session?.userId],
  );

  const local = session?.userId?.replace(/^@/, "").split(":")[0] ?? "—";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">Your account</h1>
        <p className="text-sm text-muted-foreground">
          Your Matrix identity and the device this session runs on.
        </p>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-lg font-semibold text-white shadow-sm">
            {initialsOf(session?.userId)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">{local}</div>
            <div className="mt-1">
              {userIsClinic ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <Badge>Clinic</Badge>
                  <span className="text-sm text-muted-foreground">
                    {ownClinic?.name}
                  </span>
                </span>
              ) : (
                <Badge variant="secondary">Patient</Badge>
              )}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-x-8 gap-y-4 border-t pt-6 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">User ID</dt>
            <dd className="font-mono text-sm break-all">
              {session?.userId ?? "—"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">Device</dt>
            <dd className="font-mono text-sm break-all">
              {session?.deviceId ?? "—"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">Homeserver</dt>
            <dd className="font-mono text-sm break-all">
              {session?.baseUrl ?? "—"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd className="text-sm">
              {userIsClinic ? (ownClinic?.name ?? "Clinic") : "Patient"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

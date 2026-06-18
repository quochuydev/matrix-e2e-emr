"use client";

import { ClinicRelations } from "./relations";
import { ExploreClinicsDialog } from "./explore-clinics-dialog";

export { listClinicRelations, type ClinicRelation } from "./relations";

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

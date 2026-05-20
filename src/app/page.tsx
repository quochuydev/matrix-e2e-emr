import { AppShell } from "@/components/app-shell";
import { PatientTable } from "@/components/patient-table";

export default function Home() {
  return (
    <AppShell>
      <PatientTable />
    </AppShell>
  );
}

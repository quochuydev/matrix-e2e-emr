import { AppShell } from "@/components/app-shell";
import { PatientDetail } from "@/components/patient-detail";

export default async function ClinicRecordPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return (
    <AppShell>
      <PatientDetail
        roomId={decodeURIComponent(roomId)}
        backHref="/clinics"
        backLabel="Back to clinics"
      />
    </AppShell>
  );
}

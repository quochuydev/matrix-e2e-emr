"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MatrixEvent } from "matrix-js-sdk";
import { useMatrix } from "matrix-client/react";
import { useT } from "@/lib/i18n";
import {
  getPatient,
  getPatientMembers,
  listMessages,
  listPatientHistory,
  subscribeRooms,
  type Patient,
  type PatientMember,
  type PatientRecordRevision,
} from "matrix-client/patients";
import { PatientRecordCard } from "./record-card";
import { ProfileHistory } from "./profile-history";
import { PatientTimeline } from "./timeline";

export function PatientDetail({
  roomId,
  backHref = "/",
}: {
  roomId: string;
  backHref?: string;
}) {
  const { client, session } = useMatrix();
  const t = useT();
  const backLabel = backHref.startsWith("/patients")
    ? t("patientDetail.backToPatients")
    : backHref.startsWith("/clinics")
      ? t("patientDetail.backToClinics")
      : t("patientDetail.back");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [members, setMembers] = useState<PatientMember[]>([]);
  const [messages, setMessages] = useState<MatrixEvent[]>([]);
  const [history, setHistory] = useState<PatientRecordRevision[]>([]);

  useEffect(() => {
    if (!client) return;
    const refresh = () => {
      setPatient(getPatient(client, roomId));
      setMembers(getPatientMembers(client, roomId));
      setMessages(listMessages(client, roomId));
      setHistory(listPatientHistory(client, roomId));
    };
    refresh();
    return subscribeRooms(client, refresh);
  }, [client, roomId]);

  if (!patient) {
    return (
      <div className="text-muted-foreground">{t("patientDetail.loading")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; {backLabel}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_7fr] lg:items-start">
        <div className="flex flex-col gap-6 lg:sticky lg:top-20 lg:h-[calc(100dvh-10rem)]">
          <PatientRecordCard
            record={patient.record}
            roomId={roomId}
            members={members}
          />
          <ProfileHistory
            history={history}
            currentSelf={session?.userId ?? null}
          />
        </div>

        <PatientTimeline roomId={roomId} messages={messages} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MatrixEvent } from "matrix-js-sdk";
import { useMatrix } from "@/lib/matrix/provider";
import {
  getPatient,
  listMessages,
  listPatientHistory,
  sendMessage,
  subscribeRooms,
} from "@/lib/matrix/patients";
import type { Patient, PatientRecordRevision } from "@/lib/matrix/types";
import {
  decryptReason,
  pullBackupKeys,
  retryDecrypt,
} from "@/lib/matrix/decryption";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EditPatientDialog } from "./patient-form";
import { toast } from "sonner";

export function PatientDetail({ roomId }: { roomId: string }) {
  const { client, session, ready, notReadyReason } = useMatrix();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [messages, setMessages] = useState<MatrixEvent[]>([]);
  const [history, setHistory] = useState<PatientRecordRevision[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!client) return;
    const refresh = () => {
      setPatient(getPatient(client, roomId));
      setMessages(listMessages(client, roomId));
      setHistory(listPatientHistory(client, roomId));
    };
    refresh();
    return subscribeRooms(client, refresh);
  }, [client, roomId]);

  const editInitial = useMemo(() => {
    const r = patient?.record;
    return {
      name: r?.name ?? "",
      dob: r?.dob ?? "",
      phone: r?.phone ?? "",
      email: r?.email ?? "",
      notes: r?.notes ?? "",
    };
  }, [patient]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !ready || !text.trim()) return;
    setSending(true);
    try {
      await sendMessage(client, roomId, text.trim());
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  if (!patient) {
    return (
      <div className="text-muted-foreground">
        Loading room… If this persists, the room may not be synced yet.
      </div>
    );
  }

  const r = patient.record;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to patients
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[6fr_4fr] lg:items-start">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{r.name}</h1>
              <div className="text-xs text-muted-foreground font-mono mt-1">
                {roomId}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <EditPatientDialog roomId={roomId} initial={editInitial} />
              <Badge>E2E encrypted</Badge>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Date of birth</dt>
              <dd>{r.dob || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{r.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{r.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>
                {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="whitespace-pre-wrap">{r.notes || "—"}</dd>
            </div>
          </dl>
        </div>

        <ProfileHistory
          history={history}
          currentSelf={session?.userId ?? null}
        />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Encrypted timeline</h2>
          <p className="text-xs text-muted-foreground">
            Messages are visible only to members of this room.
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto p-4 space-y-2 text-sm">
          {messages.length === 0 && (
            <div className="text-muted-foreground text-center py-8">
              No messages yet.
            </div>
          )}
          {messages.map((ev) => {
            const sender = ev.getSender();
            const isMe = sender === session?.userId;
            const failed = ev.isDecryptionFailure();
            const content = ev.getContent() as {
              body?: string;
              msgtype?: string;
            };
            const body = content.body ?? "";
            return (
              <div
                key={ev.getId()}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    failed
                      ? "bg-destructive/10 text-destructive"
                      : isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                  }`}
                >
                  {!isMe && !failed && (
                    <div className="text-xs opacity-70 mb-1">{sender}</div>
                  )}
                  {failed ? (
                    <div className="space-y-1">
                      <div className="text-xs font-medium">
                        Can&apos;t decrypt
                      </div>
                      <div className="text-xs opacity-90">
                        {decryptReason(ev)}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-xs underline opacity-80 hover:opacity-100"
                          onClick={async () => {
                            console.log("[retry] clicked", {
                              eventId: ev.getId(),
                              reason: ev.decryptionFailureReason,
                            });
                            if (!client) return;
                            try {
                              const r = await retryDecrypt(client, roomId);
                              if (r.recovered > 0) {
                                toast.success(
                                  `Recovered ${r.recovered} message${
                                    r.recovered === 1 ? "" : "s"
                                  }.`,
                                );
                              } else if (
                                ev.decryptionFailureReason?.startsWith(
                                  "HISTORICAL_MESSAGE_BACKUP",
                                )
                              ) {
                                toast.info(
                                  "Still locked. Unlock with your recovery key in the amber banner above.",
                                );
                              } else {
                                toast.info(
                                  `No progress. ${r.failedAfter} message${
                                    r.failedAfter === 1 ? "" : "s"
                                  } still undecryptable.`,
                                );
                              }
                            } catch (err) {
                              toast.error(
                                err instanceof Error ? err.message : String(err),
                              );
                            }
                          }}
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          className="text-xs underline opacity-80 hover:opacity-100"
                          onClick={async () => {
                            if (!client) return;
                            try {
                              const r = await pullBackupKeys(client, roomId);
                              if (r.recovered > 0) {
                                toast.success(
                                  `Pulled ${r.imported} key${
                                    r.imported === 1 ? "" : "s"
                                  } from backup. Recovered ${r.recovered} message${
                                    r.recovered === 1 ? "" : "s"
                                  }.`,
                                );
                              } else if (r.imported > 0) {
                                toast.info(
                                  `Pulled ${r.imported} keys from backup but none decrypted this room. Sender may not have uploaded the missing session.`,
                                );
                              } else {
                                toast.info(
                                  "Backup has no new keys to pull. The sender may not have uploaded this message's session.",
                                );
                              }
                            } catch (err) {
                              toast.error(
                                err instanceof Error ? err.message : String(err),
                              );
                            }
                          }}
                        >
                          Pull from backup
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">
                      {body}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={onSend} className="border-t p-3 flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ready ? "Type a message…" : (notReadyReason ?? "Not ready")}
            disabled={sending || !ready}
            title={notReadyReason ?? undefined}
          />
          <Button
            type="submit"
            disabled={sending || !text.trim() || !ready}
            title={notReadyReason ?? undefined}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

const RECORD_FIELDS = ["name", "dob", "phone", "email", "notes"] as const;
type RecordField = (typeof RECORD_FIELDS)[number];

function diffRevisions(
  current: PatientRecordRevision,
  previous: PatientRecordRevision | null,
): { field: RecordField; from: string; to: string }[] {
  if (!previous) return [];
  const out: { field: RecordField; from: string; to: string }[] = [];
  for (const f of RECORD_FIELDS) {
    const a = (previous[f] ?? "") as string;
    const b = (current[f] ?? "") as string;
    if (a !== b) out.push({ field: f, from: a, to: b });
  }
  return out;
}

function ProfileHistory({
  history,
  currentSelf,
}: {
  history: PatientRecordRevision[];
  currentSelf: string | null;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">Profile history</h2>
        <p className="text-xs text-muted-foreground">
          {history.length === 0
            ? "No revisions yet."
            : `${history.length} revision${history.length === 1 ? "" : "s"} — newest first`}
        </p>
      </div>
      {history.length > 0 && (
        <ol className="divide-y max-h-[480px] overflow-y-auto">
          {history.map((rev, i) => {
            const previous = history[i + 1] ?? null;
            const changes = diffRevisions(rev, previous);
            const isMe = rev.sender === currentSelf;
            return (
              <li key={rev.eventId} className="px-4 py-3 text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {new Date(rev.ts).toLocaleString()}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {isMe ? "you" : rev.sender}
                    </span>
                  </div>
                  {rev.isRoot && (
                    <Badge variant="secondary" className="text-xs">
                      Initial
                    </Badge>
                  )}
                </div>
                {rev.isRoot || !previous ? (
                  <div className="text-muted-foreground">
                    Created with name <span className="font-medium">{rev.name}</span>
                    .
                  </div>
                ) : changes.length === 0 ? (
                  <div className="text-muted-foreground italic">
                    No field changes (resaved).
                  </div>
                ) : (
                  <ul className="space-y-0.5">
                    {changes.map((c) => (
                      <li key={c.field} className="font-mono text-xs">
                        <span className="text-muted-foreground">{c.field}: </span>
                        <span className="line-through text-muted-foreground/70">
                          {c.from || "∅"}
                        </span>
                        <span className="mx-1">→</span>
                        <span>{c.to || "∅"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

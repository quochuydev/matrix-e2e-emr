"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  FileText,
  Hash,
  Mail,
  Paperclip,
  Pencil,
  Phone,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { MatrixEvent } from "matrix-js-sdk";
import { useMatrix, usePeerKeyShareState } from "matrix-client/react";
import { requestKeyFromPeers } from "matrix-client";
import {
  fullName,
  getPatient,
  listMessages,
  listPatientHistory,
  redactMessage,
  sendImageMessage,
  sendMessage,
  subscribeRooms,
  type Patient,
  type PatientRecordRevision,
} from "matrix-client/patients";
import { notReadyMessage } from "@/lib/not-ready-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditPatientDialog } from "./patient-form";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchAndDecryptImage,
  uploadEncryptedImage,
  type EncryptedFile,
} from "@/lib/media";
import { toast } from "sonner";

function HiddenJson({ value }: { value: unknown }) {
  let json: string;
  try {
    json = JSON.stringify(value, null, 2);
  } catch (err) {
    json = `// could not stringify: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
  return (
    <div className="hidden" data-event-json>
      {json}
    </div>
  );
}

type MessageContent = {
  body?: string;
  msgtype?: string;
  filename?: string;
  info?: { mimetype?: string };
  file?: EncryptedFile;
};

/**
 * Renders an encrypted m.image attachment: fetches the ciphertext from R2 via
 * /api/media, decrypts it client-side, and shows the resulting blob. Revokes
 * the object URL on unmount.
 */
function EncryptedImage({
  file,
  roomId,
  mimetype,
  name,
}: {
  file: EncryptedFile;
  roomId: string;
  mimetype?: string;
  name: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    fetchAndDecryptImage(file, roomId, mimetype || "image/png")
      .then((u) => {
        if (!active) {
          URL.revokeObjectURL(u);
          return;
        }
        created = u;
        setUrl(u);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
    // file.url uniquely identifies the object; key/iv are stable for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.url, roomId, mimetype]);

  if (error) {
    return (
      <div className="text-xs">
        <div className="font-medium">{name}</div>
        <div className="opacity-70">Couldn&apos;t load image: {error}</div>
      </div>
    );
  }
  if (!url) {
    return <div className="text-xs opacity-70">Loading {name}…</div>;
  }
  return (
    // Blob object URL — next/image isn't applicable here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      className="max-h-64 max-w-full rounded-md"
    />
  );
}

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

export function PatientDetail({
  roomId,
  backHref = "/",
  backLabel = "Back to patients",
}: {
  roomId: string;
  backHref?: string;
  backLabel?: string;
}) {
  const { client, session, ready, notReadyReason } = useMatrix();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [messages, setMessages] = useState<MatrixEvent[]>([]);
  const [history, setHistory] = useState<PatientRecordRevision[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      firstName: r?.firstName ?? "",
      lastName: r?.lastName ?? "",
      dob: r?.dob ?? "",
      phone: r?.phone ?? "",
      email: r?.email ?? "",
      notes: r?.notes ?? "",
    };
  }, [patient]);

  const onSend = async (e: React.FormEvent | React.KeyboardEvent) => {
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

  const confirmDelete = async () => {
    if (!client || !ready || !pendingDelete) return;
    setDeleting(true);
    try {
      await redactMessage(client, roomId, pendingDelete);
      toast.success("Message deleted");
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!picked || !client || !ready) return;
    setUploading(true);
    try {
      const meta = await uploadEncryptedImage(roomId, picked);
      await sendImageMessage(client, roomId, meta);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
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
  const age = ageFromDob(r.dob);

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
          <div className="shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-start gap-4 p-6">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-lg font-semibold text-white shadow-sm">
                {recordInitials(r)}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-semibold">
                  {fullName(r)}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>Patient record</span>
                  {age !== null && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{age} yrs</span>
                    </>
                  )}
                </div>
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
                value={
                  r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ""
                }
              />
              <RecordField
                icon={Pencil}
                label="Times updated"
                value={String(r.updatedTimes)}
              />
              <RecordField
                icon={FileText}
                label="Notes"
                value={r.notes}
                multiline
              />
              <RecordField icon={Hash} label="Room" value={roomId} mono />
            </dl>
          </div>

          <ProfileHistory
            history={history}
            currentSelf={session?.userId ?? null}
          />
        </div>

        <div className="flex h-[70dvh] flex-col rounded-lg border bg-card lg:sticky lg:top-20 lg:h-[calc(100dvh-10rem)]">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Encrypted timeline</h2>
            <p className="text-xs text-muted-foreground">
              Messages are visible only to members of this room.
            </p>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 text-sm">
            <div className="mt-auto space-y-2">
            {messages.length === 0 && (
              <div className="text-muted-foreground text-center py-8">
                No messages yet.
              </div>
            )}
            {messages.map((ev) => {
              const sender = ev.getSender();
              const isMe = sender === session?.userId;
              if (ev.isRedacted()) {
                return (
                  <div
                    key={ev.getId()}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className="rounded-lg border border-dashed px-3 py-1.5 text-xs italic text-muted-foreground">
                      Message deleted
                    </div>
                  </div>
                );
              }
              if (ev.isDecryptionFailure()) {
                return (
                  <UndecryptableMessage
                    key={ev.getId()}
                    event={ev}
                    isMe={isMe}
                  />
                );
              }
              const content = ev.getContent() as MessageContent;
              const body = content.body ?? "";
              const imageFile =
                content.msgtype === "m.image" && content.file?.url
                  ? content.file
                  : null;
              return (
                <div
                  key={ev.getId()}
                  className={`group flex items-center gap-1 ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  {isMe && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete message"
                      title="Delete message"
                      disabled={!ready}
                      onClick={() => setPendingDelete(ev.getId() ?? null)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {!isMe && (
                      <div className="text-xs opacity-70 mb-1">{sender}</div>
                    )}
                    {imageFile ? (
                      <EncryptedImage
                        file={imageFile}
                        roomId={roomId}
                        mimetype={content.info?.mimetype}
                        name={content.body || content.filename || "image"}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap break-words">
                        {body}
                      </div>
                    )}
                    <HiddenJson value={ev.getEffectiveEvent()} />
                  </div>
                </div>
              );
            })}
            </div>
          </div>
          <form onSubmit={onSend} className="flex items-end gap-2 border-t p-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!ready || uploading || sending}
              title={
                ready ? "Attach image" : notReadyMessage(notReadyReason) || undefined
              }
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
            </Button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend(e);
                }
              }}
              rows={1}
              placeholder={
                uploading
                  ? "Uploading image…"
                  : ready
                    ? "Type a message… (Shift+Enter for a new line)"
                    : notReadyMessage(notReadyReason) || "Not ready"
              }
              disabled={sending || uploading || !ready}
              title={notReadyMessage(notReadyReason) || undefined}
              className="flex max-h-40 min-h-9 w-full flex-1 resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
            />
            <Button
              type="submit"
              disabled={sending || uploading || !text.trim() || !ready}
              title={notReadyMessage(notReadyReason) || undefined}
            >
              Send
            </Button>
          </form>
        </div>
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Delete message?</DialogTitle>
            <DialogDescription>
              This redacts the message for everyone in the room. The content
              can&apos;t be recovered.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" type="button" disabled={deleting} />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || !ready}
              onClick={confirmDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const FAILURE_HINTS: Record<string, string> = {
  MEGOLM_UNKNOWN_INBOUND_SESSION_ID:
    "This device never received the session key. The sender likely hasn't (yet) uploaded it to backup, or didn't share it with this device.",
  MEGOLM_KEY_WITHHELD:
    "The sender explicitly refused to share the session key with this device.",
  MEGOLM_KEY_WITHHELD_FOR_UNVERIFIED_DEVICE:
    "The sender refused to share the key because this device isn't verified.",
  OLM_UNKNOWN_MESSAGE_INDEX:
    "We have the session, but it was shared at a later ratchet index than this message. The earlier ratchet is only retrievable from key backup.",
  HISTORICAL_MESSAGE_NO_KEY_BACKUP:
    "Sent before this device logged in, and there's no key backup on the server.",
  HISTORICAL_MESSAGE_BACKUP_UNCONFIGURED:
    "Sent before this device logged in. A backup exists, but this device doesn't have the backup decryption key.",
  HISTORICAL_MESSAGE_WORKING_BACKUP:
    "Sent before this device logged in. Backup is working but the key hasn't been fetched yet (or isn't in backup).",
  HISTORICAL_MESSAGE_USER_NOT_JOINED:
    "Sent when this user wasn't a member of the room.",
  SENDER_IDENTITY_PREVIOUSLY_VERIFIED:
    "Sender's identity changed after previously being verified.",
  UNSIGNED_SENDER_DEVICE: "Sender's device isn't cross-signed.",
  UNKNOWN_SENDER_DEVICE: "Sender's device is unknown.",
  UNKNOWN_ERROR: "Unclassified decryption error.",
};

function UndecryptableMessage({
  event,
  isMe,
}: {
  event: MatrixEvent;
  isMe: boolean;
}) {
  const { client } = useMatrix();
  const wire = event.getWireContent() as {
    session_id?: string;
    sender_key?: string;
    device_id?: string;
    algorithm?: string;
  };
  const code = event.decryptionFailureReason ?? "UNKNOWN_ERROR";
  const hint = FAILURE_HINTS[code] ?? "";
  const eventId = event.getId() ?? "";
  const sender = event.getSender() ?? "";
  const ts = event.getTs();
  const sessionId = wire.session_id;
  const senderKey = wire.sender_key;
  const roomId = event.getRoomId();

  const peerState = usePeerKeyShareState(sessionId);

  useEffect(() => {
    if (!client) return;
    if (!sender || !sessionId || !senderKey || !roomId) return;
    void requestKeyFromPeers(client, {
      fromUserId: sender,
      roomId,
      sessionId,
      senderKey,
    });
  }, [client, sender, sessionId, senderKey, roomId]);

  const lines = [
    `code:       ${code}`,
    `event_id:   ${eventId}`,
    `sender:     ${sender}`,
    `device_id:  ${wire.device_id ?? "—"}`,
    `session_id: ${wire.session_id ?? "—"}`,
    `sender_key: ${wire.sender_key ?? "—"}`,
    `algorithm:  ${wire.algorithm ?? "—"}`,
    `timestamp:  ${ts ? new Date(ts).toISOString() : "—"}`,
  ];
  const block = lines.join("\n");
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(block);
      toast.success("Diagnostic copied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };
  const peerLine = peerKeyShareLine(peerState);
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%] rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs">
            Unable to decrypt
          </Badge>
          <span className="font-mono text-xs">{code}</span>
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        {peerLine && (
          <div className="text-xs text-muted-foreground">{peerLine}</div>
        )}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onCopy}
          >
            Copy diagnostic
          </Button>
        </div>
        <HiddenJson value={event.getEffectiveEvent()} />
      </div>
    </div>
  );
}

function peerKeyShareLine(
  state: ReturnType<typeof usePeerKeyShareState>,
): string | null {
  switch (state.kind) {
    case "idle":
      return "peer-share: idle (request not fired)";
    case "requesting":
      return "⟳ Asking your other devices for this key…";
    case "received":
      return "↓ Got the key, decrypting…";
    case "imported":
      return "✓ Key imported";
    case "no-responders":
      return "No other devices online to ask";
    case "timeout":
      return "No reply from your other devices";
    case "error":
      return `Key share failed: ${state.message}`;
    default:
      return null;
  }
}

const RECORD_FIELDS = [
  "firstName",
  "lastName",
  "dob",
  "phone",
  "email",
  "notes",
] as const;
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
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border bg-card">
      <div className="shrink-0 border-b px-4 py-3">
        <h2 className="font-semibold">Profile history</h2>
        <p className="text-xs text-muted-foreground">
          {history.length === 0
            ? "No revisions yet."
            : `${history.length} revision${history.length === 1 ? "" : "s"} — newest first`}
        </p>
      </div>
      {history.length > 0 && (
        <ol className="min-h-0 flex-1 divide-y overflow-y-auto">
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
                    Created with name{" "}
                    <span className="font-medium">{fullName(rev)}</span>.
                  </div>
                ) : changes.length === 0 ? (
                  <div className="text-muted-foreground italic">
                    No field changes (resaved).
                  </div>
                ) : (
                  <ul className="space-y-0.5">
                    {changes.map((c) => (
                      <li key={c.field} className="font-mono text-xs">
                        <span className="text-muted-foreground">
                          {c.field}:{" "}
                        </span>
                        <span className="line-through text-muted-foreground/70">
                          {c.from || "∅"}
                        </span>
                        <span className="mx-1">→</span>
                        <span>{c.to || "∅"}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <HiddenJson value={rev} />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

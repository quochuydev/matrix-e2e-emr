import type { MatrixEvent, MatrixClient } from "matrix-js-sdk";

export async function requestMissingKey(
  client: MatrixClient,
  ev: MatrixEvent,
): Promise<void> {
  const eventId = ev.getId();
  const reason = ev.decryptionFailureReason;
  console.log("[requestMissingKey] start", { eventId, reason });
  const fn = (
    client as unknown as {
      cancelAndResendEventRoomKeyRequest?: (event: MatrixEvent) => Promise<void>;
    }
  ).cancelAndResendEventRoomKeyRequest;
  if (typeof fn !== "function") {
    throw new Error(
      "cancelAndResendEventRoomKeyRequest is not available on this client.",
    );
  }
  await fn.call(client, ev);
  console.log("[requestMissingKey] sent", { eventId });
}

const REASONS: Record<string, string> = {
  MEGOLM_UNKNOWN_INBOUND_SESSION_ID:
    "No key for this message. Try unlocking with your recovery key.",
  MEGOLM_KEY_WITHHELD: "The sender refused to share the key with this device.",
  MEGOLM_KEY_WITHHELD_FOR_UNVERIFIED_DEVICE:
    "The sender withheld the key because this device is unverified.",
  OLM_UNKNOWN_MESSAGE_INDEX:
    "Key arrived too late. Waiting for an earlier ratchet state.",
  HISTORICAL_MESSAGE_NO_KEY_BACKUP:
    "Sent before this device existed. No key backup on the server.",
  HISTORICAL_MESSAGE_BACKUP_UNCONFIGURED:
    "Sent before this device existed. Enter your recovery key to fetch keys from backup.",
  HISTORICAL_MESSAGE_WORKING_BACKUP:
    "Sent before this device existed. Restoring from backup…",
  HISTORICAL_MESSAGE_USER_NOT_JOINED:
    "Sent before you joined the room.",
  SENDER_IDENTITY_PREVIOUSLY_VERIFIED:
    "Sender's identity changed since you last verified them.",
  UNSIGNED_SENDER_DEVICE: "Sender device isn't cross-signed.",
  UNKNOWN_SENDER_DEVICE: "Couldn't identify the sender's device.",
  UNKNOWN_ERROR: "Couldn't decrypt this message.",
};

export function decryptReason(ev: MatrixEvent): string {
  const code = ev.decryptionFailureReason as string | null;
  if (code && REASONS[code]) return REASONS[code];
  return code ?? "Couldn't decrypt this message.";
}

export type RetryDecryptResult = {
  failedBefore: number;
  failedAfter: number;
  recovered: number;
};

export async function retryDecrypt(
  client: MatrixClient,
  roomId: string,
): Promise<RetryDecryptResult> {
  const room = client.getRoom(roomId);
  if (!room) {
    console.warn("[retryDecrypt] room not found", roomId);
    return { failedBefore: 0, failedAfter: 0, recovered: 0 };
  }

  const countFailed = () =>
    room
      .getLiveTimeline()
      .getEvents()
      .filter((e) => e.isDecryptionFailure()).length;

  const failedBefore = countFailed();
  console.log("[retryDecrypt] start", { roomId, failedBefore });
  await room.decryptAllEvents();
  const failedAfter = countFailed();
  const recovered = Math.max(0, failedBefore - failedAfter);
  console.log("[retryDecrypt] done", { failedBefore, failedAfter, recovered });
  return { failedBefore, failedAfter, recovered };
}

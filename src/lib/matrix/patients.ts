"use client";

import {
  ClientEvent,
  EventType,
  MatrixEventEvent,
  MsgType,
  RoomEvent,
  type MatrixClient,
  type MatrixEvent,
  type Room,
} from "matrix-js-sdk";
import { CryptoEvent } from "matrix-js-sdk/lib/crypto-api";
import {
  PATIENT_RECORD_EVENT_TYPE,
  PATIENT_TAG,
  PROFILE_THREAD_STATE_TYPE,
  type Patient,
  type PatientRecord,
  type PatientRecordRevision,
} from "./types";

type ThreadRelation = {
  rel_type: "m.thread";
  event_id: string;
};

type RecordContent = Partial<PatientRecord> & {
  "m.relates_to"?: ThreadRelation;
};

function sendCustomEvent(
  client: MatrixClient,
  roomId: string,
  eventType: string,
  content: Record<string, unknown>,
): Promise<{ event_id: string }> {
  return (
    client.sendEvent as unknown as (
      roomId: string,
      eventType: string,
      content: Record<string, unknown>,
    ) => Promise<{ event_id: string }>
  )(roomId, eventType, content);
}

async function waitForBackupDrain(
  client: MatrixClient,
  timeoutMs = 30_000,
): Promise<void> {
  return new Promise((resolve) => {
    const handler = (remaining: number) => {
      if (remaining === 0) {
        client.off(CryptoEvent.KeyBackupSessionsRemaining, handler);
        resolve();
      }
    };
    client.on(CryptoEvent.KeyBackupSessionsRemaining, handler);
    setTimeout(() => {
      client.off(CryptoEvent.KeyBackupSessionsRemaining, handler);
      resolve();
    }, timeoutMs);
  });
}

async function ensureSessionInBackup(client: MatrixClient): Promise<void> {
  const crypto = client.getCrypto();
  if (!crypto) return;
  const activeVersion = await crypto.getActiveSessionBackupVersion();
  if (!activeVersion) return; // backup not active — nothing we can do here
  const backupManager = (crypto as unknown as {
    backupManager?: { maybeUploadKey?: () => Promise<void> };
  }).backupManager;
  await backupManager?.maybeUploadKey?.();
  await waitForBackupDrain(client);
}

function sendCustomStateEvent(
  client: MatrixClient,
  roomId: string,
  eventType: string,
  content: Record<string, unknown>,
  stateKey = "",
): Promise<{ event_id: string }> {
  return (
    client.sendStateEvent as unknown as (
      roomId: string,
      eventType: string,
      content: Record<string, unknown>,
      stateKey: string,
    ) => Promise<{ event_id: string }>
  )(roomId, eventType, content, stateKey);
}

export function getProfileThreadRoot(
  client: MatrixClient,
  roomId: string,
): string | null {
  const room = client.getRoom(roomId);
  if (!room) return null;
  const state = room.currentState.getStateEvents(
    PROFILE_THREAD_STATE_TYPE,
    "",
  );
  if (!state) return null;
  const content = state.getContent() as { rootEventId?: string };
  return content.rootEventId ?? null;
}

function isPatientRoom(room: Room): boolean {
  const tags = room.tags ?? {};
  return Object.prototype.hasOwnProperty.call(tags, PATIENT_TAG);
}

function latestRecordFromRoom(room: Room): PatientRecord | null {
  const events = room.getLiveTimeline().getEvents();
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.getType() === PATIENT_RECORD_EVENT_TYPE) {
      const content = ev.getContent() as Partial<PatientRecord>;
      if (content && typeof content.name === "string") {
        return {
          name: content.name,
          dob: content.dob,
          phone: content.phone,
          email: content.email,
          notes: content.notes,
          updatedAt: content.updatedAt ?? ev.getTs(),
        };
      }
    }
  }
  return null;
}

export function listPatients(client: MatrixClient): Patient[] {
  return client
    .getRooms()
    .filter(isPatientRoom)
    .map<Patient>((room) => {
      const record = latestRecordFromRoom(room);
      return {
        roomId: room.roomId,
        record: record ?? {
          name: room.name ?? "(unknown)",
          updatedAt: 0,
        },
      };
    })
    .sort((a, b) => a.record.name.localeCompare(b.record.name));
}

export async function createPatient(
  client: MatrixClient,
  input: Omit<PatientRecord, "updatedAt">,
): Promise<string> {
  const { room_id: roomId } = await client.createRoom({
    name: input.name,
    visibility: "private" as never,
    preset: "private_chat" as never,
    initial_state: [
      {
        type: "m.room.encryption",
        state_key: "",
        content: { algorithm: "m.megolm.v1.aes-sha2" },
      },
    ],
  });

  await client.setRoomTag(roomId, PATIENT_TAG, { order: Date.now() });

  // Make sure crypto knows about every device of our user (Element sessions etc.)
  // before sending the first encrypted event into this brand-new room; otherwise
  // the Megolm session keys are not shared with those devices and they show
  // "Unable to decrypt".
  const crypto = client.getCrypto();
  const userId = client.getUserId();
  if (crypto && userId) {
    try {
      await crypto.getUserDeviceInfo([userId], true);
    } catch {
      /* non-fatal */
    }
  }

  const record: PatientRecord = { ...input, updatedAt: Date.now() };
  const { event_id: rootEventId } = await sendCustomEvent(
    client,
    roomId,
    PATIENT_RECORD_EVENT_TYPE,
    record as unknown as Record<string, unknown>,
  );

  await sendCustomStateEvent(client, roomId, PROFILE_THREAD_STATE_TYPE, {
    rootEventId,
  });

  await ensureSessionInBackup(client);

  return roomId;
}

export async function updatePatient(
  client: MatrixClient,
  roomId: string,
  input: Omit<PatientRecord, "updatedAt">,
): Promise<void> {
  let rootEventId = getProfileThreadRoot(client, roomId);

  if (!rootEventId) {
    rootEventId = findOldestRecordEventId(client, roomId);
    if (!rootEventId) {
      throw new Error("No existing profile record to update.");
    }
    await sendCustomStateEvent(client, roomId, PROFILE_THREAD_STATE_TYPE, {
      rootEventId,
    });
  }

  const record: PatientRecord = { ...input, updatedAt: Date.now() };
  const content: RecordContent = {
    ...record,
    "m.relates_to": { rel_type: "m.thread", event_id: rootEventId },
  };
  await sendCustomEvent(
    client,
    roomId,
    PATIENT_RECORD_EVENT_TYPE,
    content as unknown as Record<string, unknown>,
  );

  const room = client.getRoom(roomId);
  if (room && room.name !== input.name) {
    try {
      await client.setRoomName(roomId, input.name);
    } catch {
      /* non-fatal — room name is a nicety, the record event is the source of truth */
    }
  }

  await ensureSessionInBackup(client);
}

function findOldestRecordEventId(
  client: MatrixClient,
  roomId: string,
): string | null {
  const room = client.getRoom(roomId);
  if (!room) return null;
  const events = room.getLiveTimeline().getEvents();
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.getType() !== PATIENT_RECORD_EVENT_TYPE) continue;
    const id = ev.getId();
    if (id) return id;
  }
  return null;
}

export function listPatientHistory(
  client: MatrixClient,
  roomId: string,
): PatientRecordRevision[] {
  const room = client.getRoom(roomId);
  if (!room) return [];
  const rootEventId = getProfileThreadRoot(client, roomId);
  const events = room.getLiveTimeline().getEvents();
  const out: PatientRecordRevision[] = [];
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.getType() !== PATIENT_RECORD_EVENT_TYPE) continue;
    const content = ev.getContent() as RecordContent;
    if (typeof content.name !== "string") continue;
    const eventId = ev.getId();
    const sender = ev.getSender();
    if (!eventId || !sender) continue;
    out.push({
      name: content.name,
      dob: content.dob,
      phone: content.phone,
      email: content.email,
      notes: content.notes,
      updatedAt: content.updatedAt ?? ev.getTs(),
      eventId,
      sender,
      ts: ev.getTs(),
      isRoot: rootEventId ? eventId === rootEventId : false,
    });
  }
  return out;
}

export async function deletePatient(
  client: MatrixClient,
  roomId: string,
): Promise<void> {
  await client.leave(roomId);
  await client.forget(roomId);
}

export function subscribeRooms(
  client: MatrixClient,
  cb: () => void,
): () => void {
  const handler = () => cb();
  client.on(ClientEvent.Room, handler);
  client.on(RoomEvent.Timeline, handler);
  client.on(RoomEvent.Tags, handler);
  client.on(RoomEvent.Name, handler);
  client.on(MatrixEventEvent.Decrypted, handler);
  return () => {
    client.off(ClientEvent.Room, handler);
    client.off(RoomEvent.Timeline, handler);
    client.off(RoomEvent.Tags, handler);
    client.off(RoomEvent.Name, handler);
    client.off(MatrixEventEvent.Decrypted, handler);
  };
}

export function getPatient(
  client: MatrixClient,
  roomId: string,
): Patient | null {
  const room = client.getRoom(roomId);
  if (!room) return null;
  const record = latestRecordFromRoom(room);
  return {
    roomId,
    record: record ?? { name: room.name ?? "(unknown)", updatedAt: 0 },
  };
}

export function listMessages(
  client: MatrixClient,
  roomId: string,
): MatrixEvent[] {
  const room = client.getRoom(roomId);
  if (!room) return [];
  return room
    .getLiveTimeline()
    .getEvents()
    .filter((e) => e.getType() === EventType.RoomMessage);
}

export async function sendMessage(
  client: MatrixClient,
  roomId: string,
  body: string,
): Promise<void> {
  await client.sendEvent(roomId, EventType.RoomMessage, {
    msgtype: MsgType.Text,
    body,
  });
}

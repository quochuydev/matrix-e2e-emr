import { NextRequest } from "next/server";
import { presignGet, presignPut } from "@/lib/s3";

// aws-sdk needs the Node.js runtime (not edge).
export const runtime = "nodejs";

// Objects are stored at `rooms/{roomId}/{fileId}` in R2. We accept the room id
// and file id separately and build the key server-side, so the storage layout
// stays here and the request can't traverse to arbitrary keys.
const ROOM_RE = /^![A-Za-z0-9._=+-]+:[A-Za-z0-9.\-]+(?::\d+)?$/;
const FILE_RE = /^[a-zA-Z0-9._-]{1,128}$/;

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room") ?? "";
  const file = req.nextUrl.searchParams.get("file") ?? "";
  if (
    !ROOM_RE.test(room) ||
    !FILE_RE.test(file) ||
    room.includes("..") ||
    file.includes("..")
  ) {
    return new Response("Invalid room or file", { status: 400 });
  }

  const key = `rooms/${room}/${file}`;

  let url: string;
  try {
    url = await presignGet(key);
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "Presign failed",
      { status: 500 },
    );
  }

  // Fetch the encrypted object via the presigned URL and stream the ciphertext
  // back from our own origin (avoids browser CORS). Bytes stay E2E-encrypted;
  // decryption happens client-side.
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return new Response("Upstream fetch failed", {
      status: upstream.status || 502,
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}

/**
 * Presign an upload. The client posts { room }, we mint a fresh object key
 * `rooms/{roomId}/{uuid}` (the client never picks the key) and return a
 * presigned PUT URL + the generated fileId to put in the m.image event.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { room?: string } | null;
  const room = body?.room ?? "";
  if (!ROOM_RE.test(room) || room.includes("..")) {
    return new Response("Invalid room", { status: 400 });
  }

  const fileId = crypto.randomUUID();
  const key = `rooms/${room}/${fileId}`;

  try {
    const url = await presignPut(key);
    return Response.json({ url, fileId });
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "Presign failed",
      { status: 500 },
    );
  }
}

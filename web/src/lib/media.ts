/**
 * Client-side decryption of Matrix encrypted attachments (m.image etc.).
 *
 * Encrypted media is stored as ciphertext in R2; the bytes are fetched
 * same-origin via /api/media/[key] (which presigns + proxies R2), then
 * decrypted here using the per-file key/iv from the event's `content.file`.
 * Uses Web Crypto (AES-256-CTR) and verifies the SHA-256 hash, per the
 * Matrix "Sending encrypted attachments" spec.
 */

export type EncryptedFile = {
  url: string;
  iv: string;
  hashes: { sha256: string };
  key: {
    k: string;
    alg?: string;
    ext?: boolean;
    key_ops?: string[];
    kty?: string;
  };
  v?: string;
};

/** base64 (standard or url-safe, padded or not) → bytes. Returns a
 * Uint8Array explicitly backed by an ArrayBuffer so it satisfies BufferSource
 * (TS 5.7+ otherwise widens to ArrayBufferLike, which includes SharedArrayBuffer). */
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const norm = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = norm + "===".slice((norm.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** bytes → unpadded standard base64 (matches Matrix hash/iv encoding). */
function bytesToBase64Unpadded(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/, "");
}

/** bytes → unpadded url-safe base64 (matches JWK `k` encoding). */
function bytesToBase64Url(buf: ArrayBuffer): string {
  return bytesToBase64Unpadded(buf).replace(/\+/g, "-").replace(/\//g, "_");
}

/** Decrypt an encrypted attachment's ciphertext to plaintext bytes. */
export async function decryptAttachment(
  ciphertext: ArrayBuffer,
  file: EncryptedFile,
): Promise<ArrayBuffer> {
  if (!file?.key?.k || !file.iv || !file.hashes?.sha256) {
    throw new Error("Incomplete encrypted file metadata");
  }

  // Verify integrity before decrypting.
  const digest = await crypto.subtle.digest("SHA-256", ciphertext);
  if (bytesToBase64Unpadded(digest) !== file.hashes.sha256) {
    throw new Error("SHA-256 mismatch — file may be corrupted or tampered");
  }

  const keyBytes = base64ToBytes(file.key.k); // 32 bytes for A256CTR
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CTR" },
    false,
    ["decrypt"],
  );
  const counter = base64ToBytes(file.iv); // 16 bytes

  return crypto.subtle.decrypt(
    { name: "AES-CTR", counter, length: 64 },
    cryptoKey,
    ciphertext,
  );
}

/**
 * Fetch an encrypted image by its object key, decrypt it, and return a blob
 * object URL ready for an <img>. Caller must revokeObjectURL when done.
 */
export async function fetchAndDecryptImage(
  file: EncryptedFile,
  roomId: string,
  mimetype = "application/octet-stream",
): Promise<string> {
  const params = new URLSearchParams({ room: roomId, file: file.url });
  const res = await fetch(`/api/media?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Media fetch failed (${res.status})`);
  }
  const ciphertext = await res.arrayBuffer();
  const plaintext = await decryptAttachment(ciphertext, file);
  const blob = new Blob([plaintext], { type: mimetype });
  return URL.createObjectURL(blob);
}

/** Fully-populated encrypted file ref produced on upload (strict — all JWK
 * fields and `v` present, matching what the Matrix m.image event requires). */
export type UploadedEncryptedFile = {
  url: string;
  iv: string;
  hashes: { sha256: string };
  key: { alg: string; ext: boolean; k: string; key_ops: string[]; kty: string };
  v: string;
};

export type ImageMessageMeta = {
  body: string;
  info: { mimetype: string; size: number };
  file: UploadedEncryptedFile;
};

/**
 * Encrypt plaintext bytes per the Matrix encrypted-attachment spec:
 * AES-256-CTR with a random 256-bit key and a 16-byte counter whose high
 * 8 bytes are random and low 8 bytes are zero (so the counter starts at 0).
 */
async function encryptAttachment(
  data: ArrayBuffer,
): Promise<{ ciphertext: ArrayBuffer; file: Omit<UploadedEncryptedFile, "url"> }> {
  const keyBytes = new Uint8Array(new ArrayBuffer(32));
  crypto.getRandomValues(keyBytes);

  const iv = new Uint8Array(new ArrayBuffer(16));
  crypto.getRandomValues(iv.subarray(0, 8)); // low 8 bytes stay 0 (counter)

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-CTR" },
    true,
    ["encrypt"],
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-CTR", counter: iv, length: 64 },
    cryptoKey,
    data,
  );
  const digest = await crypto.subtle.digest("SHA-256", ciphertext);

  return {
    ciphertext,
    file: {
      iv: bytesToBase64Unpadded(iv.buffer),
      hashes: { sha256: bytesToBase64Unpadded(digest) },
      key: {
        alg: "A256CTR",
        ext: true,
        k: bytesToBase64Url(keyBytes.buffer),
        key_ops: ["encrypt", "decrypt"],
        kty: "oct",
      },
      v: "v2",
    },
  };
}

/**
 * Encrypt a file, presign a PUT, upload the ciphertext directly to R2 from the
 * browser, and return the m.image content metadata to send as a Matrix event.
 */
export async function uploadEncryptedImage(
  roomId: string,
  file: File,
): Promise<ImageMessageMeta> {
  const data = await file.arrayBuffer();
  const enc = await encryptAttachment(data);

  const presign = await fetch("/api/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room: roomId }),
  });
  if (!presign.ok) {
    throw new Error(`Could not presign upload (${presign.status})`);
  }
  const { url, fileId } = (await presign.json()) as {
    url: string;
    fileId: string;
  };

  const put = await fetch(url, { method: "PUT", body: enc.ciphertext });
  if (!put.ok) {
    throw new Error(`Upload failed (${put.status})`);
  }

  return {
    body: file.name,
    info: {
      mimetype: file.type || "application/octet-stream",
      size: data.byteLength,
    },
    file: { ...enc.file, url: fileId },
  };
}

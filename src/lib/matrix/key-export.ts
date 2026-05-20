import type { MatrixClient } from "matrix-js-sdk";

const HEADER = "-----BEGIN MEGOLM SESSION DATA-----";
const TRAILER = "-----END MEGOLM SESSION DATA-----";
const VERSION = 0x01;
const DEFAULT_ITERATIONS = 500_000;

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKeys(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<{ aesKey: CryptoKey; hmacKey: CryptoKey }> {
  const subtle = globalThis.crypto.subtle;
  const baseKey = await subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = new Uint8Array(
    await subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt as BufferSource,
        iterations,
        hash: "SHA-512",
      },
      baseKey,
      512,
    ),
  );
  const aesKey = await subtle.importKey(
    "raw",
    derived.slice(0, 32),
    { name: "AES-CTR" },
    false,
    ["encrypt", "decrypt"],
  );
  const hmacKey = await subtle.importKey(
    "raw",
    derived.slice(32, 64),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return { aesKey, hmacKey };
}

export async function exportEncryptedKeys(
  client: MatrixClient,
  passphrase: string,
): Promise<{ blob: Blob; sessionCount: number }> {
  const crypto = client.getCrypto();
  if (!crypto) throw new Error("Crypto is not initialized on this client.");

  const json = await crypto.exportRoomKeysAsJson();
  const parsed = JSON.parse(json) as unknown[];
  const sessionCount = Array.isArray(parsed) ? parsed.length : 0;
  if (sessionCount === 0) {
    throw new Error("No room keys to export from this browser yet.");
  }
  const plaintext = new TextEncoder().encode(json);

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(16));
  iv[8] &= 0x7f;
  const iterations = DEFAULT_ITERATIONS;

  const { aesKey, hmacKey } = await deriveKeys(passphrase, salt, iterations);
  const ciphertext = new Uint8Array(
    await globalThis.crypto.subtle.encrypt(
      { name: "AES-CTR", counter: iv as BufferSource, length: 64 },
      aesKey,
      plaintext,
    ),
  );

  const macInputLen = 1 + 16 + 16 + 4 + ciphertext.length;
  const macInput = new Uint8Array(macInputLen);
  macInput[0] = VERSION;
  macInput.set(salt, 1);
  macInput.set(iv, 17);
  new DataView(macInput.buffer, macInput.byteOffset, macInput.byteLength)
    .setUint32(33, iterations, false);
  macInput.set(ciphertext, 37);

  const hmac = new Uint8Array(
    await globalThis.crypto.subtle.sign("HMAC", hmacKey, macInput),
  );

  const blob = new Uint8Array(macInputLen + 32);
  blob.set(macInput, 0);
  blob.set(hmac, macInputLen);

  const wrapped = (bytesToBase64(blob).match(/.{1,64}/g) ?? []).join("\n");
  const text = `${HEADER}\n${wrapped}\n${TRAILER}\n`;
  return { blob: new Blob([text], { type: "text/plain" }), sessionCount };
}

export async function importEncryptedKeys(
  client: MatrixClient,
  fileText: string,
  passphrase: string,
): Promise<{ total: number }> {
  const crypto = client.getCrypto();
  if (!crypto) throw new Error("Crypto is not initialized on this client.");

  const start = fileText.indexOf(HEADER);
  const end = fileText.indexOf(TRAILER);
  if (start < 0 || end < 0) {
    throw new Error(
      "Not a Matrix key export file (missing BEGIN/END MEGOLM SESSION DATA markers).",
    );
  }
  const b64 = fileText
    .slice(start + HEADER.length, end)
    .replace(/\s+/g, "");
  const blob = base64ToBytes(b64);
  if (blob.length < 1 + 16 + 16 + 4 + 32) {
    throw new Error("Key file is truncated.");
  }
  if (blob[0] !== VERSION) {
    throw new Error(`Unsupported key file version (0x${blob[0].toString(16)}).`);
  }

  const salt = blob.slice(1, 17);
  const iv = blob.slice(17, 33);
  const iterations = new DataView(
    blob.buffer,
    blob.byteOffset,
    blob.byteLength,
  ).getUint32(33, false);
  const hmacOffset = blob.length - 32;
  const ciphertext = blob.slice(37, hmacOffset);
  const givenHmac = blob.slice(hmacOffset);

  const { aesKey, hmacKey } = await deriveKeys(passphrase, salt, iterations);

  const macInput = blob.slice(0, hmacOffset);
  const ok = await globalThis.crypto.subtle.verify(
    "HMAC",
    hmacKey,
    givenHmac as BufferSource,
    macInput as BufferSource,
  );
  if (!ok) {
    throw new Error("Wrong passphrase or corrupted file.");
  }

  const plaintext = new Uint8Array(
    await globalThis.crypto.subtle.decrypt(
      { name: "AES-CTR", counter: iv as BufferSource, length: 64 },
      aesKey,
      ciphertext,
    ),
  );
  const json = new TextDecoder().decode(plaintext);
  const parsed = JSON.parse(json) as unknown[];
  const total = Array.isArray(parsed) ? parsed.length : 0;

  await crypto.importRoomKeysAsJson(json);
  return { total };
}

import "server-only";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (S3-compatible) connection. Credentials come from env only —
 * never hardcode them. Set R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY (see .env.local for dev, Vercel env for prod).
 *
 * Stored objects are Matrix-encrypted attachment ciphertext keyed by the
 * `content.file.url` UUID of an m.image event; decryption happens client-side.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

let cached: { client: S3Client; bucket: string } | null = null;

function getS3(): { client: S3Client; bucket: string } {
  if (cached) return cached;
  const client = new S3Client({
    region: "auto",
    endpoint: required("R2_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });
  cached = { client, bucket: required("R2_BUCKET") };
  return cached;
}

/** Presigned, time-limited GET URL for an object key. */
export async function presignGet(key: string, expiresIn = 300): Promise<string> {
  const { client, bucket } = getS3();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
}

/**
 * Presigned, time-limited PUT URL for an object key — used by the client to
 * upload encrypted attachment ciphertext directly to R2. No Content-Type is
 * signed, so the browser can PUT raw bytes without a signature mismatch.
 */
export async function presignPut(key: string, expiresIn = 300): Promise<string> {
  const { client, bucket } = getS3();
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
}

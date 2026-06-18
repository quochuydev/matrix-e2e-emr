"use client";

import { useEffect, useState } from "react";
import { fetchAndDecryptImage, type EncryptedFile } from "@/lib/media";

export type MessageContent = {
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
export function EncryptedImage({
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
    <img src={url} alt={name} className="max-h-64 max-w-full rounded-md" />
  );
}

"use client";

import type { MatrixClient } from "matrix-js-sdk";
import type {
  CryptoCallbacks,
  SecretStorageStatus,
} from "matrix-js-sdk/lib/crypto-api";
import type { SecretStorageKeyDescriptionAesV1 } from "matrix-js-sdk/lib/secret-storage";

type CachedKey = { keyId: string; key: Uint8Array };

let cached: CachedKey | null = null;

export function makeCryptoCallbacks(): CryptoCallbacks {
  return {
    getSecretStorageKey: async ({ keys }) => {
      if (!cached) return null;
      if (cached.keyId in keys) {
        return [
          cached.keyId,
          cached.key as Uint8Array as Uint8Array<ArrayBuffer>,
        ];
      }
      return null;
    },
    cacheSecretStorageKey: (keyId, _info, key) => {
      cached = { keyId, key };
    },
  };
}

export function hasCachedSecurityKey(): boolean {
  return cached !== null;
}

export type UnlockOutcome = {
  crossSigningReady: boolean;
  secretStorageReady: boolean;
  keyBackupRestored: { total: number; imported: number } | null;
};

export async function unlockWithSecurityKey(
  client: MatrixClient,
  recoveryKey: string,
): Promise<UnlockOutcome> {
  const crypto = client.getCrypto();
  if (!crypto) throw new Error("Crypto is not initialized on this client.");

  const trimmed = recoveryKey.replace(/\s+/g, "");
  const { decodeRecoveryKey } = await import(
    "matrix-js-sdk/lib/crypto-api/recovery-key"
  );

  let keyBytes: Uint8Array;
  try {
    keyBytes = decodeRecoveryKey(trimmed);
  } catch (e) {
    throw new Error(
      `Couldn't decode the security key: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }

  const ss = client.secretStorage;
  const defaultKeyId = await ss.getDefaultKeyId();
  if (!defaultKeyId) {
    throw new Error(
      "No secret storage is set up on this account. Create one from Element first.",
    );
  }

  const keyInfoEvt = await client.getAccountDataFromServer(
    `m.secret_storage.key.${defaultKeyId}` as never,
  );
  if (!keyInfoEvt) {
    throw new Error(
      `Couldn't fetch metadata for secret storage key ${defaultKeyId}.`,
    );
  }
  const keyInfo = keyInfoEvt as unknown as SecretStorageKeyDescriptionAesV1;
  const valid = await ss.checkKey(keyBytes, keyInfo);
  if (!valid) {
    throw new Error(
      "That security key doesn't match your account's secret storage key.",
    );
  }

  cached = { keyId: defaultKeyId, key: keyBytes };

  try {
    await crypto.bootstrapCrossSigning({});
  } catch {
    // Non-fatal: account may not have cross-signing private keys stashed in
    // SSSS, or the recovery key only protects key backup. Continue with the
    // backup restore — that's the part that actually unblocks decryption.
  }

  let keyBackupRestored: UnlockOutcome["keyBackupRestored"] = null;
  try {
    await crypto.checkKeyBackupAndEnable();
    const result = await crypto.restoreKeyBackup();
    keyBackupRestored = { total: result.total, imported: result.imported };
    if (result.imported > 0) {
      // Nudge any cached encrypted events to retry decryption with the new keys.
      await Promise.all(
        client.getRooms().map((r) => r.decryptAllEvents().catch(() => {})),
      );
    }
  } catch {
    /* no backup or already restored — non-fatal */
  }

  const [crossSigningReady, secretStorageReady] = await Promise.all([
    crypto.isCrossSigningReady(),
    crypto.isSecretStorageReady(),
  ]);

  return { crossSigningReady, secretStorageReady, keyBackupRestored };
}

export async function getStatus(
  client: MatrixClient,
): Promise<{
  crossSigningReady: boolean;
  secretStorageReady: boolean;
  status: SecretStorageStatus | null;
  activeBackupVersion: string | null;
}> {
  const crypto = client.getCrypto();
  if (!crypto) {
    return {
      crossSigningReady: false,
      secretStorageReady: false,
      status: null,
      activeBackupVersion: null,
    };
  }
  const [crossSigningReady, secretStorageReady, status, activeBackupVersion] =
    await Promise.all([
      crypto.isCrossSigningReady(),
      crypto.isSecretStorageReady(),
      crypto.getSecretStorageStatus(),
      crypto.getActiveSessionBackupVersion(),
    ]);
  return {
    crossSigningReady,
    secretStorageReady,
    status,
    activeBackupVersion,
  };
}

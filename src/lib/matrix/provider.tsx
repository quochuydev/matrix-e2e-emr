"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MatrixClient } from "matrix-js-sdk";
import {
  createMatrixClient,
  loginWithPassword,
  type LoginInput,
} from "./client";
import {
  getStatus,
  unlockWithSecurityKey,
  type UnlockOutcome,
} from "./secret-storage";
import {
  SESSION_STORAGE_KEY,
  type StoredSession,
} from "./types";

type Status = "initializing" | "idle" | "connecting" | "ready" | "error";

export type CryptoStatus = {
  crossSigningReady: boolean;
  secretStorageReady: boolean;
  backupVersion: string | null;
};

type Ctx = {
  client: MatrixClient | null;
  session: StoredSession | null;
  status: Status;
  error: string | null;
  syncState: string | null;
  lastSyncedAt: number | null;
  cryptoStatus: CryptoStatus | null;
  hasKeyThisSession: boolean;
  pendingBackup: number;
  ready: boolean;
  notReadyReason: string | null;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  unlock: (recoveryKey: string) => Promise<UnlockOutcome>;
};

const MatrixContext = createContext<Ctx | null>(null);

function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function MatrixProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [status, setStatus] = useState<Status>("initializing");
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [cryptoStatus, setCryptoStatus] = useState<CryptoStatus | null>(null);
  const [hasKeyThisSession, setHasKeyThisSession] = useState(false);
  const [pendingBackup, setPendingBackup] = useState(0);
  const startedRef = useRef(false);

  const refreshCryptoStatus = useCallback(async (c: MatrixClient) => {
    try {
      const s = await getStatus(c);
      setCryptoStatus({
        crossSigningReady: s.crossSigningReady,
        secretStorageReady: s.secretStorageReady,
        backupVersion: s.activeBackupVersion,
      });
    } catch {
      /* ignore */
    }
  }, []);

  const attachListeners = useCallback(
    async (c: MatrixClient) => {
      const sdk = await import("matrix-js-sdk");
      const { ClientEvent } = sdk;
      const { CryptoEvent } = await import("matrix-js-sdk/lib/crypto-api");

      const onSync = (state: string) => {
        setSyncState(state);
        if (state === "SYNCING" || state === "PREPARED") {
          setLastSyncedAt(Date.now());
        }
      };
      const onCrypto = () => {
        void refreshCryptoStatus(c);
      };
      const onRemaining = (remaining: number) => {
        setPendingBackup(remaining);
      };

      c.on(ClientEvent.Sync, onSync);
      c.on(CryptoEvent.KeysChanged, onCrypto);
      c.on(CryptoEvent.KeyBackupStatus, onCrypto);
      c.on(CryptoEvent.KeyBackupDecryptionKeyCached, onCrypto);
      c.on(CryptoEvent.DevicesUpdated, onCrypto);
      c.on(CryptoEvent.KeyBackupSessionsRemaining, onRemaining);

      return () => {
        c.off(ClientEvent.Sync, onSync);
        c.off(CryptoEvent.KeysChanged, onCrypto);
        c.off(CryptoEvent.KeyBackupStatus, onCrypto);
        c.off(CryptoEvent.KeyBackupDecryptionKeyCached, onCrypto);
        c.off(CryptoEvent.DevicesUpdated, onCrypto);
        c.off(CryptoEvent.KeyBackupSessionsRemaining, onRemaining);
      };
    },
    [refreshCryptoStatus],
  );

  const detachRef = useRef<(() => void) | null>(null);

  const start = useCallback(
    async (s: StoredSession) => {
      setStatus("connecting");
      setError(null);
      try {
        const c = await createMatrixClient(s);
        detachRef.current = await attachListeners(c);
        setClient(c);
        setSession(s);
        setSyncState(c.getSyncState() ?? null);
        setLastSyncedAt(Date.now());
        await refreshCryptoStatus(c);
        setStatus("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    },
    [attachListeners, refreshCryptoStatus],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const existing = loadSession();
    if (existing) {
      // Bootstrap a stored session on mount; start() itself drives status transitions.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void start(existing);
    } else {
      setStatus("idle");
    }
  }, [start]);

  useEffect(() => {
    if (pendingBackup <= 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pendingBackup]);

  const signIn = useCallback(
    async (input: LoginInput) => {
      const s = await loginWithPassword(input);
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(s));
      await start(s);
    },
    [start],
  );

  const signOut = useCallback(async () => {
    if (pendingBackup > 0) {
      throw new Error(
        `Hold on — ${pendingBackup} message key${pendingBackup === 1 ? "" : "s"} still uploading to backup. Wait a moment, otherwise you'll lose access to recent messages.`,
      );
    }
    if (detachRef.current) {
      detachRef.current();
      detachRef.current = null;
    }
    if (client) {
      try {
        await Promise.race([
          client.logout(true),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      } catch {
        /* ignore — token may already be invalid */
      }
      try {
        client.stopClient();
      } catch {
        /* ignore */
      }
      try {
        await client.clearStores();
      } catch {
        /* ignore */
      }
    }
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setClient(null);
    setSession(null);
    setSyncState(null);
    setLastSyncedAt(null);
    setCryptoStatus(null);
    setHasKeyThisSession(false);
    setPendingBackup(0);
    setStatus("idle");
  }, [client, pendingBackup]);

  const unlock = useCallback(
    async (recoveryKey: string) => {
      if (!client) throw new Error("Not signed in.");
      const outcome = await unlockWithSecurityKey(client, recoveryKey);
      setHasKeyThisSession(true);
      await refreshCryptoStatus(client);
      return outcome;
    },
    [client, refreshCryptoStatus],
  );

  const { ready, notReadyReason } = useMemo(() => {
    if (status !== "ready" || !client) {
      return { ready: false, notReadyReason: "Not signed in." };
    }
    if (syncState !== "PREPARED" && syncState !== "SYNCING") {
      const label =
        syncState === "RECONNECTING"
          ? "Reconnecting to homeserver…"
          : syncState === "CATCHUP"
            ? "Catching up with homeserver…"
            : syncState === "ERROR"
              ? "Sync error — waiting for reconnection."
              : "Waiting for first sync to finish…";
      return { ready: false, notReadyReason: label };
    }
    if (
      !cryptoStatus ||
      !cryptoStatus.secretStorageReady ||
      !cryptoStatus.crossSigningReady
    ) {
      return {
        ready: false,
        notReadyReason: "Encryption is locked. Enter your recovery key.",
      };
    }
    return { ready: true, notReadyReason: null };
  }, [status, client, syncState, cryptoStatus]);

  const value = useMemo<Ctx>(
    () => ({
      client,
      session,
      status,
      error,
      syncState,
      lastSyncedAt,
      cryptoStatus,
      hasKeyThisSession,
      pendingBackup,
      ready,
      notReadyReason,
      signIn,
      signOut,
      unlock,
    }),
    [
      client,
      session,
      status,
      error,
      syncState,
      lastSyncedAt,
      cryptoStatus,
      hasKeyThisSession,
      pendingBackup,
      ready,
      notReadyReason,
      signIn,
      signOut,
      unlock,
    ],
  );

  return (
    <MatrixContext.Provider value={value}>{children}</MatrixContext.Provider>
  );
}

export function useMatrix() {
  const ctx = useContext(MatrixContext);
  if (!ctx) throw new Error("useMatrix must be used inside MatrixProvider");
  return ctx;
}

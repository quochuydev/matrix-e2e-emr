import type { NotReadyReason } from "matrix-client/react";
import type { TFunc } from "@/lib/i18n";

export function notReadyMessage(
  reason: NotReadyReason | null,
  t: TFunc,
): string {
  if (!reason) return "";
  switch (reason.kind) {
    case "not_signed_in":
      return t("notReady.notSignedIn");
    case "reconnecting":
      return t("notReady.reconnecting");
    case "catchup":
      return t("notReady.catchup");
    case "sync_error":
      return t("notReady.syncError");
    case "syncing":
      return t("notReady.syncing");
    case "needs_recovery_key":
      return t("notReady.needsRecoveryKey");
  }
}

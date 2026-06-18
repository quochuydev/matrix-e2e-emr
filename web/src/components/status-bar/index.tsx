"use client";

import { useState } from "react";
import { useMatrix, usePatientInvites } from "matrix-client/react";
import { notReadyMessage } from "@/lib/not-ready-message";
import { useT } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { AccountPopover } from "./account-popover";
import { RecoveryKeyDialog } from "./recovery-key-dialog";
import { ResetBackupDialog } from "./reset-backup-dialog";
import { SignOutDialog } from "./sign-out-dialog";
import { InvitesDialog } from "./invites-dialog";

export function StatusBar() {
  const { status, ready, notReadyReason } = useMatrix();
  const { invites: pendingInvites } = usePatientInvites();
  const t = useT();

  const [invitesOpen, setInvitesOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  if (status !== "ready") return null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {pendingInvites.length > 0 && (
            <button
              type="button"
              onClick={() => setInvitesOpen(true)}
              title={t("statusBar.reviewInvites")}
              className="cursor-pointer"
            >
              <Badge variant="destructive">
                {pendingInvites.length === 1
                  ? t("statusBar.invitesOne", { count: pendingInvites.length })
                  : t("statusBar.invitesOther", {
                      count: pendingInvites.length,
                    })}
              </Badge>
            </button>
          )}
          {!ready && notReadyReason && (
            <span className="text-destructive">
              {notReadyMessage(notReadyReason, t)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AccountPopover
            onOpenRecoveryKey={() => setKeyOpen(true)}
            onOpenReset={() => setResetOpen(true)}
            onOpenSignOut={() => setSignOutOpen(true)}
          />
        </div>
      </div>

      <RecoveryKeyDialog open={keyOpen} onOpenChange={setKeyOpen} />
      <ResetBackupDialog open={resetOpen} onOpenChange={setResetOpen} />
      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
      <InvitesDialog open={invitesOpen} onOpenChange={setInvitesOpen} />
    </>
  );
}

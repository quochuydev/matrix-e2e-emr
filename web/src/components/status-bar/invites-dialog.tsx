"use client";

import { useState } from "react";
import { usePatientInvites } from "matrix-client/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function InvitesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    invites: pendingInvites,
    accept: acceptInvite,
    decline: declineInvite,
  } = usePatientInvites();
  const [invitePending, setInvitePending] = useState<string | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !invitePending && onOpenChange(o)}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Pending invites</DialogTitle>
          <DialogDescription>
            Accept to join the room and tag it as a patient. Decline to
            reject the invite — the inviter is notified.
          </DialogDescription>
        </DialogHeader>
        {pendingInvites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <ul className="space-y-2">
            {pendingInvites.map((inv) => {
              const busy = invitePending === inv.roomId;
              return (
                <li
                  key={inv.roomId}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {inv.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      from {inv.inviterId ?? "unknown"}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!!invitePending}
                      onClick={async () => {
                        setInvitePending(inv.roomId);
                        try {
                          await declineInvite(inv.roomId);
                          toast.success("Declined.");
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : String(err),
                          );
                        } finally {
                          setInvitePending(null);
                        }
                      }}
                    >
                      {busy ? "…" : "Decline"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!!invitePending}
                      onClick={async () => {
                        setInvitePending(inv.roomId);
                        try {
                          await acceptInvite(inv.roomId);
                          toast.success(`Joined ${inv.name}.`);
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : String(err),
                          );
                        } finally {
                          setInvitePending(null);
                        }
                      }}
                    >
                      {busy ? "…" : "Accept"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={!!invitePending}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { useMatrix } from "matrix-client/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function SignOutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { signOut } = useMatrix();
  const [signingOut, setSigningOut] = useState(false);

  const confirmSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !signingOut && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Sign out of this device?</DialogTitle>
          <DialogDescription>
            The session token will be revoked and this browser&apos;s local
            message keys, room cache, and SSSS cache will be wiped. Other
            devices stay signed in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={signingOut}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

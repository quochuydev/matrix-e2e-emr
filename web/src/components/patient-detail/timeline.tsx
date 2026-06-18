"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import type { MatrixEvent } from "matrix-js-sdk";
import { useMatrix } from "matrix-client/react";
import {
  redactMessage,
  resendMessage,
  sendImageMessage,
  sendMessage,
} from "matrix-client/patients";
import { notReadyMessage } from "@/lib/not-ready-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadEncryptedImage } from "@/lib/media";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { MessageBubble } from "./message-bubble";

export function PatientTimeline({
  roomId,
  messages,
}: {
  roomId: string;
  messages: MatrixEvent[];
}) {
  const { client, session, ready, notReadyReason } = useMatrix();
  const t = useT();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pin the view to the latest message. Runs on first load (so a refresh lands
  // at the bottom) and whenever a message is added or removed.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Grow the composer with its content (up to a cap), and shrink on clear.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const onSend = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!client || !ready || !body) return;
    // Optimistic: clear the composer right away. matrix-js-sdk inserts a local
    // echo into the timeline immediately and queues delivery, so the bubble
    // shows up instantly with a "Sending…" state instead of blocking the UI.
    setText("");
    sendMessage(client, roomId, body).catch((err) => {
      toast.error(err instanceof Error ? err.message : String(err));
    });
  };

  const onResend = (ev: MatrixEvent) => {
    if (!client) return;
    resendMessage(client, roomId, ev).catch((err) => {
      toast.error(err instanceof Error ? err.message : String(err));
    });
  };

  const confirmDelete = async () => {
    if (!client || !ready || !pendingDelete) return;
    setDeleting(true);
    try {
      await redactMessage(client, roomId, pendingDelete);
      toast.success(t("timeline.messageDeletedToast"));
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!picked || !client || !ready) return;
    setUploading(true);
    try {
      const meta = await uploadEncryptedImage(roomId, picked);
      await sendImageMessage(client, roomId, meta);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex h-[70dvh] flex-col rounded-lg border bg-card lg:sticky lg:top-20 lg:h-[calc(100dvh-10rem)]">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">{t("timeline.title")}</h2>
        <p className="text-xs text-muted-foreground">{t("timeline.subtitle")}</p>
      </div>
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 text-sm"
      >
        <div className="mt-auto space-y-2">
          {messages.length === 0 && (
            <div className="text-muted-foreground text-center py-8">
              {t("timeline.noMessages")}
            </div>
          )}
          {messages.map((ev) => (
            <MessageBubble
              key={ev.getId()}
              event={ev}
              isMe={ev.getSender() === session?.userId}
              roomId={roomId}
              ready={ready}
              onDelete={setPendingDelete}
              onResend={onResend}
            />
          ))}
        </div>
      </div>
      <form onSubmit={onSend} className="flex items-end gap-2 border-t p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!ready || uploading}
          title={
            ready
              ? t("timeline.attachImage")
              : notReadyMessage(notReadyReason, t) || undefined
          }
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="size-4" />
        </Button>
        <textarea
          ref={composerRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(e);
            }
          }}
          rows={1}
          placeholder={
            uploading
              ? t("timeline.uploading")
              : ready
                ? t("timeline.composerPlaceholder")
                : notReadyMessage(notReadyReason, t) ||
                  t("timeline.notReadyFallback")
          }
          disabled={uploading || !ready}
          title={notReadyMessage(notReadyReason, t) || undefined}
          className="flex max-h-40 min-h-9 w-full flex-1 resize-none overflow-y-auto rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
        />
        <Button
          type="submit"
          disabled={uploading || !text.trim() || !ready}
          title={notReadyMessage(notReadyReason, t) || undefined}
        >
          {t("timeline.send")}
        </Button>
      </form>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t("timeline.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("timeline.deleteDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" type="button" disabled={deleting} />
              }
            >
              {t("timeline.cancel")}
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || !ready}
              onClick={confirmDelete}
            >
              {deleting ? t("timeline.deleting") : t("timeline.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { Trash2 } from "lucide-react";
import type { MatrixEvent } from "matrix-js-sdk";
import { messageSendState } from "matrix-client/patients";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { HiddenJson } from "./hidden-json";
import { EncryptedImage, type MessageContent } from "./encrypted-image";
import { UndecryptableMessage } from "./undecryptable-message";

export function MessageBubble({
  event: ev,
  isMe,
  roomId,
  ready,
  onDelete,
  onResend,
}: {
  event: MatrixEvent;
  isMe: boolean;
  roomId: string;
  ready: boolean;
  onDelete: (eventId: string | null) => void;
  onResend: (event: MatrixEvent) => void;
}) {
  const t = useT();
  const sender = ev.getSender();

  if (ev.isRedacted()) {
    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
        <div className="rounded-lg border border-dashed px-3 py-1.5 text-xs italic text-muted-foreground">
          {t("message.deleted")}
        </div>
      </div>
    );
  }

  if (ev.isDecryptionFailure()) {
    return <UndecryptableMessage event={ev} isMe={isMe} />;
  }

  const content = ev.getContent() as MessageContent;
  const body = content.body ?? "";
  const imageFile =
    content.msgtype === "m.image" && content.file?.url ? content.file : null;
  const sendState = isMe ? messageSendState(ev) : "sent";

  return (
    <div
      className={`group flex items-center gap-1 ${
        isMe ? "justify-end" : "justify-start"
      }`}
    >
      {isMe && sendState === "sent" && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("message.deleteMessage")}
          title={t("message.deleteMessage")}
          disabled={!ready}
          onClick={() => onDelete(ev.getId() ?? null)}
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
      <div
        className={`flex max-w-[75%] flex-col ${
          isMe ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`rounded-lg px-3 py-2 ${
            isMe ? "bg-primary text-primary-foreground" : "bg-muted"
          } ${sendState === "sending" ? "opacity-70" : ""}`}
        >
          {!isMe && <div className="text-xs opacity-70 mb-1">{sender}</div>}
          {imageFile ? (
            <EncryptedImage
              file={imageFile}
              roomId={roomId}
              mimetype={content.info?.mimetype}
              name={content.body || content.filename || t("message.imageFallback")}
            />
          ) : (
            <div className="whitespace-pre-wrap break-words">{body}</div>
          )}
          <HiddenJson value={ev.getEffectiveEvent()} />
        </div>
        {isMe && sendState === "sending" && (
          <span className="mt-0.5 text-[11px] text-muted-foreground">
            {t("message.sending")}
          </span>
        )}
        {isMe && sendState === "failed" && (
          <span className="mt-0.5 text-[11px] text-destructive">
            {t("message.failedPrefix")}
            <button
              type="button"
              onClick={() => onResend(ev)}
              className="underline underline-offset-2 hover:no-underline"
            >
              {t("message.retry")}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

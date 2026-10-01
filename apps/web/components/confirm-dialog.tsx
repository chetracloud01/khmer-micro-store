"use client";

import { Button } from "@khmer-micro-store/ui";
import { useEffect } from "react";

/** Centered confirm for risky actions (rejecting KYC, etc.). Escape or the backdrop cancels. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* The dimmed backdrop closes on click but stays out of the accessibility tree,
          so screen readers only hear the dialog's own buttons. */}
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-fg/40" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative z-10 flex w-full max-w-sm flex-col gap-3 rounded-DEFAULT bg-bg p-5 shadow-raised"
      >
        <h2 id="confirm-title" className="font-semibold text-fg">
          {title}
        </h2>
        <p className="text-sm text-muted">{body}</p>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

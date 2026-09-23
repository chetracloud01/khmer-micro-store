"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** No hard-coded text in this package: the caller supplies the translated label. */
  closeLabel: string;
  title?: ReactNode;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, closeLabel, title, children }: BottomSheetProps) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-fg/40"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-[480px] flex-col rounded-t-2xl bg-bg p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-fg">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-border/30"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

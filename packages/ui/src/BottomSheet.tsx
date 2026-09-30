"use client";

import { X } from "lucide-react";
import { useEffect, useId } from "react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** No hard-coded text in this package: the caller supplies the translated label. */
  closeLabel: string;
  title?: ReactNode;
  children: ReactNode;
  /** Stays in view under the scrolling content — for the sheet's one main button. */
  footer?: ReactNode;
  /**
   * Always a bottom sheet on phones. From tablet width up:
   * "side" — a full-height panel on the right (laptop tools);
   * "center" — a centred window (buyer screens);
   * "bottom" — stays a bottom sheet.
   */
  placement?: "bottom" | "side" | "center";
  /** With "center": a wider window from tablet up, for content laid out in two columns. */
  wide?: boolean;
}

export function BottomSheet({ open, onClose, closeLabel, title, children, footer, placement = "bottom", wide = false }: BottomSheetProps) {
  const side = placement === "side";
  const center = placement === "center";
  const titleId = useId();
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
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center",
        side && "md:items-stretch md:justify-end",
        center && "sm:items-center sm:p-6",
      )}
    >
      {/* The dimmed backdrop closes on click but stays out of the accessibility
          tree; the X button below is the one labelled close control. */}
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 animate-fade-in bg-fg/40 motion-reduce:animate-none" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "relative z-10 flex max-h-[85dvh] w-full max-w-[480px] animate-sheet-in flex-col rounded-t-2xl bg-bg p-4 pb-safe shadow-xl motion-reduce:animate-none",
          side && "md:max-h-none md:max-w-[440px] md:rounded-none md:border-l md:border-border md:p-6",
          center && "sm:max-w-[520px] sm:rounded-2xl sm:p-6",
          center && wide && "md:max-w-[800px]",
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
          )}
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
        {footer && <div className="mt-3 border-t border-border pt-3">{footer}</div>}
      </div>
    </div>
  );
}

import { CheckCircle2 } from "lucide-react";
import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  icon?: boolean;
}

export function Badge({ className, icon = true, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success",
        className,
      )}
      {...props}
    >
      {icon && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

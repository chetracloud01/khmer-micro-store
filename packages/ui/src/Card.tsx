import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-DEFAULT border border-border bg-bg p-4 shadow-sm", className)}
      {...props}
    />
  );
}

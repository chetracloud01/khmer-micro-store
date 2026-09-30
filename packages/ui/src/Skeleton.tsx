import { cn } from "./cn";

/**
 * A grey block standing in for content that's still loading. Size and shape
 * come from the caller's classes; it's hidden from screen readers, so the
 * page around it says "Loading" once.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-DEFAULT bg-border/40 motion-reduce:animate-none", className)} />;
}

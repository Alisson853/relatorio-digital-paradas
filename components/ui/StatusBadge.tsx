import { cn, statusColorClasses, statusDotClasses, statusLabel } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        statusColorClasses(status),
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", statusDotClasses(status))} />
      {statusLabel(status)}
    </span>
  );
}

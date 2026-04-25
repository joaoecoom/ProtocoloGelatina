import { cn } from "@/lib/cn";

export function GlassCard({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn("glass-panel rounded-[1.15rem] p-4 sm:rounded-3xl sm:p-5", className)}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}

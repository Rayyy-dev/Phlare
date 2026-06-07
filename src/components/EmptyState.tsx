import type { LucideIcon } from "lucide-react";

/** Centered empty-state used inside list cards when there's no data yet. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-ink-100 text-ink-400">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-ink-500">{description}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

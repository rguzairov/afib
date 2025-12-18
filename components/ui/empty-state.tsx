import { cn } from "./utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600", className)}>
      <p className="font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-1 text-slate-500">{description}</p>}
    </div>
  );
}

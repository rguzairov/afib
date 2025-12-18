import { Spinner } from "@/components/ui/spinner";

type SurveyLoadingProps = {
  title?: string;
  description?: string;
};

export function SurveyLoading({ title, description }: SurveyLoadingProps) {
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-1">
        {title && <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>}
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </header>

      <div className="rounded-xl border border-slate-200 bg-white/95 p-5 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Spinner className="h-5 w-5 border-slate-300 border-t-emerald-600" />
          <span>Loading cards…</span>
        </div>
      </div>
    </div>
  );
}

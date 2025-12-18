import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { SectionCard } from "@/components/ui/card";
import {
  buildClinicalPictureSummaryContent,
  type ClinicalPictureSummaryRow,
} from "@/components/features/clinical-picture/ai-summary-content";

const SUMMARY_CACHE_REVALIDATE_SECONDS = 60 * 30; // 30 minutes
const COUNT_CACHE_REVALIDATE_SECONDS = 60; // 1 minute

const fetchClinicalPictureSummaryRow = unstable_cache(
  async (): Promise<ClinicalPictureSummaryRow | null> => {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase
        .from("cp_summary")
        .select(
          "summary, median_time_since_diagnosis_years, most_cited_onset_setting, common_cofactor, highlights, source_rows, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch clinical picture summary", error);
        return null;
      }

      return (data ?? null) as ClinicalPictureSummaryRow | null;
    } catch (error) {
      console.error("Clinical picture summary fetch failed", error);
      return null;
    }
  },
  ["clinical-picture-summary"],
  { revalidate: SUMMARY_CACHE_REVALIDATE_SECONDS, tags: ["clinical-picture-summary"] },
);

const fetchClinicalPictureShareCount = unstable_cache(
  async (): Promise<number | null> => {
    try {
      const supabase = getSupabaseServerClient();
      const { count, error } = await supabase
        .from("clinical_picture")
        .select("id", { count: "exact", head: true });

      if (error) {
        console.error("Failed to count clinical picture shares", error);
        return null;
      }

      return typeof count === "number" ? count : null;
    } catch (error) {
      console.error("Clinical picture share count failed", error);
      return null;
    }
  },
  ["clinical-picture-count"],
  { revalidate: COUNT_CACHE_REVALIDATE_SECONDS, tags: ["clinical-picture-count"] },
);

export async function AISummarySectionServer({ className = "" }: { className?: string }) {
  const [summaryRow, shareCount] = await Promise.all([
    fetchClinicalPictureSummaryRow(),
    fetchClinicalPictureShareCount(),
  ]);

  const content = buildClinicalPictureSummaryContent(summaryRow, { shareCount });

  return (
    <SectionCard className={className}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-xl font-semibold text-slate-900">{content.headline}</p>
          <p className="text-sm text-slate-500">{content.updateNote}</p>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-700 shadow-sm">
            <p>{content.narrative}</p>
          </div>
        </div>
      </div>

      {content.stats.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Stats snapshot</p>
          <div className="mt-2 grid gap-4 md:grid-cols-3">
            {content.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm ring-1 ring-slate-100"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.highlights.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Highlights</p>
          {content.highlights.map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800 shadow-sm"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white shadow-sm">
                ✦
              </span>
              <p className="leading-snug">{item}</p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}


import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { HeartActivityIcon } from "@/components/ui/heart-activity-icon";
import { SectionCard } from "@/components/ui/card";

type ClinicalMessage = {
  id: number;
  timeAgo: string;
  diagnosis: string;
  diagnosed: string;
  message: string;
};

type ClinicalPictureRecord = {
  id: number;
  created_at: string;
  diagnosis: string | null;
  description: string | null;
  diagnosis_year: number | null;
};

const FEED_CACHE_REVALIDATE_SECONDS = 60; // 1 minute

export const timelineCopy = {
  title: "Community feed",
  liveBadge: "Live",
  subtitle: (recentCount: number, totalCount: number) => `Showing ${recentCount} recent of ${totalCount} total.`,
};

const fetchClinicalPictureFeed = unstable_cache(
  async (): Promise<{ records: ClinicalPictureRecord[]; totalCount: number }> => {
    try {
      const supabase = getSupabaseServerClient();
      const { data, error, count } = await supabase
        .from("clinical_picture")
        .select("id, created_at, diagnosis, description, diagnosis_year", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Failed to fetch clinical picture feed", error);
        return { records: [], totalCount: 0 };
      }

      return {
        records: (data ?? []) as ClinicalPictureRecord[],
        totalCount: count ?? 0,
      };
    } catch (error) {
      console.error("Clinical picture feed fetch failed", error);
      return { records: [], totalCount: 0 };
    }
  },
  ["clinical-picture-feed"],
  { revalidate: FEED_CACHE_REVALIDATE_SECONDS, tags: ["clinical-picture-feed"] },
);

export async function ClinicalPictureTimelineServer() {
  const { records, totalCount } = await fetchClinicalPictureFeed();
  const messages = toMessages(records);

  return (
    <SectionCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-slate-900">{timelineCopy.title}</p>
          <p className="text-sm text-slate-500">{timelineCopy.subtitle(messages.length, totalCount)}</p>
        </div>
        <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white shadow-sm">
          {timelineCopy.liveBadge}
        </span>
      </div>

      <div className="mt-6 space-y-5">
        {messages.length === 0 && <p className="text-sm text-slate-500">No community shares yet.</p>}
        {messages.map((msg, index) => (
          <div key={msg.id} className="relative pl-10">
            <div className="absolute left-3 top-0 flex h-full flex-col items-center">
              <span className="relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white shadow-sm">
                <HeartActivityIcon className="h-4 w-4" />
              </span>
              {index !== messages.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-emerald-200" />}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                  Self-reported AFib dx
                </span>
                <span>{msg.diagnosis}</span>
                <span className="text-slate-300">•</span>
                <span>dx {msg.diagnosed}</span>
                <span className="text-slate-300">•</span>
                <span>{msg.timeAgo}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-900">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function toMessages(records: ClinicalPictureRecord[]): ClinicalMessage[] {
  return records.map((record) => ({
    id: record.id,
    timeAgo: formatTimeAgo(record.created_at),
    diagnosis: record.diagnosis || "Not stated",
    diagnosed: record.diagnosis_year ? String(record.diagnosis_year) : "Not stated",
    message: record.description || "",
  }));
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();

  const ranges: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    { limit: 60_000, divisor: 1_000, unit: "second" },
    { limit: 3_600_000, divisor: 60_000, unit: "minute" },
    { limit: 86_400_000, divisor: 3_600_000, unit: "hour" },
    { limit: 31_536_000_000, divisor: 86_400_000, unit: "day" },
  ];

  for (const range of ranges) {
    if (diffMs < range.limit) {
      const value = -Math.floor(diffMs / range.divisor);
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, range.unit);
    }
  }

  const years = -Math.floor(diffMs / 31_536_000_000);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(years, "year");
}


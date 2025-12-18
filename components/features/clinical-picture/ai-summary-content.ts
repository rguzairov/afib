export type AiSummaryStat = {
  label: string;
  value: string;
};

export type AiSummaryContent = {
  headline: string;
  updateNote: string;
  narrative: string;
  highlights: string[];
  stats: AiSummaryStat[];
};

export type ClinicalPictureSummaryRow = {
  summary: string;
  median_time_since_diagnosis_years: number | null;
  most_cited_onset_setting: string | null;
  common_cofactor: string | null;
  highlights: string[] | null;
  source_rows: number | null;
  created_at: string;
};

export function buildClinicalPictureSummaryContent(
  summaryRow: ClinicalPictureSummaryRow | null,
  options: { shareCount?: number | null } = {},
): AiSummaryContent {
  const hasSummary = Boolean(summaryRow);
  const total = hasSummary ? summaryRow?.source_rows ?? options.shareCount ?? undefined : undefined;
  const medianYears = summaryRow?.median_time_since_diagnosis_years;
  const onset = summaryRow?.most_cited_onset_setting?.trim() || "Not stated";
  const cofactor = summaryRow?.common_cofactor?.trim() || "Not stated";
  const highlights = (summaryRow?.highlights ?? []).filter(Boolean);
  const narrative = summaryRow?.summary?.trim() || "No AI summary available yet.";

  const formatMedian = () => {
    if (typeof medianYears === "number" && Number.isFinite(medianYears)) {
      const rounded = Math.round(medianYears);
      const unit = rounded === 1 ? "year" : "years";
      return `${rounded} ${unit}`;
    }
    return "Not stated";
  };

  return {
    headline: total ? `AI summary from ${total} clinical picture shares` : "AI summary",
    updateNote: "Updates every 24 hours as new clinical pictures are shared.",
    narrative,
    highlights,
    stats: hasSummary
      ? [
          { label: "Median time since diagnosis", value: formatMedian() },
          { label: "Most cited onset setting", value: onset },
          { label: "Common co-factor", value: cofactor },
        ]
      : [],
  };
}


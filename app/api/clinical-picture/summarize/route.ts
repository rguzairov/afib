import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { clampInt, sanitizeText } from "@/lib/validation";

export const runtime = "nodejs";

const summarySecret = process.env.CLINICAL_PICTURE_SUMMARY_SECRET;
const summaryModel = process.env.CLINICAL_PICTURE_SUMMARY_MODEL?.trim() || "gpt-4.1";
const summaryDbRowLimit = clampInt(process.env.CLINICAL_PICTURE_SUMMARY_DB_ROWS, 500, 50, 5_000);
const summaryModelRowLimit = clampInt(process.env.CLINICAL_PICTURE_SUMMARY_MODEL_ROWS, 120, 20, 500);
const summaryMaxDiagnosisChars = clampInt(process.env.CLINICAL_PICTURE_SUMMARY_MAX_DIAGNOSIS_CHARS, 120, 20, 240);
const summaryMaxDescriptionChars = clampInt(
  process.env.CLINICAL_PICTURE_SUMMARY_MAX_DESCRIPTION_CHARS,
  700,
  100,
  4_000,
);

type ClinicalPictureRow = {
  diagnosis: string | null;
  description: string | null;
  diagnosis_year: number | null;
  created_at: string;
};

type SummaryShape = {
  summary: string;
  onset_setting: string;
  cofactor: string;
  insights: string[];
};

// Keep GET guarded to avoid accidental public execution.
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: Request) {
  const providedSecret = getProvidedSecret(request);

  // In production (and other non-dev environments), require a secret for all invocations.
  // Do not rely on host / forwarded headers for auth decisions.
  const requireSecret = process.env.NODE_ENV !== "development";
  if (requireSecret) {
    if (!summarySecret) {
      console.error("CLINICAL_PICTURE_SUMMARY_SECRET is not configured; refusing access.");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (!providedSecret || providedSecret !== summarySecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const openAIApiKey = process.env.OPENAI_API_KEY;

  if (!openAIApiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const openai = new OpenAI({ apiKey: openAIApiKey });

    const { count: totalCount, error: countError } = await supabase
      .from("clinical_picture")
      .select("id", { count: "exact", head: true });

    if (countError) {
      console.error("Failed to count clinical pictures for summary", countError);
    }

    const { data, error } = await supabase
      .from("clinical_picture")
      .select("diagnosis, description, diagnosis_year, created_at")
      .order("created_at", { ascending: false })
      .limit(summaryDbRowLimit);

    if (error) {
      console.error("Failed to fetch clinical pictures for summary", error);
      return NextResponse.json({ error: "Failed to load clinical picture data." }, { status: 500 });
    }

    const rows = (data ?? []) as ClinicalPictureRow[];
    if (!rows.length) {
      return NextResponse.json({ error: "No clinical pictures available to summarize." }, { status: 400 });
    }

    const medianYears = computeMedianYearsSinceDiagnosis(rows);
    const sampled = sampleClinicalPictureRows(rows, summaryModelRowLimit);
    const prepared = sampled.map((row) => ({
      // Redact before truncation to avoid leaking partial emails/phones/URLs when cut mid-token.
      diagnosis: truncate(redactPII(sanitizeText(row.diagnosis)), summaryMaxDiagnosisChars),
      description: truncate(redactPII(sanitizeText(row.description)), summaryMaxDescriptionChars),
    }));

    const messages = buildMessages(prepared, {
      medianYears,
      totalRows: typeof totalCount === "number" ? totalCount : null,
      sampledRows: prepared.length,
    });

    const completion = await openai.chat.completions.create({
      model: summaryModel,
      response_format: { type: "json_object" },
      // Keep outputs stable + concise.
      temperature: 0.2,
      messages,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No summary generated." }, { status: 500 });
    }

    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(content) as unknown;
    } catch (err) {
      console.error("Failed to parse summary JSON", err);
      return NextResponse.json({ error: "Failed to parse summary content." }, { status: 500 });
    }

    const parsed = normalizeSummaryShape(parsedUnknown);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid summary content." }, { status: 500 });
    }

    const highlights = parsed.insights
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);

    const insertPayload = {
      summary: redactPII(parsed.summary.trim()),
      median_time_since_diagnosis_years: medianYears ?? null,
      most_cited_onset_setting: redactPII(parsed.onset_setting.trim()),
      common_cofactor: redactPII(parsed.cofactor.trim()),
      highlights: highlights.map((item) => redactPII(item)),
      source_rows: typeof totalCount === "number" ? totalCount : rows.length,
    };

    const { error: insertError } = await supabase.from("cp_summary").insert(insertPayload);
    if (insertError) {
      console.error("Failed to store clinical picture summary", insertError);
      return NextResponse.json({ error: "Failed to save summary." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      source_rows: typeof totalCount === "number" ? totalCount : rows.length,
      sampled_rows: prepared.length,
    });
  } catch (error) {
    console.error("Clinical picture summarize failed", error);
    return NextResponse.json({ error: "Unable to generate summary right now." }, { status: 500 });
  }
}

function computeMedianYearsSinceDiagnosis(rows: ClinicalPictureRow[]) {
  const currentYear = new Date().getFullYear();
  const deltas = rows
    .map((row) =>
      typeof row.diagnosis_year === "number" && Number.isFinite(row.diagnosis_year)
        ? currentYear - row.diagnosis_year
        : null,
    )
    .filter((value): value is number => value !== null && value >= 0)
    .sort((a, b) => a - b);

  if (!deltas.length) return null;
  const mid = Math.floor(deltas.length / 2);
  const median =
    deltas.length % 2 === 0 ? (deltas[mid - 1] + deltas[mid]) / 2 : deltas[mid];

  // Round to an integer so downstream rendering shows whole years.
  return Math.round(median);
}

function buildMessages(
  rows: Array<{ diagnosis: string; description: string }>,
  meta: { medianYears: number | null; totalRows: number | null; sampledRows: number },
) {
  const system = [
    "You summarize anonymous AFib experience submissions for learning and pattern-spotting.",
    "No medical advice: do not instruct, recommend, diagnose, or suggest treatments; avoid 'should/try/avoid' and avoid second-person ('you/your').",
    "Be calm, neutral, factual, and privacy-preserving: do not quote verbatim; do not include names, locations, exact dates/times, or identifying details.",
    "Only use information supported by the provided data; do not invent details. If uncertain or missing, write 'Not stated'.",
    "Write for clarity and comprehension while staying concise.",
    "Output must be valid JSON only with keys: summary, onset_setting, cofactor, insights.",
    "Constraints:",
    "- summary: maximum 10 sentences.",
    "- onset_setting: the most frequently mentioned onset setting; short phrase (<= 6 words).",
    "- cofactor: the most frequently mentioned cofactor/trigger; short phrase (<= 6 words).",
    "- insights: exactly 3 items; each item <= 18 words; describe commonly reported patterns or experiences (not advice).",
  ].join("\n");

  const totalLine =
    typeof meta.totalRows === "number" ? `Total submissions (pre-count): ${meta.totalRows}` : "Total submissions: Not stated";

  const userParts = [
    totalLine,
    meta.medianYears !== null
      ? `Median years since diagnosis (pre-computed): ${meta.medianYears}`
      : "Median years since diagnosis: Not stated",
    `Sampled entries provided: ${meta.sampledRows}`,
    "Data (array of entries):",
    JSON.stringify(
      rows.map((r) => ({
        diagnosis: r.diagnosis,
        description: r.description,
      })),
    ),
  ];

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: userParts.join("\n") },
  ];
}

function getProvidedSecret(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret?.trim() ?? null;
}

function normalizeSummaryShape(value: unknown): SummaryShape | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const summary = typeof obj.summary === "string" ? obj.summary : null;
  const onset_setting = typeof obj.onset_setting === "string" ? obj.onset_setting : null;
  const cofactor = typeof obj.cofactor === "string" ? obj.cofactor : null;
  const insights = Array.isArray(obj.insights) ? obj.insights.filter((x): x is string => typeof x === "string") : null;

  if (!summary || !onset_setting || !cofactor || !insights || insights.length === 0) return null;
  return { summary, onset_setting, cofactor, insights };
}

function truncate(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  if (maxChars <= 1) return value.slice(0, maxChars);
  return `${value.slice(0, maxChars - 1)}…`;
}

function sampleClinicalPictureRows(rows: ClinicalPictureRow[], limit: number): ClinicalPictureRow[] {
  if (rows.length <= limit) return rows;

  const recentCount = Math.min(40, Math.max(10, Math.floor(limit / 3)));
  const recent = rows.slice(0, recentCount);
  const rest = rows.slice(recentCount);

  const remaining = limit - recent.length;
  const sampledRest = sampleWithoutReplacement(rest, remaining);
  return [...recent, ...sampledRest];
}

function sampleWithoutReplacement<T>(items: T[], count: number): T[] {
  if (count <= 0) return [];
  if (items.length <= count) return items;

  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function redactPII(text: string) {
  if (!text) return "";

  // Keep these conservative: they're a last-line defense against accidentally storing/displaying PII.
  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const url = /\bhttps?:\/\/\S+\b/gi;
  const www = /\bwww\.\S+\b/gi;
  const domain = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi;
  const handle = /(^|\s)@[\w.]{3,}\b/g;
  const phoneCandidate = /(\+?\d[\d\s().-]{8,}\d)/g;
  const address =
    /\b\d{1,6}\s+[a-z0-9.'-]+(?:\s+[a-z0-9.'-]+){0,4}\s+(st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive)\b/gi;

  let output = text.replace(email, "[redacted email]");
  output = output.replace(url, "[redacted link]");
  output = output.replace(www, "[redacted link]");
  output = output.replace(domain, "[redacted link]");
  output = output.replace(handle, "$1@[redacted]");
  output = output.replace(address, "[redacted address]");

  output = output.replace(phoneCandidate, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 10) return "[redacted phone]";
    return match;
  });

  return output.trim();
}

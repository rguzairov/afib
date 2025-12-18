import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { DISEASE_ELEMENT_TYPE_IDS } from "@/lib/disease-elements";

export const runtime = "nodejs";
const VOTE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const VOTE_RATE_LIMIT_MAX_REQUESTS = 12;

type AnswerRecord = {
  elementId?: number;
  answer?: boolean;
};

type RequestPayload = {
  answers?: AnswerRecord[];
};

type ValidatedAnswer = {
  element_id: number;
  answer: boolean;
};

export async function POST(request: Request) {
  let payload: RequestPayload;

  try {
    payload = (await request.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const rateKey = ip ? `votes:${ip}` : null;
  if (rateKey) {
    const limited = checkRateLimit(rateKey, {
      windowMs: VOTE_RATE_LIMIT_WINDOW_MS,
      maxRequests: VOTE_RATE_LIMIT_MAX_REQUESTS,
    });

    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSeconds) },
        },
      );
    }
  }

  const validated = validatePayload(payload);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const filtered = await filterValidElementAnswers(supabase, validated.value);
  if (!filtered.ok) {
    return NextResponse.json({ error: filtered.error }, { status: filtered.status ?? 400 });
  }

  try {
    const { error } = await supabase.from("disease_element_answers").insert(filtered.value);

    if (error) {
      console.error("Failed to save disease element answers", error);
      return NextResponse.json({ error: "Unable to save answers right now." }, { status: 500 });
    }

    await revalidateDiseaseElementCaches(supabase, filtered.value.map((row) => row.element_id));
  } catch (error) {
    console.error("Disease element answer submission failed", error);
    return NextResponse.json({ error: "Unable to save answers right now." }, { status: 500 });
  }

  return NextResponse.json({ success: true, saved: filtered.value.length });
}

function validatePayload(payload: RequestPayload):
  | { ok: true; value: ValidatedAnswer[] }
  | { ok: false; error: string } {
  const answers = Array.isArray(payload.answers) ? payload.answers : [];

  if (!answers.length) {
    return { ok: false, error: "No answers provided." };
  }

  const sanitized: ValidatedAnswer[] = [];
  const seenIds = new Set<number>();
  for (const entry of answers) {
    const elementId = entry?.elementId;
    const answer = entry?.answer;

    if (typeof elementId !== "number" || !Number.isInteger(elementId)) continue;
    if (typeof answer !== "boolean") continue;

    if (seenIds.has(elementId)) continue;
    seenIds.add(elementId);
    sanitized.push({ element_id: elementId, answer });
  }

  if (!sanitized.length) {
    return { ok: false, error: "No valid answers provided." };
  }

  if (sanitized.length > 50) {
    return { ok: false, error: "Too many answers submitted at once." };
  }

  return { ok: true, value: sanitized };
}

async function filterValidElementAnswers(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  answers: ValidatedAnswer[],
): Promise<
  | { ok: true; value: ValidatedAnswer[] }
  | { ok: false; error: string; status?: number }
> {
  const elementIds = answers.map((row) => row.element_id);
  const uniqueIds = Array.from(new Set(elementIds));

  const { data, error } = await supabase
    .from("disease_element")
    .select("id, type_id")
    .in("id", uniqueIds);

  if (error) {
    console.error("Failed to validate disease elements", error);
    return { ok: false, error: "Unable to validate answers right now.", status: 500 };
  }

  const allowedTypeIds = new Set<number>(DISEASE_ELEMENT_TYPE_IDS);
  const validIds = new Set(
    ((data as { id: number; type_id: number | null }[] | null) ?? [])
      .filter((row) => typeof row.type_id === "number" && Number.isInteger(row.type_id) && allowedTypeIds.has(row.type_id))
      .map((row) => row.id),
  );

  const filtered = answers.filter((row) => validIds.has(row.element_id));

  if (!filtered.length) {
    return { ok: false, error: "No valid answers provided." };
  }

  return { ok: true, value: filtered };
}

async function revalidateDiseaseElementCaches(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  elementIds: number[],
) {
  const uniqueIds = Array.from(new Set(elementIds)).slice(0, 200);
  const typeIds = new Set<number>();

  if (uniqueIds.length) {
    const { data, error } = await supabase
      .from("disease_element")
      .select("id, type_id")
      .in("id", uniqueIds);

    if (error) {
      console.error("Failed to resolve disease element types for cache invalidation", error);
    } else {
      ((data as { id: number; type_id: number | null }[] | null) ?? []).forEach((row) => {
        if (typeof row.type_id === "number" && Number.isInteger(row.type_id)) {
          typeIds.add(row.type_id);
        }
      });
    }
  }

  if (!typeIds.size) {
    DISEASE_ELEMENT_TYPE_IDS.forEach((id) => typeIds.add(id));
  }

  revalidateTag("disease-element-count:all", "max");
  for (const typeId of typeIds) {
    revalidateTag(`disease-element-count:${typeId}`, "max");
    revalidateTag(`disease-element-stats:${typeId}`, "max");
  }
}

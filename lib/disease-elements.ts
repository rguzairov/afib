import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase";
import { unstable_cache } from "next/cache";

export const DISEASE_ELEMENT_TYPE_IDS = [1, 2, 3] as const;
export type DiseaseElementTypeId = (typeof DISEASE_ELEMENT_TYPE_IDS)[number];

export function isValidDiseaseElementTypeId(value: number): value is DiseaseElementTypeId {
  return DISEASE_ELEMENT_TYPE_IDS.includes(value as DiseaseElementTypeId);
}

export type DiseaseElementCard = {
  id?: number;
  title: string;
  description: string;
};

export type DiseaseElementStat = {
  id: number;
  name: string;
  description: string;
  yes: number;
  no: number;
};

const STATS_CACHE_REVALIDATE_SECONDS = 60;
const COUNT_CACHE_REVALIDATE_SECONDS = 60;

export async function countDiseaseElementAnswers(typeId?: DiseaseElementTypeId): Promise<number> {
  const key = typeId ? String(typeId) : "all";
  return unstable_cache(
    () => countDiseaseElementAnswersUncached(typeId),
    ["disease-element-count", key],
    { revalidate: COUNT_CACHE_REVALIDATE_SECONDS, tags: [`disease-element-count:${key}`] },
  )();
}

async function countDiseaseElementAnswersUncached(typeId?: DiseaseElementTypeId): Promise<number> {
  const supabase = getSupabaseServerClient();

  const query = supabase.from("disease_element_answers").select("element_id", { count: "exact", head: true });

  if (typeId) {
    const { data: ids, error: idsError } = await supabase
      .from("disease_element")
      .select("id")
      .eq("type_id", typeId);

    if (idsError) {
      console.error("Failed to load element ids for counting", idsError);
      return 0;
    }

    const elementIds = (ids as { id: number }[] | null)?.map((row) => row.id) ?? [];
    if (!elementIds.length) return 0;
    query.in("element_id", elementIds);
  }

  const { count, error } = await query;
  if (error) {
    console.error("Failed to count disease element answers", error);
    return 0;
  }

  return count ?? 0;
}

type DiseaseElementRow = {
  id: number | null;
  name: string | null;
  description: string | null;
};

export async function fetchDiseaseElementCards(typeId: DiseaseElementTypeId): Promise<DiseaseElementCard[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("disease_element")
    .select("id, name, description")
    .eq("type_id", typeId);

  if (error) {
    console.error("Failed to load disease elements", error);
    return [];
  }

  const cards =
    (data as DiseaseElementRow[] | null)
      ?.map((row) => ({
        id: typeof row.id === "number" ? row.id : undefined,
        title: row.name?.trim() ?? "",
        description: row.description?.trim() ?? "",
      }))
      .filter((row) => row.title.length > 0) ?? [];

  return shuffle(cards);
}

export async function fetchDiseaseElementStats(typeId: DiseaseElementTypeId): Promise<DiseaseElementStat[]> {
  return unstable_cache(
    () => fetchDiseaseElementStatsUncached(typeId),
    ["disease-element-stats", String(typeId)],
    { revalidate: STATS_CACHE_REVALIDATE_SECONDS, tags: [`disease-element-stats:${typeId}`] },
  )();
}

async function fetchDiseaseElementStatsUncached(typeId: DiseaseElementTypeId): Promise<DiseaseElementStat[]> {
  const supabase = getSupabaseServerClient();

  const { data: elements, error: elementError } = await supabase
    .from("disease_element")
    .select("id, name, description")
    .eq("type_id", typeId);

  if (elementError) {
    console.error("Failed to load disease elements for stats", elementError);
    return [];
  }

  const elementRows =
    (elements as { id: number; name: string | null; description: string | null }[] | null) ?? [];
  if (!elementRows.length) return [];

  const elementIds = elementRows.map((row) => row.id);

  const counts = new Map<number, { yes: number; no: number }>();
  for (const id of elementIds) {
    counts.set(id, { yes: 0, no: 0 });
  }

  const { data: aggregates, error: aggregateError } = await supabase.rpc(
    "count_answers_by_elements",
    { _element_ids: elementIds },
  );

  if (aggregateError) {
    console.error("Failed to aggregate disease element answers", aggregateError);
  }

  type AnswerAggregateRow = {
    element_id: number | null;
    yes_answer: number | null;
    no_answer: number | null;
  };

  ((aggregates as AnswerAggregateRow[] | null) ?? []).forEach((row) => {
    if (typeof row.element_id !== "number") return;
    const bucket = counts.get(row.element_id);
    if (!bucket) return;

    const yesCount = typeof row.yes_answer === "number" ? row.yes_answer : Number(row.yes_answer);
    const noCount = typeof row.no_answer === "number" ? row.no_answer : Number(row.no_answer);

    if (Number.isFinite(yesCount) && yesCount > 0) bucket.yes += yesCount;
    if (Number.isFinite(noCount) && noCount > 0) bucket.no += noCount;
  });

  return elementRows.map((row) => {
    const bucket = counts.get(row.id) ?? { yes: 0, no: 0 };
    return {
      id: row.id,
      name: (row.name ?? "").trim() || "Untitled",
      description: (row.description ?? "").trim(),
      yes: bucket.yes,
      no: bucket.no,
    };
  });
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

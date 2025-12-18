"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { postJson } from "@/lib/http";
import { markTableCacheInvalidated } from "@/lib/table-cache";

type Choice = "yes" | "no" | "skip";
const MAX_ANSWERS_PER_REQUEST = 50;

export type SurveyCard = {
  id?: number;
  title: string;
  description: string;
};

export type SurveyCopy = {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  addHref: string;
  addLabel: string;
  completedTitle: string;
  completedDescription: string;
};

type SurveyPageProps = {
  copy: SurveyCopy;
  cards: SurveyCard[];
};

export default function SurveyPage(props: SurveyPageProps) {
  const cardsKey = props.cards.map((card) => card.id ?? card.title).join("|");
  return <SurveyPageInner key={cardsKey} {...props} />;
}

function SurveyPageInner({ copy, cards }: SurveyPageProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<Choice | null>>(cards.map(() => null));
  const [completed, setCompleted] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  const current = cards[index];
  const answeredCount = useMemo(() => answers.filter(Boolean).length, [answers]);

  const votes = useMemo(
    () =>
      answers.reduce(
        (acc, answer) => {
          if (answer) acc[answer] += 1;
          return acc;
        },
        { yes: 0, no: 0, skip: 0 }
      ),
    [answers]
  );

  const progress = useMemo(() => {
    if (completed) return 100;
    return (answeredCount / cards.length) * 100;
  }, [answeredCount, cards.length, completed]);

  const buildAnswerPayload = (choices: Array<Choice | null>) => {
    return cards
      .map((card, idx) => ({ cardId: card.id, choice: choices[idx] }))
      .filter(
        (entry): entry is { cardId: number; choice: Exclude<Choice, "skip"> } =>
          typeof entry.cardId === "number" && entry.choice !== null && entry.choice !== "skip",
      )
      .map((entry) => ({
        elementId: entry.cardId,
        answer: entry.choice === "yes",
      }));
  };

  const persistAnswers = async (choices: Array<Choice | null>) => {
    const entries = buildAnswerPayload(choices);
    if (!entries.length) return { ok: true as const, saved: 0 };

    setSaveState("saving");
    setSaveError("");
    setSavedCount(0);

    let savedTotal = 0;
    for (let start = 0; start < entries.length; start += MAX_ANSWERS_PER_REQUEST) {
      const batch = entries.slice(start, start + MAX_ANSWERS_PER_REQUEST);
      try {
        await postJson<{ ok?: boolean }>("/api/disease-element/answers", { answers: batch });

        savedTotal += batch.length;
        setSavedCount(savedTotal);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to save answers right now.";
        setSaveState("error");
        setSaveError(message);
        return { ok: false as const, saved: savedTotal, error: message };
      }
    }

    setSaveState("saved");
    markTableCacheInvalidated(copy.backHref);
    return { ok: true as const, saved: savedTotal };
  };

  const handleVote = (choice: Choice) => {
    const nextAnswers = [...answers];
    nextAnswers[index] = choice;
    setAnswers(nextAnswers);

    const nextIndex = index + 1;
    const finished = nextIndex >= cards.length;

    if (finished) {
      setCompleted(true);
      setIndex(cards.length - 1);
      void persistAnswers(nextAnswers);
    } else {
      setIndex(nextIndex);
    }
  };

  const goPrev = () => {
    setIndex((prev) => Math.max(0, prev - 1));
    setCompleted(false);
    setSaveState("idle");
    setSaveError("");
    setSavedCount(0);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">{copy.title}</h1>
          <p className="text-sm text-slate-500">{copy.description}</p>
        </div>
        <Link href={copy.backHref} className="text-sm font-semibold text-slate-700 hover:text-slate-900">
          {copy.backLabel} →
        </Link>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white/95 p-5 shadow-sm">
        <div className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-emerald-600 transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{completed ? "Complete" : `Card ${index + 1} of ${cards.length}`}</span>
            <span className="flex items-center gap-2">
              <span>
                Yes {votes.yes} · No {votes.no} · Skip {votes.skip}
              </span>
              {saveState === "saving" && (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <span className="animate-pulse">●</span>
                  Saving {savedCount ? `${savedCount}/` : ""}
                  {Math.max(0, answers.filter((a) => a === "yes" || a === "no").length)}
                </span>
              )}
            </span>
          </div>
        </div>

        {!completed && current && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{current.title}</p>
              <p className="text-sm text-slate-500">{current.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={goPrev}
                disabled={index === 0}
                className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white sm:col-span-1"
              >
                ← Previous card
              </button>
              <button
                onClick={() => handleVote("yes")}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:translate-y-px"
              >
                <span className="text-base leading-none">✓</span>
                <span>Yes</span>
              </button>
              <button
                onClick={() => handleVote("no")}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 active:translate-y-px"
              >
                <span className="text-base leading-none">✕</span>
                <span>No</span>
              </button>
              <button
                onClick={() => handleVote("skip")}
                className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:col-span-1"
              >
                Skip card →
              </button>
            </div>
          </div>
        )}

        {completed && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{copy.completedTitle}</p>
              <p className="text-sm text-slate-500">{copy.completedDescription}</p>
              {saveState === "saving" && (
                <p className="mt-2 text-sm text-slate-600">Saving your responses…</p>
              )}
              {saveState === "saved" && (
                <p className="mt-2 text-sm text-emerald-700">Saved {savedCount} responses.</p>
              )}
              {saveState === "error" && (
                <p className="mt-2 text-sm text-rose-600" aria-live="assertive">
                  {saveError || "Unable to save your responses right now. Please try again."}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {saveState === "saving" ? (
                <>
                  <span
                    className="cursor-not-allowed rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-400 shadow-sm"
                    aria-disabled="true"
                  >
                    {copy.backLabel}
                  </span>
                  <span
                    className="cursor-not-allowed rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-400 shadow-sm"
                    aria-disabled="true"
                  >
                    {copy.addLabel}
                  </span>
                </>
              ) : (
                <>
                  <Link
                    href={copy.backHref}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    {copy.backLabel}
                  </Link>
                  <Link
                    href={copy.addHref}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    {copy.addLabel}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

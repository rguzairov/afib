"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { type DiseaseElementTypeId } from "@/lib/disease-elements";
import { postJson } from "@/lib/http";
import { markTableCacheInvalidated } from "@/lib/table-cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextArea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

export type AddPageCopy = {
  pageTitle: string;
  pageDescription: string;
  nameLabel: string;
  namePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  submitLabel: string;
  savedLabel: string;
  nameId?: string;
  descriptionId?: string;
};

type AddPageProps = {
  copy: AddPageCopy;
  typeId: DiseaseElementTypeId;
  redirectHref?: string;
};

export default function AddPage({ copy, typeId, redirectHref }: AddPageProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(false);
    setSubmitError("");

    const name = title.trim();
    const details = description.trim();

    if (!name) {
      setSubmitError("Name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await postJson<{ ok?: boolean }>("/api/disease-element", {
        name,
        description: details || null,
        typeId,
      });

      if (redirectHref) {
        markTableCacheInvalidated(redirectHref);
        router.push(redirectHref);
        return;
      }

      setSubmitted(true);
      setTitle("");
      setDescription("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error occurred.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nameId = copy.nameId ?? "entry-title";
  const descriptionId = copy.descriptionId ?? "entry-description";

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">{copy.pageTitle}</h1>
        <p className="text-sm text-slate-500">{copy.pageDescription}</p>
      </header>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-emerald-100 bg-white/95 p-5 shadow-sm"
      >
        <div className="space-y-2">
          <Label htmlFor={nameId}>{copy.nameLabel}</Label>
          <Input
            id={nameId}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSubmitted(false);
              setSubmitError("");
            }}
            required
            placeholder={copy.namePlaceholder}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={descriptionId}>{copy.descriptionLabel}</Label>
          <TextArea
            id={descriptionId}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSubmitted(false);
              setSubmitError("");
            }}
            placeholder={copy.descriptionPlaceholder}
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="border-white/80 border-t-white" />
                Saving...
              </span>
            ) : (
              copy.submitLabel
            )}
          </Button>
          {submitted && !submitError && <span className="text-sm text-emerald-700">{copy.savedLabel}</span>}
        </div>
        {submitError && (
          <p className="text-sm text-rose-600" aria-live="assertive">
            {submitError}
          </p>
        )}
      </form>
    </div>
  );
}

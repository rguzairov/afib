"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormField } from "@/components/ui/form-field";
import { Spinner } from "@/components/ui/spinner";
import { TurnstileWidget, useTurnstileController } from "@/components/turnstile-widget";

export const shareCopy = {
  title: "Share your clinical picture",
  description:
    "Please only contribute if you have an AFib diagnosis to keep comparisons accurate.",
  diagnosisLabel: "Diagnosis",
  diagnosisPlaceholder: "Paroxysmal, persistent, post-ablation, etc.",
  diagnosisYearLabel: "Diagnosis year",
  diagnosisYearPlaceholder: "2021",
  clinicalPictureLabel: "Clinical picture",
  clinicalPicturePlaceholder:
    "Describe your onset setting (time, posture, trigger), sensations, and what shortens an episode. Avoid personal identifiers.",
  submitLabel: "Share anonymously",
  savedLabel: "Saved. Thank you for contributing.",
  helper: "Self-reported and shown without personal identifiers.",
};


export function ClinicalPictureShareForm() {
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisYear, setDiagnosisYear] = useState("");
  const [clinicalPicture, setClinicalPicture] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const turnstile = useTurnstileController();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitted(false);

    const captchaToken = turnstile.getToken();

    if (!captchaToken) {
      setSubmitError("Please complete the captcha before submitting.");
      return;
    }

    const diagnosisText = diagnosis.trim();
    const descriptionText = clinicalPicture.trim();
    const yearValue = diagnosisYear.trim();
    const diagnosisYearNumber = yearValue ? Number(yearValue) : null;

    setIsSubmitting(true);
    try {
      await postJson<{ success: true }>("/api/clinical-picture", {
        diagnosis: diagnosisText,
        description: descriptionText,
        diagnosisYear: diagnosisYearNumber,
        captchaToken,
        acknowledged,
      });

      setSubmitted(true);
      setDiagnosis("");
      setDiagnosisYear("");
      setClinicalPicture("");
      setAcknowledged(false);
      turnstile.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error occurred.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      <header className="flex flex-col gap-1">
        <p className="text-xl font-semibold text-slate-900">{shareCopy.title}</p>
        <p className="text-sm text-slate-500">{shareCopy.description}</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm min-w-0 sm:p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="clinical-diagnosis" label={shareCopy.diagnosisLabel}>
            <Input
              id="clinical-diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              required
              placeholder={shareCopy.diagnosisPlaceholder}
            />
          </FormField>

          <FormField id="diagnosis-year" label={shareCopy.diagnosisYearLabel}>
            <Input
              id="diagnosis-year"
              type="number"
              inputMode="numeric"
              min="1900"
              max="2100"
              value={diagnosisYear}
              onChange={(e) => setDiagnosisYear(e.target.value)}
              placeholder={shareCopy.diagnosisYearPlaceholder}
            />
          </FormField>
        </div>

        <div className="space-y-2">
          <FormField id="clinical-picture" label={shareCopy.clinicalPictureLabel}>
            <TextArea
              id="clinical-picture"
              value={clinicalPicture}
              onChange={(e) => setClinicalPicture(e.target.value)}
              required
              rows={4}
              placeholder={shareCopy.clinicalPicturePlaceholder}
            />
          </FormField>
          <CheckboxField
            label={shareCopy.helper}
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            required
          />
        </div>

        <div className="space-y-2">
          {turnstileSiteKey ? (
            <>
              <div className="max-w-full overflow-x-auto">
                <div className="min-w-[300px]">
                  <TurnstileWidget siteKey={turnstileSiteKey} controller={turnstile} />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-700">Captcha is not configured.</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting || !turnstileSiteKey || !turnstile.ready}>
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="border-white/80 border-t-white" />
                Submitting...
              </span>
            ) : (
              shareCopy.submitLabel
            )}
          </Button>
          {submitted && !submitError && (
            <span className="text-sm text-emerald-700" aria-live="polite">
              {shareCopy.savedLabel}
            </span>
          )}
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

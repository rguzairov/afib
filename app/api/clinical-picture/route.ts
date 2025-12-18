import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { env } from "@/lib/env";

export const runtime = "nodejs";
const CLINICAL_PICTURE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const CLINICAL_PICTURE_RATE_LIMIT_MAX_REQUESTS = 6;

type ClinicalPicturePayload = {
  diagnosis?: string;
  description?: string;
  diagnosisYear?: number | null;
  captchaToken?: string;
  acknowledged?: boolean;
};

type ValidatedPayload = {
  diagnosis: string;
  description: string;
  diagnosisYear: number | null;
};

type ClinicalPictureRecord = {
  id: number;
  created_at: string;
  diagnosis: string | null;
  description: string | null;
  diagnosis_year: number | null;
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateKey = ip ? `clinical-picture:create:${ip}` : null;
  if (rateKey) {
    const limited = checkRateLimit(rateKey, {
      windowMs: CLINICAL_PICTURE_RATE_LIMIT_WINDOW_MS,
      maxRequests: CLINICAL_PICTURE_RATE_LIMIT_MAX_REQUESTS,
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

  let payload: ClinicalPicturePayload;

  try {
    payload = (await request.json()) as ClinicalPicturePayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const captchaToken = payload.captchaToken?.trim() ?? "";

  if (!captchaToken) {
    return NextResponse.json({ error: "Captcha is required." }, { status: 400 });
  }

  const captchaValid = await verifyCaptcha(captchaToken);
  if (!captchaValid) {
    return NextResponse.json({ error: "Captcha validation failed." }, { status: 400 });
  }

  const validated = validatePayload(payload);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const safePayload = validated.value;

  try {
    const supabase = getSupabaseServerClient();
    const insertPayload = {
      diagnosis: safePayload.diagnosis,
      description: safePayload.description,
      diagnosis_year: safePayload.diagnosisYear,
    };

    const { error } = await supabase.from("clinical_picture").insert(insertPayload);

    if (error) {
      console.error("Failed to save clinical picture submission", error);
      return NextResponse.json(
        { error: "Unable to save right now. Please try again." },
        { status: 500 },
      );
    }

    revalidateTag("clinical-picture-feed", "max");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clinical picture submission failed", error);
    return NextResponse.json(
      { error: "Unable to save right now. Please try again." },
      { status: 500 },
    );
  }
}

async function verifyCaptcha(token: string) {
  return verifyTurnstileToken(token, env.TURNSTILE_SECRET_KEY);
}

function validatePayload(payload: ClinicalPicturePayload):
  | { ok: true; value: ValidatedPayload }
  | { ok: false; error: string } {
  const diagnosisText = sanitizeText(payload.diagnosis);
  const descriptionText = sanitizeText(payload.description);
  const acknowledged = payload.acknowledged === true;

  if (!diagnosisText) {
    return { ok: false, error: "Diagnosis is required." };
  }
  if (diagnosisText.length > 240) {
    return { ok: false, error: "Diagnosis must be 240 characters or less." };
  }

  if (!descriptionText || descriptionText.length < 20) {
    return { ok: false, error: "Clinical picture is required and must be at least 20 characters." };
  }
  if (descriptionText.length > 4000) {
    return { ok: false, error: "Clinical picture must be 4000 characters or less." };
  }

  if (containsProhibitedContent(`${diagnosisText}\n${descriptionText}`)) {
    return { ok: false, error: "Please remove personal contact info or links (emails, phone numbers, handles, URLs)." };
  }

  const yearRaw = payload.diagnosisYear;
  let year: number | null = null;
  if (yearRaw !== undefined && yearRaw !== null) {
    if (typeof yearRaw !== "number" || !Number.isInteger(yearRaw)) {
      return { ok: false, error: "Diagnosis year must be a whole number." };
    }
    const currentYear = new Date().getFullYear();
    if (yearRaw < 1900 || yearRaw > currentYear) {
      return { ok: false, error: `Diagnosis year must be between 1900 and ${currentYear}.` };
    }
    year = yearRaw;
  }

  if (!acknowledged) {
    return { ok: false, error: "Please confirm this is a self-reported AFib diagnosis before submitting." };
  }

  return {
    ok: true,
    value: {
      diagnosis: diagnosisText,
      description: descriptionText,
      diagnosisYear: year,
    },
  };
}

function containsProhibitedContent(text: string) {
  const lower = text.toLowerCase();
  const hasUrl = /https?:\/\/|www\./i.test(lower) || /\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/i.test(lower);
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
  const hasHandle = /(^|\s)@[\w.]{3,}\b/.test(text) && !hasEmail;
  const hasPhone = containsPhoneNumber(text);
  const hasAddress =
    /\b\d{1,6}\s+[a-z0-9.'-]+(?:\s+[a-z0-9.'-]+){0,4}\s+(st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive)\b/i.test(
      lower,
    );

  return hasUrl || hasEmail || hasHandle || hasPhone || hasAddress;
}

function containsPhoneNumber(text: string) {
  // Broad detection with a digit-count guard to reduce false positives.
  const candidates = text.match(/(\+?\d[\d\s().-]{8,}\d)/g) ?? [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length >= 10) return true;
  }
  return false;
}

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  type DiseaseElementTypeId,
  isValidDiseaseElementTypeId,
} from "@/lib/disease-elements";
import { env } from "@/lib/env";

export const runtime = "nodejs";
const DISEASE_ELEMENT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const DISEASE_ELEMENT_RATE_LIMIT_MAX_REQUESTS = 12;

type DiseaseElementPayload = {
  name?: string;
  description?: string;
  typeId?: number;
  captchaToken?: string;
};

type ValidatedPayload = {
  name: string;
  description: string | null;
  typeId: DiseaseElementTypeId;
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateKey = ip ? `disease-element:create:${ip}` : null;
  if (rateKey) {
    const limited = checkRateLimit(rateKey, {
      windowMs: DISEASE_ELEMENT_RATE_LIMIT_WINDOW_MS,
      maxRequests: DISEASE_ELEMENT_RATE_LIMIT_MAX_REQUESTS,
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

  let payload: DiseaseElementPayload;

  try {
    payload = (await request.json()) as DiseaseElementPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { captchaToken } = payload;

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

  const { name, description, typeId } = validated.value;

  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("disease_element").insert({
      name,
      description,
      type_id: typeId,
    });

    if (error) {
      console.error("Failed to save disease element", error);
      return NextResponse.json(
        { error: "Unable to save right now. Please try again." },
        { status: 500 },
      );
    }

    revalidateTag("disease-element-count:all", "max");
    revalidateTag(`disease-element-count:${typeId}`, "max");
    revalidateTag(`disease-element-stats:${typeId}`, "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disease element submission failed", error);
    return NextResponse.json(
      { error: "Unable to save right now. Please try again." },
      { status: 500 },
    );
  }
}

function validatePayload(payload: DiseaseElementPayload):
  | { ok: true; value: ValidatedPayload }
  | { ok: false; error: string } {
  const name = sanitizeText(payload.name);
  const descriptionRaw = sanitizeText(payload.description);
  const typeId = Number(payload.typeId);

  if (!name) {
    return { ok: false, error: "Name is required." };
  }
  if (name.length > 120) {
    return { ok: false, error: "Name must be 120 characters or less." };
  }

  const description = descriptionRaw || null;
  if (description && description.length > 800) {
    return { ok: false, error: "Description must be 800 characters or less." };
  }

  if (containsProhibitedContent(`${name}\n${description ?? ""}`)) {
    return {
      ok: false,
      error: "Please remove personal contact info or links (emails, phone numbers, handles, URLs).",
    };
  }

  if (!Number.isInteger(typeId) || !isValidDiseaseElementTypeId(typeId)) {
    return { ok: false, error: "Unknown category for this submission." };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      typeId: typeId as DiseaseElementTypeId,
    },
  };
}

async function verifyCaptcha(token: string) {
  return verifyTurnstileToken(token, env.TURNSTILE_SECRET_KEY);
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

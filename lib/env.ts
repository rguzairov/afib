import "server-only";

type EnvShape = {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string | undefined;
  SUPABASE_ANON_KEY: string | undefined;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  OPENAI_API_KEY?: string;
  CLINICAL_PICTURE_SUMMARY_SECRET?: string;
};

function requireEnv(name: keyof EnvShape, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Evaluate once at module load to fail fast during boot/build.
const envCache = (() => {
  const SUPABASE_URL = requireEnv("SUPABASE_URL", process.env.SUPABASE_URL);
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_PUBLISHABLE_KEY && !SUPABASE_ANON_KEY) {
    throw new Error("Missing SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY environment variable.");
  }

  return {
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    CLINICAL_PICTURE_SUMMARY_SECRET: process.env.CLINICAL_PICTURE_SUMMARY_SECRET,
  } satisfies EnvShape;
})();

export const env = envCache;

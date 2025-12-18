import "server-only";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token: string, secret: string) {
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    });

    const data = (await response.json()) as { success?: boolean };
    return Boolean(data?.success);
  } catch (error) {
    console.error("Captcha validation request failed", error);
    return false;
  }
}

export { TURNSTILE_VERIFY_URL };

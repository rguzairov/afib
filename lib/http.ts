export async function readApiError(response: Response) {
  let raw = "";
  try {
    raw = await response.text();
  } catch {
    // ignore
  }

  const text = raw.trim();
  if (text) {
    try {
      const data = JSON.parse(text) as { error?: unknown; message?: unknown };
      const error = typeof data?.error === "string" ? data.error.trim() : "";
      if (error) return error;
      const message = typeof data?.message === "string" ? data.message.trim() : "";
      if (message) return message;
    } catch {
      // ignore
    }
    return text;
  }

  return `Request failed (${response.status})`;
}

export async function postJson<TResponse>(
  input: RequestInfo | URL,
  body: unknown,
  init: Omit<RequestInit, "method" | "body"> = {},
) {
  const response = await fetch(input, {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  try {
    return (await response.json()) as TResponse;
  } catch {
    throw new Error("Invalid server response.");
  }
}

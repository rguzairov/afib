"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

export type Turnstile = {
  render: (element: HTMLElement, options: { sitekey: string }) => string | undefined;
  reset: (widgetId?: string | null) => void;
  getResponse: (widgetId?: string | null) => string;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

type TurnstileWidgetProps = {
  siteKey?: string;
  controller?: TurnstileController;
  onReady?: () => void;
};

export type TurnstileController = {
  widgetId: string | null;
  ready: boolean;
  setId: (id: string | null) => void;
  setReady: (ready: boolean) => void;
  getToken: () => string;
  reset: () => void;
};

export function useTurnstileController(): TurnstileController {
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const setId = (id: string | null) => setWidgetId(id);

  const getToken = () => {
    if (typeof window === "undefined") return "";
    const token = widgetId
      ? window.turnstile?.getResponse(widgetId)
      : window.turnstile?.getResponse();
    return token?.trim() ?? "";
  };

  const reset = () => {
    if (typeof window === "undefined") return;
    if (widgetId) {
      window.turnstile?.reset(widgetId);
    } else {
      window.turnstile?.reset();
    }
  };

  return { widgetId, setId, ready, setReady, getToken, reset };
}

export function TurnstileWidget({ siteKey, controller, onReady }: TurnstileWidgetProps) {
  const captchaRef = useRef<HTMLDivElement>(null);
  const fallback = useTurnstileController();
  const { widgetId, setId, ready, setReady } = controller ?? fallback;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.turnstile) setReady(true);
  }, [setReady]);

  useEffect(() => {
    if (!siteKey || !ready || !captchaRef.current || widgetId) return;

    const id = window.turnstile?.render(captchaRef.current, { sitekey: siteKey });
    if (typeof id === "string") setId(id);
  }, [ready, siteKey, widgetId, setId]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        strategy="afterInteractive"
        onReady={() => {
          setReady(true);
          onReady?.();
        }}
      />
      <div ref={captchaRef} />
    </>
  );
}

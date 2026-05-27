import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  extractFromFile,
  extractFromSite,
  extractFromUrl,
} from "../lib/api";
import type { ExtractParams, ExtractResponse } from "../types";

export type ExtractStatus = "idle" | "loading" | "success" | "error";

/** Remembers what produced the current palette so we can re-extract on param change. */
type Source =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string }
  | { kind: "site"; url: string }
  | null;

interface UseExtractPalette {
  status: ExtractStatus;
  data: ExtractResponse | null;
  error: string | null;
  source: Source;
  extractFile: (file: File, params: ExtractParams) => Promise<void>;
  extractUrl: (url: string, params: ExtractParams) => Promise<void>;
  extractSite: (url: string, params: ExtractParams) => Promise<void>;
  /** Re-run the last source with new params; no-op if there is no source. */
  reextract: (params: ExtractParams) => Promise<void>;
  /** Abort any in-flight request and return to the idle state. */
  reset: () => void;
}

// Backstop so a hung or very slow request can never lock the UI in "loading".
// Generous enough to absorb a Render free-tier cold start; the user can also
// Cancel manually at any time.
const REQUEST_TIMEOUT_MS = 45000;

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "AbortError"
  );
}

export function useExtractPalette(): UseExtractPalette {
  const [status, setStatus] = useState<ExtractStatus>("idle");
  const [data, setData] = useState<ExtractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source>(null);

  // Guards against an out-of-order response overwriting a newer one.
  const requestId = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const run = useCallback(
    async (
      src: Exclude<Source, null>,
      params: ExtractParams,
    ): Promise<void> => {
      const id = ++requestId.current;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setSource(src);
      setStatus("loading");
      setError(null);

      clearTimer();
      let timedOut = false;
      timeoutRef.current = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const res =
          src.kind === "file"
            ? await extractFromFile(src.file, params, controller.signal)
            : src.kind === "url"
              ? await extractFromUrl(src.url, params, controller.signal)
              : await extractFromSite(src.url, params.limit, controller.signal);
        if (id !== requestId.current) return; // a newer request superseded this one
        setData(res);
        setStatus("success");
      } catch (err) {
        if (id !== requestId.current) return; // superseded or cancelled via reset()
        const message = isAbortError(err)
          ? "The request timed out — the server may be waking up. Please try again."
          : err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Something went wrong while extracting the palette.";
        // An abort only reaches here on timeout; user cancels bump requestId.
        if (isAbortError(err) && !timedOut) return;
        setError(message);
        setStatus("error");
      } finally {
        clearTimer();
      }
    },
    [],
  );

  const extractFile = useCallback(
    (file: File, params: ExtractParams) => run({ kind: "file", file }, params),
    [run],
  );

  const extractUrl = useCallback(
    (url: string, params: ExtractParams) => run({ kind: "url", url }, params),
    [run],
  );

  const extractSite = useCallback(
    (url: string, params: ExtractParams) => run({ kind: "site", url }, params),
    [run],
  );

  const reextract = useCallback(
    (params: ExtractParams) => {
      if (!source) return Promise.resolve();
      return run(source, params);
    },
    [run, source],
  );

  const reset = useCallback(() => {
    requestId.current++;
    controllerRef.current?.abort();
    clearTimer();
    setStatus("idle");
    setData(null);
    setError(null);
    setSource(null);
  }, []);

  // Abort any in-flight request when the component unmounts.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      clearTimer();
    };
  }, []);

  return {
    status,
    data,
    error,
    source,
    extractFile,
    extractUrl,
    extractSite,
    reextract,
    reset,
  };
}

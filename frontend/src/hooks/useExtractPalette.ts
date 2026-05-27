import { useCallback, useRef, useState } from "react";
import { ApiError, extractFromFile, extractFromUrl } from "../lib/api";
import type { ExtractParams, ExtractResponse } from "../types";

export type ExtractStatus = "idle" | "loading" | "success" | "error";

/** Remembers what produced the current palette so we can re-extract on param change. */
type Source =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string }
  | null;

interface UseExtractPalette {
  status: ExtractStatus;
  data: ExtractResponse | null;
  error: string | null;
  source: Source;
  extractFile: (file: File, params: ExtractParams) => Promise<void>;
  extractUrl: (url: string, params: ExtractParams) => Promise<void>;
  /** Re-run the last source with new params; no-op if there is no source. */
  reextract: (params: ExtractParams) => Promise<void>;
  reset: () => void;
}

export function useExtractPalette(): UseExtractPalette {
  const [status, setStatus] = useState<ExtractStatus>("idle");
  const [data, setData] = useState<ExtractResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Source>(null);

  // Guards against an out-of-order response overwriting a newer one.
  const requestId = useRef(0);

  const run = useCallback(
    async (
      src: Exclude<Source, null>,
      params: ExtractParams,
    ): Promise<void> => {
      const id = ++requestId.current;
      setSource(src);
      setStatus("loading");
      setError(null);
      try {
        const res =
          src.kind === "file"
            ? await extractFromFile(src.file, params)
            : await extractFromUrl(src.url, params);
        if (id !== requestId.current) return; // a newer request superseded this one
        setData(res);
        setStatus("success");
      } catch (err) {
        if (id !== requestId.current) return;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Something went wrong while extracting the palette.";
        setError(message);
        setStatus("error");
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

  const reextract = useCallback(
    (params: ExtractParams) => {
      if (!source) return Promise.resolve();
      return run(source, params);
    },
    [run, source],
  );

  const reset = useCallback(() => {
    requestId.current++;
    setStatus("idle");
    setData(null);
    setError(null);
    setSource(null);
  }, []);

  return {
    status,
    data,
    error,
    source,
    extractFile,
    extractUrl,
    reextract,
    reset,
  };
}

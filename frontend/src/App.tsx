import { Clock, ImageOff, Layers, Loader2, Moon, Sparkles, Sun } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { ColorBlindness } from "./components/ColorBlindness";
import { ContrastMatrix } from "./components/ContrastMatrix";
import { Controls } from "./components/Controls";
import { DonutChart } from "./components/DonutChart";
import { Dropzone } from "./components/Dropzone";
import { ExportMenu } from "./components/ExportMenu";
import { Harmony } from "./components/Harmony";
import { PaletteGrid } from "./components/PaletteGrid";
import { Shades } from "./components/Shades";
import { SourcePreview } from "./components/SourcePreview";
import { Button } from "./components/ui/Button";
import { PaletteSkeleton } from "./components/ui/Skeleton";
import { ToastViewport } from "./components/ui/Toast";
import type { ToastData } from "./components/ui/Toast";
import { useCopyToClipboard } from "./hooks/useCopyToClipboard";
import { useExtractPalette } from "./hooks/useExtractPalette";
import { useTheme } from "./hooks/useTheme";
import { warmUp } from "./lib/api";
import type { ColorFormat, ExtractParams } from "./types";

const DEFAULT_PARAMS: ExtractParams = {
  limit: 6,
  tolerance: 16,
  mode: "fast",
  ignore_alpha: true,
};

export default function App() {
  const [params, setParams] = useState<ExtractParams>(DEFAULT_PARAMS);
  const [format, setFormat] = useState<ColorFormat>("hex");
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastId = useRef(0);

  const {
    status,
    data,
    error,
    source,
    extractFile,
    extractUrl,
    extractSite,
    reextract,
    reset,
  } = useExtractPalette();
  const { copy } = useCopyToClipboard();
  const { theme, toggle: toggleTheme } = useTheme();

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const reextractTimer = useRef<number | null>(null);

  // Wake the free-tier backend while the user picks an image, so the first
  // real request isn't blocked by a cold start.
  useEffect(() => {
    warmUp();
  }, []);

  const pushToast = useCallback(
    (message: string, tone: ToastData["tone"] = "default") => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev, { id, message, tone }]);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleCopy = useCallback(
    async (value: string, label?: string) => {
      const ok = await copy(value);
      if (ok) {
        pushToast(label ? `Copied ${label}` : `Copied ${value}`);
      } else {
        pushToast("Could not copy to clipboard.", "error");
      }
    },
    [copy, pushToast],
  );

  // Bring the results area into view as soon as an extraction starts or
  // finishes, so the loading state is visible right away.
  useEffect(() => {
    if ((status === "loading" || status === "success") && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  // Surface API errors as a toast.
  useEffect(() => {
    if (status === "error" && error) {
      pushToast(error, "error");
    }
  }, [status, error, pushToast]);

  // Re-extract when params change AND we already have a source. Debounced so
  // dragging a slider fires one request after the user settles, not one per
  // step (which would trip the backend rate limit).
  const onParamsChange = useCallback(
    (next: ExtractParams) => {
      setParams(next);
      if (!source) return;
      if (reextractTimer.current) window.clearTimeout(reextractTimer.current);
      reextractTimer.current = window.setTimeout(() => {
        void reextract(next);
      }, 400);
    },
    [reextract, source],
  );

  // Clear any pending debounced re-extract on unmount.
  useEffect(() => {
    return () => {
      if (reextractTimer.current) window.clearTimeout(reextractTimer.current);
    };
  }, []);

  const onFile = useCallback(
    (file: File) => void extractFile(file, params),
    [extractFile, params],
  );
  const onUrl = useCallback(
    (url: string) => void extractUrl(url, params),
    [extractUrl, params],
  );
  const onSite = useCallback(
    (url: string) => void extractSite(url, params),
    [extractSite, params],
  );

  // Keyboard shortcuts: Esc resets, Cmd/Ctrl+V pastes an image and extracts.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        reset();
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            pushToast("Extracting pasted image…");
            void extractFile(file, params);
          }
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, [extractFile, params, pushToast, reset]);

  const isLoading = status === "loading";

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        {/* Header */}
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-accent-400">
              <Sparkles className="h-5 w-5" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-500">
                palette extractor
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title="Toggle light / dark"
              className="grid h-9 w-9 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-ink-300 hover:text-ink-100"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
            colour-palette-analysis
          </h1>
          <p className="max-w-xl text-ink-400">
            Extract dominant colours from any image, with proportions.
          </p>
        </header>

        {/* Input area */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Dropzone
            onFile={onFile}
            onUrl={onUrl}
            onSite={onSite}
            onError={(msg) => pushToast(msg, "error")}
            disabled={isLoading}
          />
          <Controls
            params={params}
            onChange={onParamsChange}
            disabled={isLoading}
          />
        </section>

        {/* Results */}
        <section ref={resultsRef} className="scroll-mt-6">
          {isLoading && (
            <div className="flex flex-col gap-5">
              <div className="card flex items-center gap-4 p-4">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-accent-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-100">
                    Analysing your image…
                  </p>
                  <p className="text-xs text-ink-500">
                    Extracting dominant colours. The free server can take a
                    moment to wake on the first request.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={reset}>
                  Cancel
                </Button>
              </div>
              <PaletteSkeleton />
            </div>
          )}

          {!isLoading && status === "success" && data && (
            <div className="flex animate-fade-in flex-col gap-8">
              {source && (
                <SourcePreview
                  file={source.kind === "file" ? source.file : undefined}
                  url={source.kind === "url" ? source.url : undefined}
                />
              )}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
                <PaletteGrid
                  colors={data.colors}
                  format={format}
                  onFormatChange={setFormat}
                  onCopy={(v) => handleCopy(v)}
                />
                <div className="flex justify-center lg:justify-end">
                  <DonutChart colors={data.colors} />
                </div>
              </div>

              <Harmony
                colors={data.colors}
                onCopy={(value, label) => handleCopy(value, label)}
              />

              <Shades
                colors={data.colors}
                onCopy={(value, label) => handleCopy(value, label)}
              />

              <ContrastMatrix colors={data.colors} />

              <ColorBlindness colors={data.colors} />

              <Meta meta={data.meta} />

              <ExportMenu
                colors={data.colors}
                onCopy={(value, label) => handleCopy(value, label)}
                onNotify={(msg) => pushToast(msg)}
                onError={(msg) => pushToast(msg, "error")}
              />
            </div>
          )}

          {!isLoading && status !== "success" && (
            <EmptyState errored={status === "error"} />
          )}
        </section>

        <footer className="pt-4 text-center text-xs text-ink-600">
          Drop an image, paste a URL, or press ⌘/Ctrl+V. Press Esc to reset.
        </footer>
      </div>

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

function EmptyState({ errored }: { errored: boolean }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-800 text-ink-500">
        {errored ? (
          <ImageOff className="h-6 w-6" />
        ) : (
          <Layers className="h-6 w-6" />
        )}
      </span>
      <p className="text-sm font-medium text-ink-200">
        {errored ? "That didn't work" : "No palette yet"}
      </p>
      <p className="max-w-sm text-sm text-ink-500">
        {errored
          ? "Try a different image or URL, then adjust the parameters above."
          : "Add an image above to extract its dominant colours and see them ranked by proportion."}
      </p>
    </div>
  );
}

function Meta({ meta }: { meta: import("./types").ExtractMeta }) {
  const [w, h] = meta.image_size;
  const stats: { icon: JSX.Element; label: string; value: string }[] = [
    meta.mode === "site"
      ? {
          icon: <Layers className="h-4 w-4" />,
          label: "Source",
          value: "Website CSS",
        }
      : {
          icon: <Layers className="h-4 w-4" />,
          label: "Image",
          value: `${w} × ${h}`,
        },
    {
      icon: <Clock className="h-4 w-4" />,
      label: "Processed in",
      value: `${meta.processing_ms} ms`,
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      label: "Mode",
      value: meta.mode,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="card flex items-center gap-3 px-4 py-3 text-sm"
        >
          <span className="text-accent-400">{s.icon}</span>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-ink-500">
              {s.label}
            </span>
            <span className="font-mono capitalize text-ink-100">{s.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

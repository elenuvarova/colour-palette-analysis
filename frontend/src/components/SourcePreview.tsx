import { ImageOff, X } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "./ui/IconButton";

interface SourcePreviewProps {
  /** Provide exactly one: an uploaded File or a remote image URL. */
  file?: File;
  url?: string;
}

/**
 * Thumbnail of the image the current palette was extracted from, so the result
 * stays tied to its source. Files use an object URL (revoked on change); URLs
 * load directly. A broken/blocked remote image falls back to a placeholder.
 * Click the thumbnail to enlarge in a lightbox.
 */
export function SourcePreview({ file, url }: SourcePreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    setBroken(false);
    if (file) {
      const created = URL.createObjectURL(file);
      setObjectUrl(created);
      return () => URL.revokeObjectURL(created);
    }
    setObjectUrl(null);
  }, [file]);

  // Close lightbox on Escape (stopPropagation so it doesn't reset the app).
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setLightbox(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightbox]);

  const src = file ? objectUrl : url;
  const label = file ? file.name : url;
  if (!src) return null;

  return (
    <>
      <div className="card-compact flex items-center gap-4">
        {broken ? (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-ink-500">
            <ImageOff className="h-5 w-5" />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="shrink-0 overflow-hidden rounded-lg border border-ink-700 transition-transform hover:scale-[1.03]"
            aria-label="Enlarge analysed image"
            title="Click to enlarge"
          >
            <img
              src={src}
              alt="Analysed source"
              onError={() => setBroken(true)}
              className="h-16 w-16 object-cover"
            />
          </button>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ink-500">
            Analysed image
          </p>
          <p className="truncate font-mono text-xs text-ink-300" title={label}>
            {label}
          </p>
        </div>
      </div>

      {lightbox && !broken && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Analysed image, full size"
          onClick={() => setLightbox(false)}
        >
          <img
            src={src}
            alt="Analysed source, full size"
            className="max-h-[90vh] max-w-[90vw] rounded-xl border border-ink-700 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute right-4 top-4">
            <IconButton
              size="sm"
              variant="overlay"
              onClick={() => setLightbox(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      )}
    </>
  );
}

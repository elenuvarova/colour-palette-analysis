import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

interface SourcePreviewProps {
  /** Provide exactly one: an uploaded File or a remote image URL. */
  file?: File;
  url?: string;
}

/**
 * Thumbnail of the image the current palette was extracted from, so the result
 * stays tied to its source. Files use an object URL (revoked on change); URLs
 * load directly. A broken/blocked remote image falls back to a placeholder.
 */
export function SourcePreview({ file, url }: SourcePreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    if (file) {
      const created = URL.createObjectURL(file);
      setObjectUrl(created);
      return () => URL.revokeObjectURL(created);
    }
    setObjectUrl(null);
  }, [file]);

  const src = file ? objectUrl : url;
  const label = file ? file.name : url;
  if (!src) return null;

  return (
    <div className="card-compact flex items-center gap-4">
      {broken ? (
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-ink-700 bg-ink-850 text-ink-500">
          <ImageOff className="h-5 w-5" />
        </span>
      ) : (
        <img
          src={src}
          alt="Analysed source"
          onError={() => setBroken(true)}
          className="h-16 w-16 shrink-0 rounded-lg border border-ink-700 object-cover"
        />
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
  );
}

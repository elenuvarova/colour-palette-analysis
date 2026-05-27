import { clsx } from "clsx";
import { ImageIcon, Link2, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import type { FileRejection } from "react-dropzone";
import { Button } from "./ui/Button";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

interface DropzoneProps {
  onFile: (file: File) => void;
  onUrl: (url: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function Dropzone({ onFile, onUrl, onError, disabled }: DropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  // Revoke the object URL when the preview changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const acceptFile = useCallback(
    (file: File) => {
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      setFileName(file.name);
      onFile(file);
    },
    [onFile],
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const code = rejections[0].errors[0]?.code;
        if (code === "file-too-large") {
          onError("That image is larger than 10 MB.");
        } else if (code === "file-invalid-type") {
          onError("Please choose an image file.");
        } else {
          onError(rejections[0].errors[0]?.message ?? "That file was rejected.");
        }
        return;
      }
      const file = accepted[0];
      if (file) acceptFile(file);
    },
    [acceptFile, onError],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    // Match the formats the backend accepts (JPEG/PNG/WebP).
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxSize: MAX_BYTES,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled,
  });

  const clearPreview = () => {
    setPreview(null);
    setFileName(null);
  };

  const submitUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      onError("Paste an image URL first.");
      return;
    }
    try {
      // Basic shape validation; the backend does the real fetching.
      const parsed = new URL(trimmed);
      if (!/^https?:$/.test(parsed.protocol)) {
        onError("URL must start with http:// or https://");
        return;
      }
    } catch {
      onError("That does not look like a valid URL.");
      return;
    }
    onUrl(trimmed);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={clsx(
          "card relative flex flex-col items-center justify-center gap-3 px-6 py-10 text-center transition-colors",
          isDragActive
            ? "border-accent-500 bg-accent-500/5"
            : "border-dashed hover:border-ink-700",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="relative">
              <img
                src={preview}
                alt={fileName ?? "Selected image preview"}
                className="max-h-44 rounded-xl border border-ink-700 object-contain"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearPreview();
                }}
                aria-label="Remove image"
                className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-ink-700 bg-ink-900 text-ink-300 hover:text-ink-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="max-w-full truncate font-mono text-xs text-ink-400">
              {fileName}
            </p>
            <Button variant="secondary" size="sm" type="button" onClick={open}>
              Choose a different image
            </Button>
          </div>
        ) : (
          <>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-800 text-accent-400">
              <UploadCloud className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-ink-100">
                Drag an image here
              </p>
              <p className="text-xs text-ink-500">
                PNG, JPG or WebP — up to 10 MB
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={open}
              icon={<ImageIcon className="h-4 w-4" />}
            >
              Browse files
            </Button>
            <p className="text-xs text-ink-600">
              or press{" "}
              <kbd className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[11px] text-ink-300">
                ⌘/Ctrl + V
              </kbd>{" "}
              to paste
            </p>
          </>
        )}
      </div>

      {/* URL entry */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            type="url"
            inputMode="url"
            placeholder="Paste an image URL"
            value={url}
            disabled={disabled}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitUrl();
            }}
            className="h-11 w-full rounded-xl border border-ink-700 bg-ink-850 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-500 focus:border-accent-500/60"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={submitUrl}
          disabled={disabled}
        >
          Extract from URL
        </Button>
      </div>
    </div>
  );
}

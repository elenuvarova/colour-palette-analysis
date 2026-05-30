import { Check, RotateCcw, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedBlob, type PixelArea } from "../lib/cropImage";
import { Button } from "./ui/Button";
import { IconButton } from "./ui/IconButton";
import { SectionHeader } from "./ui/SectionHeader";
import { Segmented } from "./ui/Segmented";
import { Slider } from "./ui/Slider";

interface ImageEditorProps {
  /** Object URL or remote URL of the image to edit. */
  src: string;
  onApply: (file: File) => void;
  onClose: () => void;
  onError: (message: string) => void;
}

type Point = { x: number; y: number };

const ASPECTS: { label: string; value: number | "free" }[] = [
  { label: "Free", value: "free" },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:4", value: 3 / 4 },
  { label: "9:16", value: 9 / 16 },
];

export function ImageEditor({ src, onApply, onClose, onError }: ImageEditorProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [naturalAspect, setNaturalAspect] = useState(4 / 3);
  const [aspectKey, setAspectKey] = useState<number | "free">("free");
  const [pixels, setPixels] = useState<PixelArea | null>(null);
  const [busy, setBusy] = useState(false);

  const aspect = aspectKey === "free" ? naturalAspect : aspectKey;

  // Close on Escape, in the capture phase so the app-wide Esc-reset doesn't
  // also fire and wipe the results behind the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspectKey("free");
  };

  const handleApply = useCallback(async () => {
    if (!pixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(src, pixels, rotation);
      onApply(new File([blob], "cropped.png", { type: "image/png" }));
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Could not crop the image.",
      );
    } finally {
      setBusy(false);
    }
  }, [pixels, src, rotation, onApply, onError]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit image"
      onClick={onClose}
    >
      <div
        className="card flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <SectionHeader
          title="Crop & rotate"
          action={
            <IconButton size="sm" variant="ghost" onClick={onClose} aria-label="Close editor">
              <X className="h-4 w-4" />
            </IconButton>
          }
        />

        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black sm:h-96">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_, areaPixels) => setPixels(areaPixels)}
            onMediaLoaded={(media) =>
              setNaturalAspect(media.naturalWidth / media.naturalHeight)
            }
          />
        </div>

        <Slider
          label="Zoom"
          value={zoom}
          min={1}
          max={3}
          step={0.01}
          onChange={setZoom}
          formatValue={(v) => `${v.toFixed(2)}×`}
        />

        <Slider
          label="Rotation"
          value={rotation}
          min={0}
          max={360}
          step={1}
          onChange={setRotation}
          formatValue={(v) => `${Math.round(v)}°`}
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-400">Rotate 90°</span>
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
              aria-label="Rotate left 90 degrees"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCw className="h-4 w-4" />}
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label="Rotate right 90 degrees"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-400">Ratio</span>
            <Segmented
              options={ASPECTS.map((a) => ({ value: a.value, label: a.label }))}
              value={aspectKey}
              onChange={setAspectKey}
              ariaLabel="Crop aspect ratio"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-ink-800 pt-4">
          <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
            Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Check className="h-4 w-4" />}
            onClick={handleApply}
            disabled={busy || !pixels}
          >
            {busy ? "Applying…" : "Apply & analyse"}
          </Button>
        </div>
      </div>
    </div>
  );
}

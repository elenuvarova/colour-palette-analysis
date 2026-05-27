import {
  Braces,
  ClipboardCopy,
  Code2,
  Download,
  FileJson,
  ImageDown,
  Palette,
} from "lucide-react";
import {
  copyPaletteImage,
  downloadBlob,
  downloadText,
  paletteToAse,
  paletteToPngBlob,
  toCssVariables,
  toJsonString,
  toTailwindConfig,
} from "../lib/exports";
import type { PaletteColor } from "../types";
import { Button } from "./ui/Button";

interface ExportMenuProps {
  colors: PaletteColor[];
  onCopy: (value: string, label: string) => void;
  onNotify: (message: string) => void;
  onError: (message: string) => void;
}

export function ExportMenu({
  colors,
  onCopy,
  onNotify,
  onError,
}: ExportMenuProps) {
  const handlePng = async () => {
    try {
      const blob = await paletteToPngBlob(colors);
      downloadBlob(blob, "palette.png");
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Could not generate the PNG.",
      );
    }
  };

  const handleAse = () => {
    try {
      const blob = paletteToAse(colors);
      downloadBlob(blob, "palette.ase");
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Could not generate the ASE file.",
      );
    }
  };

  const handleCopyImage = async () => {
    try {
      await copyPaletteImage(colors);
      onNotify("Copied palette image");
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Could not copy the image.",
      );
    }
  };

  return (
    <div className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
        Export
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Code2 className="h-4 w-4" />}
          onClick={() => onCopy(toCssVariables(colors), "CSS variables")}
        >
          Copy CSS variables
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Braces className="h-4 w-4" />}
          onClick={() => onCopy(toTailwindConfig(colors), "Tailwind config")}
        >
          Copy Tailwind config
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<FileJson className="h-4 w-4" />}
          onClick={() =>
            downloadText(
              toJsonString(colors),
              "palette.json",
              "application/json",
            )
          }
        >
          Download .json
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<ImageDown className="h-4 w-4" />}
          onClick={handlePng}
        >
          Download palette.png
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<ClipboardCopy className="h-4 w-4" />}
          onClick={handleCopyImage}
        >
          Copy palette image
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Palette className="h-4 w-4" />}
          onClick={handleAse}
        >
          Download .ase
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          onClick={() =>
            onCopy(
              colors.map((c) => c.hex.toUpperCase()).join(", "),
              "Hex list",
            )
          }
        >
          Copy hex list
        </Button>
      </div>
    </div>
  );
}

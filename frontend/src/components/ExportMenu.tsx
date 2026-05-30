import {
  Braces,
  ClipboardCopy,
  Code2,
  Download,
  FileJson,
  Hash,
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
  toDesignTokens,
  toGimpPalette,
  toJsonString,
  toScss,
  toSvgSwatches,
  toTailwindConfig,
  toTailwindV4Theme,
} from "../lib/exports";
import type { PaletteColor } from "../types";
import { Button } from "./ui/Button";
import { SectionHeader } from "./ui/SectionHeader";

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
      downloadBlob(await paletteToPngBlob(colors), "palette.png");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not generate the PNG.");
    }
  };

  const handleAse = () => {
    try {
      downloadBlob(paletteToAse(colors), "palette.ase");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not generate the ASE file.");
    }
  };

  const handleCopyImage = async () => {
    try {
      await copyPaletteImage(colors);
      onNotify("Copied palette image");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not copy the image.");
    }
  };

  return (
    <div className="card flex flex-col gap-4 p-6">
      <SectionHeader title="Export" />

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-500">Copy</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Code2 className="h-4 w-4" />}
            onClick={() => onCopy(toCssVariables(colors), "CSS variables")}
          >
            CSS variables
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Braces className="h-4 w-4" />}
            onClick={() => onCopy(toTailwindConfig(colors), "Tailwind config")}
          >
            Tailwind config
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Braces className="h-4 w-4" />}
            onClick={() => onCopy(toTailwindV4Theme(colors), "Tailwind v4 @theme")}
          >
            Tailwind v4 @theme
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Code2 className="h-4 w-4" />}
            onClick={() => onCopy(toScss(colors), "SCSS variables")}
          >
            SCSS variables
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Hash className="h-4 w-4" />}
            onClick={() =>
              onCopy(colors.map((c) => c.hex.toUpperCase()).join(", "), "Hex list")
            }
          >
            Hex list
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<ClipboardCopy className="h-4 w-4" />}
            onClick={handleCopyImage}
          >
            Palette image
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-500">
          Download
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<FileJson className="h-4 w-4" />}
            onClick={() =>
              downloadText(toJsonString(colors), "palette.json", "application/json")
            }
          >
            .json
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileJson className="h-4 w-4" />}
            onClick={() =>
              downloadText(toDesignTokens(colors), "tokens.json", "application/json")
            }
          >
            Design tokens
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Palette className="h-4 w-4" />}
            onClick={handleAse}
          >
            .ase (Adobe)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Palette className="h-4 w-4" />}
            onClick={() =>
              downloadText(toGimpPalette(colors), "palette.gpl", "text/plain")
            }
          >
            .gpl (GIMP)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={() =>
              downloadText(toSvgSwatches(colors), "palette.svg", "image/svg+xml")
            }
          >
            .svg swatches
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<ImageDown className="h-4 w-4" />}
            onClick={handlePng}
          >
            palette.png
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PDFDocument, decodePDFRawStream } from "pdf-lib";
import { Upload, Gauge, Download, FileCheck2, X, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Level = "light" | "standard" | "aggressive";

const LEVELS: { id: Level; label: string; description: string; quality: number }[] = [
  { id: "light", label: "Light", description: "Minimal compression, maximum quality", quality: 0.85 },
  { id: "standard", label: "Standard", description: "Balanced size and quality", quality: 0.65 },
  { id: "aggressive", label: "Aggressive", description: "Smallest file, reduced quality", quality: 0.40 },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function savingsPercent(original: number, compressed: number) {
  if (original === 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
}

export default function PdfCompress() {
  usePageMeta({
    title: "Compress PDF Online Free | Reduce PDF File Size | PdfSigns",
    description: "Reduce your PDF file size online for free. Choose light, standard or aggressive compression — all processing happens in your browser, nothing is uploaded.",
    canonical: "https://pdfsigns.co.uk/pdf-compress",
  });
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("standard");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ bytes: Uint8Array; size: number } | null>(null);
  const { toast } = useToast();

  const handleFile = useCallback((f: File) => {
    if (!f.type.includes("pdf") && !f.name.endsWith(".pdf")) {
      toast({ title: "Please upload a PDF file", variant: "destructive" });
      return;
    }
    setFile(f);
    setResult(null);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const compress = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const srcBytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });

      const chosenLevel = LEVELS.find(l => l.id === level)!;
      const quality = chosenLevel.quality;

      // Re-compress image XObjects using canvas
      const pages = doc.getPages();
      for (const page of pages) {
        const { node } = page;
        const resources = node.Resources();
        if (!resources) continue;

        const xObjectDict = resources.XObject();
        if (!xObjectDict) continue;

        const keys = xObjectDict.keys();
        for (const key of keys) {
          const xObj = xObjectDict.lookup(key);
          if (!xObj || typeof xObj !== "object") continue;

          try {
            // Only process image XObjects that have raw stream data
            const raw = xObj as any;
            if (!raw.dict || !raw.contents) continue;

            const subtype = raw.dict.get?.("Subtype");
            if (!subtype || subtype.encodedName !== "/Image") continue;

            const widthObj = raw.dict.get?.("Width");
            const heightObj = raw.dict.get?.("Height");
            const width = typeof widthObj?.value === "function" ? widthObj.value() : widthObj?.numberValue;
            const height = typeof heightObj?.value === "function" ? heightObj.value() : heightObj?.numberValue;

            if (!width || !height || width < 32 || height < 32) continue;

            // Decode raw stream bytes
            let imgBytes: Uint8Array;
            try {
              imgBytes = decodePDFRawStream(raw).decode();
            } catch {
              continue;
            }

            // Try to render via canvas
            const blob = new Blob([imgBytes], { type: "image/jpeg" });
            const url = URL.createObjectURL(blob);

            await new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = async () => {
                try {
                  const canvas = document.createElement("canvas");
                  const targetW = Math.round(width * (level === "aggressive" ? 0.7 : level === "standard" ? 0.85 : 1));
                  const targetH = Math.round(height * (level === "aggressive" ? 0.7 : level === "standard" ? 0.85 : 1));
                  canvas.width = targetW;
                  canvas.height = targetH;
                  const ctx = canvas.getContext("2d")!;
                  ctx.drawImage(img, 0, 0, targetW, targetH);

                  canvas.toBlob(async (blob2) => {
                    if (blob2) {
                      const recompressedBytes = new Uint8Array(await blob2.arrayBuffer());
                      // Embed back as JPEG
                      const embeddedImg = await doc.embedJpg(recompressedBytes);
                      // Update the XObject dictionary dimensions
                      raw.dict.set?.("Width", embeddedImg.width);
                      raw.dict.set?.("Height", embeddedImg.height);
                    }
                    resolve();
                  }, "image/jpeg", quality);
                } catch {
                  resolve();
                }
              };
              img.onerror = () => resolve();
              img.src = url;
            });

            URL.revokeObjectURL(url);
          } catch {
            // Skip this image, continue
          }
        }
      }

      // Save with object streams (main lossless compression)
      const compressed = await doc.save({ useObjectStreams: true, addDefaultPage: false });
      setResult({ bytes: compressed, size: compressed.byteLength });
    } catch {
      toast({ title: "Failed to compress PDF. The file may be encrypted.", variant: "destructive" });
    }

    setIsProcessing(false);
  };

  const download = () => {
    if (!result || !file) return;
    const blob = new Blob([result.bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(/\.pdf$/i, "_compressed.pdf");
    a.click();
    URL.revokeObjectURL(url);
  };

  const savings = result && file ? savingsPercent(file.size, result.size) : 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-3">PDF Compressor</h1>
          <p className="text-muted-foreground text-lg">
            Reduce your PDF file size without sending it to any server.
          </p>
        </div>

        {!file ? (
          <div
            data-testid="dropzone-compress"
            onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer ${
              isDraggingOver
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
            }`}
            onClick={() => document.getElementById("compress-file-input")?.click()}
          >
            <input
              id="compress-file-input"
              data-testid="input-compress-file"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
            <Upload className="h-12 w-12 text-primary/60 mx-auto mb-5" />
            <p className="font-semibold text-foreground text-xl">Drop your PDF here or click to browse</p>
            <p className="text-muted-foreground text-sm mt-2">All processing happens locally — your file never leaves your device</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File info */}
            <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm">
              <div className="bg-primary/10 p-2.5 rounded-lg">
                <FileCheck2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">Original size: {formatSize(file.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => { setFile(null); setResult(null); }}
                data-testid="button-clear-file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Compression level */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Compression Level
              </p>
              <div className="grid grid-cols-3 gap-3">
                {LEVELS.map(l => (
                  <button
                    key={l.id}
                    data-testid={`button-level-${l.id}`}
                    onClick={() => { setLevel(l.id); setResult(null); }}
                    className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                      level === l.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <span className={`text-sm font-bold mb-1 ${level === l.id ? "text-primary" : "text-foreground"}`}>
                      {l.label}
                    </span>
                    <span className="text-xs text-muted-foreground leading-snug">{l.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className={`rounded-2xl border p-6 text-center space-y-4 ${
                savings > 0 ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800" : "bg-card"
              }`}>
                <div className="flex justify-center gap-10">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Original</p>
                    <p className="text-2xl font-bold text-foreground">{formatSize(file.size)}</p>
                  </div>
                  <div className="flex items-center">
                    <ArrowDown className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Compressed</p>
                    <p className="text-2xl font-bold text-foreground">{formatSize(result.size)}</p>
                  </div>
                </div>
                {savings > 0 ? (
                  <p className="text-green-700 dark:text-green-400 font-semibold text-lg">
                    Saved {savings}% — {formatSize(file.size - result.size)} smaller
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    This PDF is already well-optimised — minimal additional compression was possible.
                  </p>
                )}
                <Button
                  onClick={download}
                  className="w-full"
                  size="lg"
                  data-testid="button-download"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Compressed PDF
                </Button>
              </div>
            )}

            {!result && (
              <Button
                onClick={compress}
                disabled={isProcessing}
                className="w-full"
                size="lg"
                data-testid="button-compress"
              >
                <Gauge className="h-4 w-4 mr-2" />
                {isProcessing ? "Compressing..." : "Compress PDF"}
              </Button>
            )}

            {result && (
              <Button
                variant="outline"
                onClick={() => { setResult(null); }}
                className="w-full"
                data-testid="button-try-again"
              >
                Try a Different Level
              </Button>
            )}
          </div>
        )}

        {!file && (
          <div className="mt-8 bg-card border rounded-2xl p-6">
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">How it works</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary font-bold rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs">1</span>
                Upload your PDF — it stays entirely on your device
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary font-bold rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs">2</span>
                Choose a compression level — Light preserves quality, Aggressive gives the smallest file
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary font-bold rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs">3</span>
                Click Compress and download your smaller PDF
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

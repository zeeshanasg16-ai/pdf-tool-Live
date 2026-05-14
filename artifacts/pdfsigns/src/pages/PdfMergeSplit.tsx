import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { FilePlus2, Scissors, Upload, Trash2, ChevronUp, ChevronDown, Download, ArrowLeftRight, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Mode = "merge" | "split";

interface PdfFile {
  id: string;
  file: File;
  name: string;
  pageCount: number | null;
}

interface SplitRange {
  id: string;
  from: string;
  to: string;
}

export default function PdfMergeSplit() {
  const [mode, setMode] = useState<Mode>("merge");
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [splitFile, setSplitFile] = useState<PdfFile | null>(null);
  const [splitRanges, setSplitRanges] = useState<SplitRange[]>([{ id: crypto.randomUUID(), from: "1", to: "1" }]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const readPageCount = async (file: File): Promise<number> => {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    return doc.getPageCount();
  };

  const handleMergeFiles = useCallback(async (newFiles: File[]) => {
    const pdfFiles = newFiles.filter(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (pdfFiles.length === 0) return;
    const entries = await Promise.all(
      pdfFiles.map(async (file) => {
        const pageCount = await readPageCount(file);
        return { id: crypto.randomUUID(), file, name: file.name, pageCount };
      })
    );
    setFiles(prev => [...prev, ...entries]);
  }, []);

  const handleSplitFile = useCallback(async (file: File) => {
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) return;
    const pageCount = await readPageCount(file);
    setSplitFile({ id: crypto.randomUUID(), file, name: file.name, pageCount });
    setSplitRanges([{ id: crypto.randomUUID(), from: "1", to: String(pageCount) }]);
  }, []);

  const onDropMerge = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleMergeFiles(Array.from(e.dataTransfer.files));
  }, [handleMergeFiles]);

  const onDropSplit = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleSplitFile(file);
  }, [handleSplitFile]);

  const moveFile = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= files.length) return;
    setFiles(prev => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next], arr[index]];
      return arr;
    });
  };

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  const addRange = () => setSplitRanges(prev => [...prev, { id: crypto.randomUUID(), from: "1", to: "1" }]);
  const removeRange = (id: string) => setSplitRanges(prev => prev.filter(r => r.id !== id));
  const updateRange = (id: string, field: "from" | "to", val: string) => {
    setSplitRanges(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const doMerge = async () => {
    if (files.length < 2) {
      toast({ title: "Add at least 2 PDFs to merge", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const merged = await PDFDocument.create();
      for (const entry of files) {
        const bytes = await entry.file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const pdfBytes = await merged.save();
      downloadBytes(pdfBytes, "merged.pdf");
      toast({ title: "PDFs merged successfully" });
    } catch {
      toast({ title: "Failed to merge PDFs", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const doSplit = async () => {
    if (!splitFile) {
      toast({ title: "Please upload a PDF first", variant: "destructive" });
      return;
    }
    const totalPages = splitFile.pageCount ?? 0;
    setIsProcessing(true);
    try {
      const srcBytes = await splitFile.file.arrayBuffer();
      const src = await PDFDocument.load(srcBytes);

      for (let i = 0; i < splitRanges.length; i++) {
        const range = splitRanges[i];
        const from = Math.max(1, parseInt(range.from) || 1);
        const to = Math.min(totalPages, parseInt(range.to) || totalPages);
        if (from > to) {
          toast({ title: `Range ${i + 1}: "From" must be ≤ "To"`, variant: "destructive" });
          setIsProcessing(false);
          return;
        }
        const out = await PDFDocument.create();
        const indices = Array.from({ length: to - from + 1 }, (_, k) => from - 1 + k);
        const pages = await out.copyPages(src, indices);
        pages.forEach(p => out.addPage(p));
        const bytes = await out.save();
        const baseName = splitFile.name.replace(/\.pdf$/i, "");
        downloadBytes(bytes, `${baseName}_pages_${from}-${to}.pdf`);
      }
      toast({ title: `Split into ${splitRanges.length} file${splitRanges.length > 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Failed to split PDF", variant: "destructive" });
    }
    setIsProcessing(false);
  };

  const downloadBytes = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-3">PDF Merge &amp; Split</h1>
          <p className="text-muted-foreground text-lg">
            Combine multiple PDFs into one, or extract pages into separate files.
          </p>
        </div>

        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl border bg-card p-1 shadow-sm">
            <button
              data-testid="button-mode-merge"
              onClick={() => setMode("merge")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "merge"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FilePlus2 className="h-4 w-4" />
              Merge PDFs
            </button>
            <button
              data-testid="button-mode-split"
              onClick={() => setMode("split")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === "split"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Scissors className="h-4 w-4" />
              Split PDF
            </button>
          </div>
        </div>

        {mode === "merge" && (
          <div className="space-y-6">
            <div
              data-testid="dropzone-merge"
              onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={onDropMerge}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                isDraggingOver
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
              }`}
              onClick={() => document.getElementById("merge-file-input")?.click()}
            >
              <input
                id="merge-file-input"
                data-testid="input-merge-files"
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => {
                  if (e.target.files) handleMergeFiles(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
              <Upload className="h-10 w-10 text-primary/60 mx-auto mb-4" />
              <p className="font-semibold text-foreground text-lg">Drop PDFs here or click to browse</p>
              <p className="text-muted-foreground text-sm mt-2">Select multiple PDF files to merge</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-foreground">{files.length} file{files.length > 1 ? "s" : ""} to merge</h2>
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <ArrowLeftRight className="h-4 w-4" /> Drag to reorder
                  </span>
                </div>
                {files.map((f, i) => (
                  <div
                    key={f.id}
                    data-testid={`card-file-${i}`}
                    className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm"
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{f.name}</p>
                      {f.pageCount !== null && (
                        <p className="text-xs text-muted-foreground">{f.pageCount} page{f.pageCount !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={i === 0}
                        onClick={() => moveFile(i, -1)}
                        data-testid={`button-move-up-${i}`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={i === files.length - 1}
                        onClick={() => moveFile(i, 1)}
                        data-testid={`button-move-down-${i}`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeFile(f.id)}
                        data-testid={`button-remove-${i}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="pt-2 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("merge-file-input")?.click()}
                    data-testid="button-add-more"
                  >
                    <FilePlus2 className="h-4 w-4 mr-2" />
                    Add More
                  </Button>
                  <Button
                    onClick={doMerge}
                    disabled={isProcessing || files.length < 2}
                    className="flex-1"
                    data-testid="button-merge"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isProcessing ? "Merging..." : `Merge ${files.length} PDFs & Download`}
                  </Button>
                </div>
              </div>
            )}

            {files.length === 0 && (
              <div className="bg-card border rounded-2xl p-6">
                <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">How it works</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3"><span className="bg-primary/10 text-primary font-bold rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs">1</span> Upload two or more PDF files</li>
                  <li className="flex items-start gap-3"><span className="bg-primary/10 text-primary font-bold rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs">2</span> Reorder them using the arrows</li>
                  <li className="flex items-start gap-3"><span className="bg-primary/10 text-primary font-bold rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs">3</span> Click Merge to download a single combined PDF</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {mode === "split" && (
          <div className="space-y-6">
            {!splitFile ? (
              <div
                data-testid="dropzone-split"
                onDragOver={e => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={onDropSplit}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                  isDraggingOver
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                }`}
                onClick={() => document.getElementById("split-file-input")?.click()}
              >
                <input
                  id="split-file-input"
                  data-testid="input-split-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files?.[0]) handleSplitFile(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                <Scissors className="h-10 w-10 text-primary/60 mx-auto mb-4" />
                <p className="font-semibold text-foreground text-lg">Drop your PDF here or click to browse</p>
                <p className="text-muted-foreground text-sm mt-2">Select a PDF file to split into separate files</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3 shadow-sm">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Scissors className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{splitFile.name}</p>
                    <p className="text-xs text-muted-foreground">{splitFile.pageCount} pages total</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => setSplitFile(null)}
                    data-testid="button-clear-split-file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-foreground">Page Ranges</h2>
                    <p className="text-sm text-muted-foreground">Each range downloads as a separate PDF</p>
                  </div>
                  <div className="space-y-3">
                    {splitRanges.map((range, i) => (
                      <div key={range.id} className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3">
                        <span className="text-sm font-medium text-muted-foreground w-16 flex-shrink-0">
                          File {i + 1}
                        </span>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground mb-1 block">From page</Label>
                            <Input
                              type="number"
                              min={1}
                              max={splitFile.pageCount ?? 1}
                              value={range.from}
                              onChange={e => updateRange(range.id, "from", e.target.value)}
                              className="h-9"
                              data-testid={`input-range-from-${i}`}
                            />
                          </div>
                          <span className="text-muted-foreground mt-5">—</span>
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground mb-1 block">To page</Label>
                            <Input
                              type="number"
                              min={1}
                              max={splitFile.pageCount ?? 1}
                              value={range.to}
                              onChange={e => updateRange(range.id, "to", e.target.value)}
                              className="h-9"
                              data-testid={`input-range-to-${i}`}
                            />
                          </div>
                        </div>
                        {splitRanges.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive mt-4"
                            onClick={() => removeRange(range.id)}
                            data-testid={`button-remove-range-${i}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={addRange}
                    data-testid="button-add-range"
                  >
                    <FilePlus2 className="h-4 w-4 mr-2" />
                    Add Another Range
                  </Button>
                </div>

                <Button
                  onClick={doSplit}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                  data-testid="button-split"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isProcessing ? "Splitting..." : `Split & Download ${splitRanges.length} File${splitRanges.length > 1 ? "s" : ""}`}
                </Button>

                <div className="bg-card border rounded-2xl p-5 text-sm text-muted-foreground">
                  <strong className="text-foreground">Tip:</strong> Add multiple page ranges to extract several sections at once. Each range downloads as its own separate PDF file named after the source and page numbers.
                </div>
              </div>
            )}

            {!splitFile && (
              <div className="bg-card border rounded-2xl p-6">
                <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">How it works</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3"><span className="bg-primary/10 text-primary font-bold rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs">1</span> Upload any PDF file</li>
                  <li className="flex items-start gap-3"><span className="bg-primary/10 text-primary font-bold rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs">2</span> Define one or more page ranges (e.g. pages 1–5, pages 6–10)</li>
                  <li className="flex items-start gap-3"><span className="bg-primary/10 text-primary font-bold rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center text-xs">3</span> Click Split to download each range as a separate PDF</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { usePageMeta } from '@/hooks/use-page-meta';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { UploadCloud, Type, Highlighter, Undo, Trash2, Download, MousePointer2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ToolType = 'select' | 'text' | 'highlight' | 'tick' | 'cross';

interface Annotation {
  id: string;
  type: 'text' | 'highlight' | 'tick' | 'cross';
  pageNumber: number;
  x: number;
  y: number;
  text?: string;
  width?: number;
  height?: number;
}

const SYMBOL_SIZE = 16; // px at scale=1, used for centering

export default function PdfEditor() {
  usePageMeta({
    title: "Free PDF Editor Online | Add Text, Highlights & Signatures | PdfSigns",
    description: "Edit PDF files free in your browser. Add text, highlights, tick marks and crosses to any PDF. No uploads, no registration — 100% private.",
    canonical: "https://pdfsigns.co.uk/pdf-editor",
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [isDownloading, setIsDownloading] = useState(false);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setAnnotations([]);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (currentTool === 'select') return;

    const rect = e.currentTarget.getBoundingClientRect();
    // Store the center of the symbol in unscaled page coords
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substr(2, 9),
      type: currentTool as 'text' | 'highlight' | 'tick' | 'cross',
      pageNumber,
      x,
      y,
      ...(currentTool === 'text' ? { text: 'New Text' } : {}),
      ...(currentTool === 'highlight' ? { width: 100, height: 20 } : {}),
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    if (currentTool !== 'text') setCurrentTool('select');
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const undoLast = () => setAnnotations(prev => prev.slice(0, -1));
  const clearAll = () => setAnnotations([]);

  const downloadPdf = async () => {
    if (!file) return;
    setIsDownloading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const ann of annotations) {
        const page = pdfDoc.getPage(ann.pageNumber - 1);
        const { height: pageHeight } = page.getSize();

        // Convert from screen coords (top-left origin) to PDF coords (bottom-left origin)
        const pdfX = ann.x;
        const pdfY = pageHeight - ann.y;

        if (ann.type === 'text' && ann.text) {
          page.drawText(ann.text, {
            x: pdfX,
            y: pdfY - 12,
            size: 14,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        } else if (ann.type === 'highlight') {
          page.drawRectangle({
            x: pdfX,
            y: pdfY - (ann.height || 20),
            width: ann.width || 100,
            height: ann.height || 20,
            color: rgb(1, 1, 0),
            opacity: 0.5,
          });
        } else if (ann.type === 'tick') {
          // Draw a green checkmark using two lines centered on click point
          const s = SYMBOL_SIZE;
          const cx = pdfX;
          const cy = pdfY;
          page.drawLine({
            start: { x: cx - s * 0.45, y: cy },
            end:   { x: cx - s * 0.1,  y: cy - s * 0.45 },
            thickness: 2.2,
            color: rgb(0.04, 0.6, 0.12),
          });
          page.drawLine({
            start: { x: cx - s * 0.1,  y: cy - s * 0.45 },
            end:   { x: cx + s * 0.55, y: cy + s * 0.55 },
            thickness: 2.2,
            color: rgb(0.04, 0.6, 0.12),
          });
        } else if (ann.type === 'cross') {
          // Draw a red X using two diagonal lines centered on click point
          const s = SYMBOL_SIZE * 0.5;
          const cx = pdfX;
          const cy = pdfY;
          page.drawLine({
            start: { x: cx - s, y: cy + s },
            end:   { x: cx + s, y: cy - s },
            thickness: 2.2,
            color: rgb(0.85, 0.1, 0.1),
          });
          page.drawLine({
            start: { x: cx + s, y: cy + s },
            end:   { x: cx - s, y: cy - s },
            thickness: 2.2,
            color: rgb(0.85, 0.1, 0.1),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edited_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!fileUrl) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 bg-muted/20">
        <div className="max-w-md w-full bg-background rounded-2xl shadow-sm border p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-full mb-6">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Upload PDF to Edit</h2>
          <p className="text-muted-foreground mb-8">
            Add text, highlights, tick marks and crosses. Processing is strictly local.
          </p>
          <label className="cursor-pointer inline-flex">
            <Button asChild size="lg" className="px-8">
              <span>
                Choose PDF File
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
              </span>
            </Button>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-muted/20">
      <div className="sticky top-16 z-40 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant={currentTool === 'select' ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentTool('select')}>
              <MousePointer2 className="w-4 h-4 mr-1" /> Select
            </Button>
            <Button variant={currentTool === 'text' ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentTool('text')}>
              <Type className="w-4 h-4 mr-1" /> Text
            </Button>
            <Button variant={currentTool === 'highlight' ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentTool('highlight')}>
              <Highlighter className="w-4 h-4 mr-1" /> Highlight
            </Button>
            <Button
              size="sm"
              onClick={() => setCurrentTool('tick')}
              className={currentTool === 'tick'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-white border border-green-600 text-green-700 hover:bg-green-50'}
            >
              <Check className="w-4 h-4 mr-1" />
              <span className="font-bold">✓ Tick</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setCurrentTool('cross')}
              className={currentTool === 'cross'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-white border border-red-600 text-red-700 hover:bg-red-50'}
            >
              <X className="w-4 h-4 mr-1" />
              <span className="font-bold">✗ Cross</span>
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={undoLast} disabled={annotations.length === 0}>
              <Undo className="w-4 h-4 mr-1" /> Undo
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll} disabled={annotations.length === 0}>
              <Trash2 className="w-4 h-4 mr-1" /> Clear
            </Button>
            <Button size="sm" onClick={downloadPdf} disabled={isDownloading}>
              <Download className="w-4 h-4 mr-1" />
              {isDownloading ? 'Processing...' : 'Download PDF'}
            </Button>
          </div>
        </div>

        {currentTool !== 'select' && (
          <div className={`text-center text-xs py-1 font-medium ${
            currentTool === 'tick'      ? 'bg-green-100 text-green-800' :
            currentTool === 'cross'     ? 'bg-red-100 text-red-800' :
            'bg-primary/10 text-primary'
          }`}>
            {currentTool === 'tick'      && '✓ Click the centre of a checkbox to place a green tick'}
            {currentTool === 'cross'     && '✗ Click the centre of a checkbox to place a red cross'}
            {currentTool === 'text'      && 'Click anywhere on the PDF to add a text box'}
            {currentTool === 'highlight' && 'Click anywhere on the PDF to add a highlight'}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
          <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} className="flex flex-col gap-8">
            {Array.from(new Array(numPages), (_el, index) => (
              <div key={`page_${index + 1}`} className="relative shadow-md rounded-sm overflow-hidden bg-white">
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />

                {/* Overlay — click coords become annotation center */}
                <div
                  className="absolute inset-0 z-10"
                  style={{ cursor: currentTool !== 'select' ? 'crosshair' : 'default' }}
                  onClick={(e) => handlePageClick(e, index + 1)}
                >
                  {annotations.filter(a => a.pageNumber === index + 1).map((ann) => (
                    <div
                      key={ann.id}
                      className="absolute group"
                      style={{
                        // Center the symbol on the stored click point
                        left: `${ann.x * scale}px`,
                        top:  `${ann.y * scale}px`,
                        transform: (ann.type === 'tick' || ann.type === 'cross')
                          ? 'translate(-50%, -50%)'
                          : undefined,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ann.type === 'tick' && (
                        <div className="relative flex items-center justify-center">
                          <svg
                            width={SYMBOL_SIZE * 2 * scale}
                            height={SYMBOL_SIZE * 2 * scale}
                            viewBox="0 0 32 32"
                            fill="none"
                          >
                            <polyline
                              points="4,16 12,24 28,8"
                              stroke="#16a34a"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <button
                            onClick={() => removeAnnotation(ann.id)}
                            className="absolute -top-2 -right-2 hidden group-hover:flex w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[9px] leading-none z-20"
                          >×</button>
                        </div>
                      )}

                      {ann.type === 'cross' && (
                        <div className="relative flex items-center justify-center">
                          <svg
                            width={SYMBOL_SIZE * 2 * scale}
                            height={SYMBOL_SIZE * 2 * scale}
                            viewBox="0 0 32 32"
                            fill="none"
                          >
                            <line x1="6" y1="6"  x2="26" y2="26" stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round"/>
                            <line x1="26" y1="6" x2="6"  y2="26" stroke="#dc2626" strokeWidth="3.5" strokeLinecap="round"/>
                          </svg>
                          <button
                            onClick={() => removeAnnotation(ann.id)}
                            className="absolute -top-2 -right-2 hidden group-hover:flex w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[9px] leading-none z-20"
                          >×</button>
                        </div>
                      )}

                      {ann.type === 'highlight' && (
                        <div
                          className="bg-yellow-300/50 pointer-events-none"
                          style={{
                            width:  `${(ann.width  || 100) * scale}px`,
                            height: `${(ann.height || 20)  * scale}px`,
                          }}
                        />
                      )}

                      {ann.type === 'text' && (
                        <div className="relative">
                          <input
                            type="text"
                            autoFocus
                            className="bg-transparent border border-transparent hover:border-primary focus:border-primary outline-none px-1 text-black font-sans -ml-1 -mt-1"
                            style={{ fontSize: `${14 * scale}px` }}
                            value={ann.text || ''}
                            onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                          />
                          <button
                            onClick={() => removeAnnotation(ann.id)}
                            className="absolute -top-2 -right-3 hidden group-hover:flex w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[9px] leading-none z-20"
                          >×</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
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

export default function PdfEditor() {
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

    setAnnotations([...annotations, newAnnotation]);
    if (currentTool !== 'text') {
      setCurrentTool('select');
    } else {
      setCurrentTool('select');
    }
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    setAnnotations(annotations.map(a => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(annotations.filter(a => a.id !== id));
  };

  const undoLast = () => {
    setAnnotations(annotations.slice(0, -1));
  };

  const clearAll = () => {
    setAnnotations([]);
  };

  const downloadPdf = async () => {
    if (!file) return;
    setIsDownloading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      for (const ann of annotations) {
        const page = pdfDoc.getPage(ann.pageNumber - 1);
        const { height } = page.getSize();

        if (ann.type === 'text' && ann.text) {
          page.drawText(ann.text, {
            x: ann.x,
            y: height - ann.y - 12,
            size: 14,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        } else if (ann.type === 'highlight') {
          page.drawRectangle({
            x: ann.x,
            y: height - ann.y - (ann.height || 20),
            width: ann.width || 100,
            height: ann.height || 20,
            color: rgb(1, 1, 0),
            opacity: 0.5,
          });
        } else if (ann.type === 'tick') {
          page.drawText('✓', {
            x: ann.x,
            y: height - ann.y - 20,
            size: 24,
            font: helveticaBold,
            color: rgb(0, 0.6, 0.1),
          });
        } else if (ann.type === 'cross') {
          page.drawText('✗', {
            x: ann.x,
            y: height - ann.y - 20,
            size: 24,
            font: helveticaBold,
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
            <Button
              variant={currentTool === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTool('select')}
            >
              <MousePointer2 className="w-4 h-4 mr-1" /> Select
            </Button>
            <Button
              variant={currentTool === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTool('text')}
            >
              <Type className="w-4 h-4 mr-1" /> Text
            </Button>
            <Button
              variant={currentTool === 'highlight' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTool('highlight')}
            >
              <Highlighter className="w-4 h-4 mr-1" /> Highlight
            </Button>
            <Button
              variant={currentTool === 'tick' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTool('tick')}
              className={currentTool === 'tick' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-green-700 hover:text-green-800 hover:bg-green-50'}
            >
              <Check className="w-4 h-4 mr-1" /> Tick ✓
            </Button>
            <Button
              variant={currentTool === 'cross' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentTool('cross')}
              className={currentTool === 'cross' ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-red-700 hover:text-red-800 hover:bg-red-50'}
            >
              <X className="w-4 h-4 mr-1" /> Cross ✗
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

        {/* Tool hint banner */}
        {currentTool !== 'select' && (
          <div className={`text-center text-xs py-1 font-medium ${
            currentTool === 'tick' ? 'bg-green-100 text-green-800' :
            currentTool === 'cross' ? 'bg-red-100 text-red-800' :
            'bg-primary/10 text-primary'
          }`}>
            {currentTool === 'tick' && '✓ Click anywhere on the PDF to place a tick mark'}
            {currentTool === 'cross' && '✗ Click anywhere on the PDF to place a cross mark'}
            {currentTool === 'text' && 'Click anywhere on the PDF to add a text box'}
            {currentTool === 'highlight' && 'Click anywhere on the PDF to add a highlight'}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
          <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} className="flex flex-col gap-8">
            {Array.from(new Array(numPages), (el, index) => (
              <div key={`page_${index + 1}`} className="relative shadow-md rounded-sm overflow-hidden bg-white">
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />

                {/* Interaction / Overlay Layer */}
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
                        left: `${ann.x * scale}px`,
                        top: `${ann.y * scale}px`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ann.type === 'tick' && (
                        <div className="relative">
                          <span
                            className="text-green-600 font-bold leading-none select-none"
                            style={{ fontSize: `${24 * scale}px` }}
                          >
                            ✓
                          </span>
                          <button
                            onClick={() => removeAnnotation(ann.id)}
                            className="absolute -top-2 -right-3 hidden group-hover:flex w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[9px] leading-none z-20"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {ann.type === 'cross' && (
                        <div className="relative">
                          <span
                            className="text-red-600 font-bold leading-none select-none"
                            style={{ fontSize: `${24 * scale}px` }}
                          >
                            ✗
                          </span>
                          <button
                            onClick={() => removeAnnotation(ann.id)}
                            className="absolute -top-2 -right-3 hidden group-hover:flex w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center text-[9px] leading-none z-20"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {ann.type === 'highlight' && (
                        <div
                          className="bg-yellow-300/50 pointer-events-none"
                          style={{
                            width: `${(ann.width || 100) * scale}px`,
                            height: `${(ann.height || 20) * scale}px`,
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
                          >
                            ×
                          </button>
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

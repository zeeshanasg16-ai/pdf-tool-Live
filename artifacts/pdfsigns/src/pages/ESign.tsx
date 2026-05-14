import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { PDFDocument, rgb } from 'pdf-lib';
import SignatureCanvas from 'react-signature-canvas';
import { UploadCloud, Download, Eraser, Check, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PlacedSignature {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  image: string; // data URL
}

export default function ESign() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);
  const [isPlacingMode, setIsPlacingMode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const sigCanvasRef = useRef<any>(null);

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
      setPlacedSignatures([]);
      setSignatureImage(null);
      setIsPlacingMode(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const clearSignaturePad = () => {
    sigCanvasRef.current?.clear();
    setSignatureImage(null);
  };

  const saveSignature = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      setSignatureImage(sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png'));
      setIsPlacingMode(true);
    }
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (!isPlacingMode || !signatureImage) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPlacedSignatures([...placedSignatures, {
      pageNumber,
      x: x - 75, // center the 150px wide signature
      y: y - 35, // center the 70px tall signature
      width: 150,
      height: 70,
      image: signatureImage
    }]);
    setIsPlacingMode(false); // only place once per click, return to view mode or keep placing if desired. Let's keep it simple.
  };

  const downloadSignedPdf = async () => {
    if (!file || placedSignatures.length === 0) return;
    setIsDownloading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      for (const sig of placedSignatures) {
        const page = pdfDoc.getPage(sig.pageNumber - 1);
        const { height } = page.getSize();
        
        // Fetch the signature image
        const imgRes = await fetch(sig.image);
        const imgArrayBuffer = await imgRes.arrayBuffer();
        const pngImage = await pdfDoc.embedPng(imgArrayBuffer);

        page.drawImage(pngImage, {
          x: sig.x,
          y: height - sig.y - sig.height,
          width: sig.width,
          height: sig.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `signed_${file.name}`;
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
          <h2 className="text-2xl font-bold mb-2">Upload PDF to Sign</h2>
          <p className="text-muted-foreground mb-8">
            Add your signature securely. Files stay on your device.
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
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-muted/20 lg:flex-row">
      {/* Left Sidebar: Tools */}
      <div className="w-full lg:w-80 bg-background border-r p-6 flex flex-col gap-6 sticky top-16 lg:h-[calc(100vh-4rem)] overflow-y-auto z-40 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold mb-4">1. Create Signature</h3>
          <div className="border-2 border-dashed rounded-lg bg-white mb-3">
            <SignatureCanvas 
              ref={sigCanvasRef} 
              canvasProps={{className: 'w-full h-40 rounded-lg cursor-crosshair'}} 
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={clearSignaturePad}>
              <Eraser className="w-4 h-4 mr-2" /> Clear
            </Button>
            <Button className="flex-1" onClick={saveSignature}>
              <Check className="w-4 h-4 mr-2" /> Use
            </Button>
          </div>
        </div>

        {signatureImage && (
          <div className="p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-3 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" /> Signature ready
            </p>
            <img src={signatureImage} alt="Signature Preview" className="h-16 object-contain bg-white border p-1 rounded w-full" />
            <Button 
              className="w-full mt-3" 
              variant={isPlacingMode ? 'default' : 'secondary'}
              onClick={() => setIsPlacingMode(!isPlacingMode)}
            >
              <MousePointer2 className="w-4 h-4 mr-2" />
              {isPlacingMode ? 'Click PDF to place...' : 'Place Signature'}
            </Button>
          </div>
        )}

        <div className="mt-auto pt-6 border-t">
          <Button 
            size="lg" 
            className="w-full" 
            onClick={downloadSignedPdf} 
            disabled={placedSignatures.length === 0 || isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Processing...' : 'Download Signed PDF'}
          </Button>
        </div>
      </div>

      {/* Right Area: PDF Preview */}
      <div className="flex-1 overflow-auto p-4 lg:p-8 flex justify-center">
        <div className="max-w-4xl w-full flex flex-col items-center gap-8">
          <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} className="flex flex-col gap-8">
            {Array.from(new Array(numPages), (el, index) => (
              <div key={`page_${index + 1}`} className="relative shadow-md rounded-sm overflow-hidden bg-white">
                <Page 
                  pageNumber={index + 1} 
                  renderTextLayer={false} 
                  renderAnnotationLayer={false}
                />
                
                {/* Interaction / Overlay Layer */}
                <div 
                  className={`absolute inset-0 z-10 ${isPlacingMode ? 'cursor-crosshair bg-primary/5' : ''}`}
                  onClick={(e) => handlePageClick(e, index + 1)}
                >
                  {placedSignatures.filter(s => s.pageNumber === index + 1).map((sig, i) => (
                    <img
                      key={i}
                      src={sig.image}
                      className="absolute border border-dashed border-primary/50 bg-white/50"
                      style={{
                        left: sig.x,
                        top: sig.y,
                        width: sig.width,
                        height: sig.height,
                      }}
                      alt="Placed signature"
                    />
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

import { useState, useRef } from 'react';
import { usePageMeta } from '@/hooks/use-page-meta';
import { UploadCloud, Download, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PassportPhoto() {
  usePageMeta({
    title: "Free UK Passport Photo Resizer Online | 45x35mm 600dpi | PdfSigns",
    description: "Resize any photo to official UK passport size (45×35mm at 600dpi) instantly in your browser. Free, private, no uploads needed.",
    canonical: "https://pdfsigns.co.uk/passport-photo",
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
      
      // Simple preview drawing
      const img = new Image();
      img.onload = () => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
             // Basic draw to center it
             ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
             
             // Draw background (light grey approximation for requirements)
             ctx.fillStyle = '#e8e8e8';
             ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
             
             const scale = Math.min(canvasRef.current.width / img.width, canvasRef.current.height / img.height);
             const x = (canvasRef.current.width / 2) - (img.width / 2) * scale;
             const y = (canvasRef.current.height / 2) - (img.height / 2) * scale;
             
             ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          }
        }
      };
      img.src = url;
    }
  };

  const downloadPhoto = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/jpeg', 1.0);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'passport_photo_uk.jpg';
      link.click();
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-muted/20 lg:flex-row">
      <div className="w-full lg:w-96 bg-background border-r p-6 flex flex-col gap-6 z-10 shadow-sm overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold mb-2">UK Passport Photo</h2>
          <p className="text-sm text-muted-foreground mb-6">Resize your photo to official specifications automatically.</p>
          
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20 space-y-3 mb-6 text-sm">
            <h3 className="font-semibold flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-primary" /> Official Specs</h3>
            <ul className="space-y-2 text-muted-foreground ml-6 list-disc">
              <li>Size: 45mm x 35mm</li>
              <li>Resolution: 600 DPI</li>
              <li>Background: Plain cream/light grey</li>
              <li>Neutral expression</li>
              <li>No glasses or headwear</li>
            </ul>
          </div>
          
          {!photoUrl ? (
            <label className="cursor-pointer block w-full">
              <Button asChild className="w-full" size="lg">
                <span>
                  <UploadCloud className="w-4 h-4 mr-2" /> Upload Photo
                  <input type="file" className="hidden" accept="image/jpeg,image/png" onChange={handlePhotoUpload} />
                </span>
              </Button>
            </label>
          ) : (
            <div className="space-y-4">
              <Button variant="outline" className="w-full" onClick={() => setPhotoUrl(null)}>
                <ImageIcon className="w-4 h-4 mr-2" /> Choose Different Photo
              </Button>
              <Button className="w-full" onClick={downloadPhoto} size="lg">
                <Download className="w-4 h-4 mr-2" /> Download (600 DPI)
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-8 flex items-center justify-center overflow-auto">
        <div className="max-w-2xl w-full flex flex-col items-center gap-6">
          {photoUrl ? (
            <div className="relative shadow-xl p-2 bg-white rounded-md border">
              {/* 1063x827 is the pixel equivalent of 45x35mm at 600DPI */}
              {/* We scale it down for display purposes */}
              <canvas 
                ref={canvasRef} 
                width={827} 
                height={1063} 
                className="w-full max-w-sm h-auto bg-[#e8e8e8] shadow-inner"
              />
              
              {/* Crop guide overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-3/5 h-2/3 border-2 border-dashed border-primary/60 rounded-[40%] flex items-center justify-center opacity-50">
                  <span className="bg-background/80 text-xs px-2 py-1 rounded text-primary font-medium">Face Area</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-sm aspect-[35/45] bg-background border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
              <p>Upload a portrait photo to see the passport crop preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

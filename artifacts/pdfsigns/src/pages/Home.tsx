import { Link } from "wouter";
import { ArrowRight, FileText, Signature, Camera, ShieldCheck, Zap, Lock, SplitSquareHorizontal, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function Home() {
  usePageMeta({
    title: "PdfSigns - Free PDF Tools for UK Businesses | Edit, Sign & Compress",
    description: "Free online PDF tools for UK businesses. Edit, sign, merge, split, compress PDFs and resize passport photos — 100% private, browser-based, no uploads.",
    canonical: "https://pdfsigns.co.uk/",
  });
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
            Professional PDF Tools for <br className="hidden md:block" />
            <span className="text-primary">UK Businesses</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Edit documents, sign contracts, and prepare official passport photos securely in your browser. No uploads, no servers, full privacy.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/pdf-editor">
              <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                Open PDF Editor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/e-sign">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base h-12 px-8">
                Sign a Document
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ToolCard 
              title="PDF Editor"
              description="Add text, highlights, and annotations to any PDF document directly in your browser."
              icon={FileText}
              href="/pdf-editor"
              color="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
            />
            <ToolCard 
              title="E-Signature"
              description="Draw and place your secure digital signature on contracts and agreements."
              icon={Signature}
              href="/e-sign"
              color="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
            />
            <ToolCard 
              title="Merge & Split"
              description="Combine multiple PDFs into one file, or extract specific page ranges into separate documents."
              icon={SplitSquareHorizontal}
              href="/pdf-merge-split"
              color="bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400"
            />
            <ToolCard 
              title="Compress PDF"
              description="Reduce PDF file size with three compression levels. Fast, private, and fully browser-based."
              icon={Gauge}
              href="/pdf-compress"
              color="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
            />
            <ToolCard 
              title="Passport Photo"
              description="Resize and crop photos to meet official UK passport and visa requirements (45x35mm)."
              icon={Camera}
              href="/passport-photo"
              color="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
            />
          </div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="py-16 px-4 bg-muted/50 border-t">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-background rounded-full shadow-sm">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">100% Private</h3>
            <p className="text-muted-foreground text-sm">Files never leave your device. All processing happens locally in your browser.</p>
          </div>
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-background rounded-full shadow-sm">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Lightning Fast</h3>
            <p className="text-muted-foreground text-sm">No waiting for uploads or downloads. Instant processing for large documents.</p>
          </div>
          <div className="flex flex-col items-center space-y-3">
            <div className="p-3 bg-background rounded-full shadow-sm">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Secure & Reliable</h3>
            <p className="text-muted-foreground text-sm">Built on trusted open-source technology for professional legal and business use.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ToolCard({ title, description, icon: Icon, href, color }: any) {
  return (
    <Link href={href}>
      <div className="group relative flex flex-col p-8 bg-card border rounded-2xl shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer h-full">
        <div className={`p-4 rounded-xl w-fit mb-6 ${color}`}>
          <Icon className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-muted-foreground leading-relaxed flex-1">
          {description}
        </p>
        <div className="mt-8 flex items-center text-primary font-medium">
          Open Tool <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

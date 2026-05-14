import { Link, useLocation } from "wouter";
import { FileText, Signature, Camera, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();

  const links = [
    { href: "/pdf-editor", label: "PDF Editor", icon: FileText },
    { href: "/e-sign", label: "E-Sign", icon: Signature },
    { href: "/passport-photo", label: "Passport Photo", icon: Camera },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center mx-auto px-4">
        <Link href="/" className="mr-8 flex items-center space-x-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <FileText className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">PdfSigns</span>
        </Link>
        <div className="hidden md:flex flex-1 items-center space-x-6 text-sm font-medium">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors hover:text-foreground/80 flex items-center gap-2 ${
                location === link.href ? "text-foreground" : "text-foreground/60"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex md:hidden flex-1 justify-end">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

import { useEffect } from "react";

interface PageMeta {
  title: string;
  description: string;
  canonical?: string;
}

export function usePageMeta({ title, description, canonical }: PageMeta) {
  useEffect(() => {
    document.title = title;

    let desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", description);

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);

    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", description);

    let twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute("content", title);

    let twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute("content", description);

    let canon = document.querySelector('link[rel="canonical"]');
    if (canon && canonical) canon.setAttribute("href", canonical);

    return () => {
      document.title = "PdfSigns - Free PDF Tools for UK Businesses";
    };
  }, [title, description, canonical]);
}

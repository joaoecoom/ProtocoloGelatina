"use client";

import { useEffect, useRef, useState } from "react";

export function PdfViewer({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const loadingTask = pdfjs.getDocument({ url });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.05 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const render = page.render({ canvas, viewport });
        await render.promise;
      } catch {
        if (!cancelled) setError("Não foi possível carregar o PDF.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-full rounded-3xl border border-white/70 bg-white"
    />
  );
}

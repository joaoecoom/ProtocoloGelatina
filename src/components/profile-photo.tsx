"use client";

/**
 * Foto de perfil: galeria/câmara → editor de recorte (quadrado, pan + zoom) → JPEG → POST /api/user/avatar
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  displayName: string;
  avatarUrl: string | null;
};

const OUT = 512;
/** Tamanho do quadrado de pré-visualização (lógica em CSS; referência p/ minScale) */
const CROP_PX = 300;

type CropState = {
  objectUrl: string;
};

function exportSquareCropToJpeg(
  img: HTMLImageElement,
  scale: number,
  x: number,
  y: number,
  windowPx: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) {
      reject(new Error("Imagem inválida."));
      return;
    }
    const imgW = iw * scale;
    const imgH = ih * scale;
    const sideNat = (windowPx * iw) / imgW;
    let srcX = (0 - x) * (iw / imgW);
    let srcY = (0 - y) * (ih / imgH);
    srcX = Math.max(0, Math.min(iw - sideNat, srcX));
    srcY = Math.max(0, Math.min(ih - sideNat, srcY));
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas indisponível."));
      return;
    }
    ctx.drawImage(img, srcX, srcY, sideNat, sideNat, 0, 0, OUT, OUT);
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Exportação falhou."));
        else resolve(blob);
      },
      "image/jpeg",
      0.9,
    );
  });
}

function clampPos(
  x: number,
  y: number,
  imgW: number,
  imgH: number,
  w: number,
): { x: number; y: number } {
  if (imgW < w) {
    x = (w - imgW) / 2;
  } else {
    const minX = w - imgW;
    const maxX = 0;
    x = Math.min(maxX, Math.max(minX, x));
  }
  if (imgH < w) {
    y = (w - imgH) / 2;
  } else {
    const minY = w - imgH;
    const maxY = 0;
    y = Math.min(maxY, Math.max(minY, y));
  }
  return { x, y };
}

type AvatarCropDialogProps = {
  objectUrl: string;
  onCancel: () => void;
  onApply: (blob: Blob) => void;
  onExportFail: (message: string) => void;
};

function AvatarCropDialog({ objectUrl, onCancel, onApply, onExportFail }: AvatarCropDialogProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [iw, setIw] = useState(0);
  const [ih, setIh] = useState(0);
  const [W, setW] = useState(CROP_PX);
  const [scale, setScale] = useState(1);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [minS, setMinS] = useState(1);
  const [maxS, setMaxS] = useState(3);
  const drag = useRef<{ pid: number; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const layoutTries = useRef(0);
  const zoomId = useId();

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w > 0) setW(w);
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    const el = containerRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function initFromImage(img: HTMLImageElement) {
    const nW = img.naturalWidth;
    const nH = img.naturalHeight;
    if (!nW || !nH) return;
    const raw = containerRef.current?.clientWidth ?? 0;
    if (raw < 8) {
      if (layoutTries.current < 4) {
        layoutTries.current += 1;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (imgRef.current === img) initFromImage(img);
          });
        });
        return;
      }
    }
    layoutTries.current = 0;
    const w = raw > 0 ? raw : CROP_PX;
    setIw(nW);
    setIh(nH);
    const s = Math.max(w / nW, w / nH);
    setMinS(s);
    setMaxS(s * 4);
    setScale(s);
    const imgW = nW * s;
    const imgH = nH * s;
    const p = clampPos((w - imgW) / 2, (w - imgH) / 2, imgW, imgH, w);
    setX(p.x);
    setY(p.y);
    setW(w);
    setReady(true);
  }

  const setScaleCentered = useCallback(
    (newS: number) => {
      const s = Math.max(minS, Math.min(maxS, newS));
      if (!iw || !ih) {
        setScale(s);
        return;
      }
      setScale((oldS) => {
        const u = (W / 2 - x) / oldS;
        const v = (W / 2 - y) / oldS;
        const nx = W / 2 - u * s;
        const ny = W / 2 - v * s;
        const p = clampPos(nx, ny, iw * s, ih * s, W);
        setX(p.x);
        setY(p.y);
        return s;
      });
    },
    [W, x, y, minS, maxS, iw, ih],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, ox: x, oy: y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || drag.current.pid !== e.pointerId) return;
    e.preventDefault();
    const d = drag.current;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    const imgW = iw * scale;
    const imgH = ih * scale;
    const p = clampPos(d.ox + dx, d.oy + dy, imgW, imgH, W);
    setX(p.x);
    setY(p.y);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current?.pid === e.pointerId) drag.current = null;
  };

  const apply = () => {
    const img = imgRef.current;
    if (!img?.complete) return;
    const win = containerRef.current?.clientWidth ?? W;
    void exportSquareCropToJpeg(img, scale, x, y, win)
      .then((blob) => {
        onApply(blob);
      })
      .catch((e) => {
        onExportFail(e instanceof Error ? e.message : "Não foi possível exportar o recorte.");
      });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby={zoomId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="max-h-[min(92dvh,640px)] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
        <h2 className="font-display text-lg font-semibold text-neutral-900" id={zoomId}>
          Ajusta o recorte
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Arrasta para enquadrar. Usa o zoom para aproximar o rosto.
        </p>

        <div
          ref={containerRef}
          className="relative mx-auto mt-4 aspect-square w-full max-w-[300px] touch-none select-none overflow-hidden rounded-xl bg-neutral-200"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={objectUrl}
            alt=""
            draggable={false}
            onLoad={() => {
              if (imgRef.current) initFromImage(imgRef.current);
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="absolute touch-none"
            style={{
              left: x,
              top: y,
              width: iw * scale,
              height: ih * scale,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-xl border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)_inset]"
            aria-hidden
          />
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-neutral-500" htmlFor={`${zoomId}-range`}>
            Zoom
          </label>
          <input
            id={`${zoomId}-range`}
            type="range"
            min={minS}
            max={maxS}
            step={(maxS - minS) / 200 || 0.001}
            value={Math.min(maxS, Math.max(minS, scale))}
            onChange={(e) => setScaleCentered(Number(e.target.value))}
            className="mt-1 w-full accent-rose-500"
            disabled={!ready}
          />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!ready}
            className="rounded-full border border-rose-200 bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm enabled:hover:bg-rose-700 disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProfilePhoto({ displayName, avatarUrl: initialUrl }: Props) {
  const router = useRouter();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropState | null>(null);

  // Sincronizar avatar vindo do servidor (router.refresh) com o estado local.
  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (!crop?.objectUrl) return;
    return () => {
      URL.revokeObjectURL(crop.objectUrl);
    };
  }, [crop?.objectUrl]);

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?";

  const uploadJpeg = useCallback(
    async (blob: Blob) => {
      setMessage(null);
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
        const data = (await res.json().catch(() => ({}))) as {
          avatarUrl?: string;
          error?: string;
          details?: string;
        };
        if (!res.ok) {
          const lines = [data.error, data.details].filter((j): j is string => Boolean(j));
          setMessage(lines.join("\n\n") || "Erro ao guardar.");
          return;
        }
        if (data.avatarUrl) setUrl(data.avatarUrl);
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Erro.");
      } finally {
        setBusy(false);
        if (galleryRef.current) galleryRef.current.value = "";
        if (cameraRef.current) cameraRef.current.value = "";
      }
    },
    [router],
  );

  const onFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) {
      setMessage("Escolhe uma imagem.");
      return;
    }
    setMessage(null);
    const objectUrl = URL.createObjectURL(file);
    setCrop({ objectUrl });
  };

  const cancelCrop = () => {
    if (crop?.objectUrl) URL.revokeObjectURL(crop.objectUrl);
    setCrop(null);
    if (galleryRef.current) galleryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  return (
    <div className="mt-4 border-t border-rose-100/80 pt-4">
      {crop ? (
        <AvatarCropDialog
          objectUrl={crop.objectUrl}
          onCancel={cancelCrop}
          onExportFail={(msg) => setMessage(msg)}
          onApply={(blob) => {
            if (crop?.objectUrl) URL.revokeObjectURL(crop.objectUrl);
            setCrop(null);
            void uploadJpeg(blob);
          }}
        />
      ) : null}

      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Foto de perfil</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-rose-100 bg-rose-50">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-rose-400">
              {initials}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm text-neutral-600">
            Galeria ou câmara, depois ajusta o recorte em quadrado e aplica. Envio em JPEG.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                onFile(f);
              }}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                onFile(f);
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
              className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
            >
              Galeria
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
            >
              Câmara
            </button>
          </div>
        </div>
      </div>
      {busy ? <p className="mt-2 text-sm text-neutral-500">A enviar…</p> : null}
      {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
    </div>
  );
}

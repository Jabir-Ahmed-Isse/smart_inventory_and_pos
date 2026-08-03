"use client";

import { useRef, useState, type DragEvent } from "react";
import { Icon } from "@/components/Icon";

const inputCls =
  "w-full bg-surface-container-lowest border border-outline-variant rounded p-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-body-md";

/** Downscale + JPEG-compress an image file into a small data URL (client-side). */
function fileToDataUrl(file: File, maxSize = 512, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const objUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(objUrl);
      if (!ctx) return reject(new Error("Canvas not supported."));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error("That file isn’t a readable image."));
    };
    img.src = objUrl;
  });
}

/**
 * Product image: upload a file from the device (drag-and-drop or click) or
 * paste a URL. Uploads are downscaled/compressed to a data URL and stored in
 * `image_url` — no storage bucket needed. Catalog + POS render it directly.
 */
export function ImageField({ defaultValue }: { defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [broken, setBroken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isUpload = value.startsWith("data:");
  const trimmed = value.trim();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file (PNG, JPG, GIF, WebP).");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setValue(dataUrl);
      setBroken(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read that image.");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div className="space-y-sm">
      {/* Submitted value */}
      <input type="hidden" name="image_url" value={value} />

      {/* Preview + dropzone */}
      {trimmed && !broken ? (
        <div className="relative aspect-video w-full rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trimmed}
            alt="Product preview"
            className="w-full h-full object-contain"
            onError={() => setBroken(true)}
          />
          <button
            type="button"
            onClick={() => {
              setValue("");
              setBroken(false);
              setErr(null);
            }}
            className="absolute top-2 right-2 bg-surface/90 border border-outline-variant rounded-full p-1 text-on-surface-variant hover:text-error shadow-sm"
            title="Remove image"
          >
            <Icon name="close" size={16} />
          </button>
          <span className="absolute bottom-2 left-2 bg-surface/90 border border-outline-variant rounded-full px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
            {isUpload ? "Uploaded" : "From URL"}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`aspect-video w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-xs text-center p-md transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-outline-variant hover:bg-surface-container-low"
          }`}
        >
          <Icon name={busy ? "hourglass_empty" : broken ? "broken_image" : "cloud_upload"} size={34} className="text-outline-variant" />
          <p className="font-body-md text-body-md text-on-surface font-medium">
            {busy ? "Processing…" : broken ? "Couldn’t load that image" : "Click to upload or drag & drop"}
          </p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">PNG, JPG, GIF or WebP</p>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {err && <p className="font-body-sm text-body-sm text-error">{err}</p>}

      {/* URL fallback */}
      <label className="block font-label-md text-label-md text-on-surface-variant mb-xs pt-xs">Or paste an image URL</label>
      <input
        value={isUpload ? "" : value}
        onChange={(e) => {
          setValue(e.target.value);
          setBroken(false);
        }}
        disabled={isUpload}
        className={`${inputCls} disabled:opacity-50`}
        placeholder={isUpload ? "Using uploaded image — remove it to paste a URL" : "https://example.com/product.jpg"}
        type="url"
      />
    </div>
  );
}

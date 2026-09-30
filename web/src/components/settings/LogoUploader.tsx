"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { updateOrgLogo } from "@/lib/settings/actions";

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return (p.length <= 1 ? (p[0] ?? "W").slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function resize(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("bad image"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("read error"));
    reader.readAsDataURL(file);
  });
}

export function LogoUploader({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [current, setCurrent] = useState(logoUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resize(file);
      start(async () => {
        const res = await updateOrgLogo(dataUrl);
        if (res.ok) setCurrent(dataUrl);
        else setError(res.error);
      });
    } catch {
      setError("Could not read that image.");
    }
  }
  function remove() {
    setError(null);
    start(async () => {
      const res = await updateOrgLogo(null);
      if (res.ok) setCurrent(null);
      else setError(res.error);
    });
  }

  return (
    <div className="flex items-center gap-lg flex-wrap">
      <div className="w-20 h-20 rounded-2xl overflow-hidden border border-outline-variant shadow-sm shrink-0 flex items-center justify-center bg-surface-container-lowest">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="Company logo" className="w-full h-full object-contain" />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-white font-bold text-2xl" style={{ backgroundImage: "linear-gradient(135deg,#12B981,#006C49)" }}>
            {initials(name)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body-md text-body-md text-on-surface font-medium">Company logo</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-sm">Shown in the sidebar. PNG, JPG, WEBP or SVG — resized automatically.</p>
        <div className="flex items-center gap-sm flex-wrap">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            <Icon name={pending ? "hourglass_empty" : "upload"} size={18} /> {pending ? "Saving..." : current ? "Change logo" : "Upload logo"}
          </button>
          {current && (
            <button type="button" onClick={remove} disabled={pending}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high disabled:opacity-60 transition-colors font-label-md text-label-md">
              <Icon name="delete" size={16} /> Remove
            </button>
          )}
        </div>
        {error && <p className="font-label-md text-label-md text-error mt-sm">{error}</p>}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}

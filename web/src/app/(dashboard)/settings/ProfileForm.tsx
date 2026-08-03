"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { updateProfile } from "@/lib/profile/actions";

const inputCls =
  "w-full px-md py-3 bg-surface-bright border border-outline-variant/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm font-body-md text-body-md text-on-surface";

type Result = { ok: true } | { ok: false; error: string };

/** Compress an image file to a small JPEG data URL, client-side. */
function fileToDataUrl(file: File, max = 256, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const obj = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      URL.revokeObjectURL(obj);
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(obj); reject(new Error("Not a readable image")); };
    img.src = obj;
  });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

export function ProfileForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [avatar, setAvatar] = useState(avatarUrl ?? "");
  const [displayName, setDisplayName] = useState(name);
  const [busy, setBusy] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_p: Result | null, fd: FormData) => updateProfile(fd),
    null,
  );
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && state?.ok) setSaved(true);
    wasPending.current = pending;
  }, [pending, state]);
  const error = state && !state.ok ? state.error : null;

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setFileErr("Choose an image file."); return; }
    setFileErr(null); setBusy(true);
    try { setAvatar(await fileToDataUrl(file)); } catch (e) { setFileErr(e instanceof Error ? e.message : "Could not read image"); } finally { setBusy(false); }
  }

  return (
    <form action={formAction} className="p-lg">
      <input type="hidden" name="avatar_url" value={avatar} />
      {(saved || error) && (
        <div className={`mb-md rounded-xl px-md py-sm font-body-sm text-body-sm border ${error ? "border-error/30 bg-error-container/40 text-on-error-container" : "border-primary/30 bg-primary-container/20 text-primary"}`}>
          {error ?? "Profile updated."}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-lg mb-lg">
        {/* Avatar preview */}
        <div className="relative">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="Your avatar" className="w-24 h-24 rounded-full object-cover border-2 border-outline-variant shadow-sm" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-3xl font-bold border-2 border-outline-variant">
              {initials(displayName)}
            </div>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md border-2 border-surface" title="Change photo">
            <Icon name={busy ? "hourglass_empty" : "photo_camera"} size={16} />
          </button>
        </div>
        <div>
          <p className="font-body-md text-body-md text-on-surface font-medium">Profile photo</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-sm">Upload an image, or keep your initials.</p>
          <div className="flex gap-sm">
            <button type="button" onClick={() => fileRef.current?.click()} className="px-md py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md">Upload</button>
            {avatar && <button type="button" onClick={() => setAvatar("")} className="px-md py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-error transition-colors font-label-md text-label-md">Remove</button>}
          </div>
          {fileErr && <p className="font-body-sm text-body-sm text-error mt-1">{fileErr}</p>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      </div>

      <div className="max-w-md space-y-sm">
        <label className="block font-label-md text-label-md text-on-surface">Display Name</label>
        <input name="full_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} placeholder="Your name" type="text" />
      </div>

      <div className="mt-lg flex justify-end">
        <button type="submit" disabled={pending} onClick={() => setSaved(false)} className="px-lg py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-label-md text-label-md transition-colors shadow-sm disabled:opacity-60">
          {pending ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </form>
  );
}

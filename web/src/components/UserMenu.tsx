"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { signOut } from "@/lib/auth/actions";
import type { UserRole } from "@/lib/supabase/database.types";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

// Subtle role tint (kept within the existing token palette).
const ROLE_STYLE: Record<string, string> = {
  owner: "bg-primary-container/50 text-primary",
  admin: "bg-primary-container/50 text-primary",
  manager: "bg-secondary-container/40 text-secondary",
  accountant: "bg-secondary-container/40 text-secondary",
  cashier: "bg-tertiary-container/40 text-tertiary",
  staff: "bg-surface-container-high text-on-surface-variant",
};

/**
 * Header identity control: avatar + name, with role and active branch, and a
 * dropdown for account actions. Replaces the bare avatar link.
 */
export function UserMenu({
  userName = "You",
  avatarUrl = null,
  role,
  roles = [],
  branchLabel = null,
  isPlatformAdmin = false,
}: {
  userName?: string;
  avatarUrl?: string | null;
  role?: UserRole;
  roles?: UserRole[];
  branchLabel?: string | null;
  isPlatformAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, []);

  const extras = roles.filter((r) => r !== role);
  const avatar = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={userName} src={avatarUrl} className="w-9 h-9 rounded-full border border-outline-variant object-cover" />
  ) : (
    <span className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold">{initials(userName)}</span>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-full border border-outline-variant/60 hover:bg-surface-container-high transition-colors"
      >
        {avatar}
        <span className="hidden lg:flex flex-col items-start leading-tight max-w-[170px]">
          <span className="font-label-md text-label-md text-on-surface font-semibold truncate w-full text-left">{userName}</span>
          {isPlatformAdmin ? (
            <span className="text-[11px] text-primary font-semibold flex items-center gap-1 truncate w-full">
              <Icon name="shield_person" size={12} className="shrink-0" /> Platform Admin
            </span>
          ) : (
            <span className="text-[11px] text-on-surface-variant flex items-center gap-1 capitalize truncate w-full">
              {role ?? "member"}
              {branchLabel && (
                <>
                  <span className="text-outline-variant">·</span>
                  <Icon name="store" size={11} className="shrink-0" />
                  <span className="truncate normal-case">{branchLabel}</span>
                </>
              )}
            </span>
          )}
        </span>
        <Icon name={open ? "expand_less" : "expand_more"} size={18} className="text-on-surface-variant hidden lg:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 bg-surface border border-outline-variant rounded-xl shadow-lg overflow-hidden z-50"
        >
          {/* Identity header */}
          <div className="p-md bg-surface-container-lowest border-b border-outline-variant flex items-center gap-3">
            <span className="shrink-0 relative">
              {avatar}
              {isPlatformAdmin && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary text-on-primary flex items-center justify-center border-2 border-surface" title="Platform Admin">
                  <Icon name="shield_person" size={10} />
                </span>
              )}
            </span>
            <div className="min-w-0">
              <div className="font-label-md text-label-md text-on-surface font-semibold truncate">{userName}</div>
              {isPlatformAdmin && (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary-container/50 px-2 py-0.5 rounded-full">
                  <Icon name="shield_person" size={12} /> Platform Administrator
                </div>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {isPlatformAdmin && <span className="text-[11px] text-on-surface-variant">In this workspace:</span>}
                {role && <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full capitalize ${ROLE_STYLE[role] ?? ROLE_STYLE.staff}`}>{role}</span>}
                {extras.map((r) => (
                  <span key={r} className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full capitalize ${ROLE_STYLE[r] ?? ROLE_STYLE.staff}`}>{r}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Active branch */}
          <div className="px-md py-2.5 border-b border-outline-variant flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-secondary-container/30 text-secondary flex items-center justify-center shrink-0">
              <Icon name="store" size={17} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-on-surface-variant">Active branch</div>
              <div className="font-body-sm text-body-sm text-on-surface font-medium truncate">{branchLabel ?? "All branches"}</div>
            </div>
          </div>

          {/* Actions */}
          <nav className="p-1.5">
            {isPlatformAdmin && <MenuLink href="/platform" icon="shield_person" label="Platform Console" onClick={() => setOpen(false)} />}
            <MenuLink href="/settings" icon="person" label="Profile & settings" onClick={() => setOpen(false)} />
            <MenuLink href="/workspace" icon="business" label="Workspace" onClick={() => setOpen(false)} />
            <form action={signOut}>
              <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-error hover:bg-error-container/20 transition-colors font-body-sm text-body-sm text-left">
                <Icon name="logout" size={18} /> Sign out
              </button>
            </form>
          </nav>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onClick }: { href: string; icon: string; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container-high transition-colors font-body-sm text-body-sm">
      <Icon name={icon} size={18} className="text-on-surface-variant" /> {label}
    </Link>
  );
}

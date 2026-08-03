"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { UserRole } from "@/lib/supabase/database.types";

/**
 * Fixed-fluid application chrome: a 280px fixed sidebar (drawer on mobile) plus a
 * sticky top bar. Pages supply their own <main> so each screen keeps its exact
 * padding/background from the source design.
 */
export function AppShell({
  children,
  isPlatformAdmin = false,
  userName = "You",
  avatarUrl = null,
  role,
}: {
  children: React.ReactNode;
  isPlatformAdmin?: boolean;
  userName?: string;
  avatarUrl?: string | null;
  role?: UserRole;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background text-on-background">
      <Sidebar open={open} onClose={() => setOpen(false)} isPlatformAdmin={isPlatformAdmin} role={role} />

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 md:ml-[280px] min-w-0 flex flex-col">
        <TopBar onMenu={() => setOpen(true)} userName={userName} avatarUrl={avatarUrl} />
        {children}
      </div>
    </div>
  );
}

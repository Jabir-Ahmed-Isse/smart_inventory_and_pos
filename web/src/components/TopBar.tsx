"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { UserMenu } from "./UserMenu";
import type { UserRole } from "@/lib/supabase/database.types";

export function TopBar({
  onMenu,
  userName = "You",
  avatarUrl = null,
  branchSelector = null,
  role,
  roles,
  branchLabel = null,
  isPlatformAdmin = false,
}: {
  onMenu: () => void;
  userName?: string;
  avatarUrl?: string | null;
  branchSelector?: ReactNode;
  role?: UserRole;
  roles?: UserRole[];
  branchLabel?: string | null;
  isPlatformAdmin?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm flex justify-between items-center h-16 px-gutter">
      <div className="flex items-center gap-md">
        <button
          className="md:hidden text-on-surface-variant"
          onClick={onMenu}
          aria-label="Open menu"
        >
          <Icon name="menu" />
        </button>
        <div className="hidden md:flex bg-surface-container-low rounded-full px-md py-sm border border-outline-variant items-center gap-sm focus-within:ring-2 ring-primary focus-within:border-transparent transition-all">
          <Icon
            name="search"
            className="text-on-surface-variant text-body-md"
          />
          <input
            className="bg-transparent border-none focus:ring-0 text-body-sm w-64 placeholder-on-surface-variant outline-none"
            placeholder="Search across workspace..."
            type="text"
          />
        </div>
        {branchSelector}
      </div>

      <nav className="hidden md:flex gap-lg items-center">
        <Link
          className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md"
          href="/workspace"
        >
          Workspace
        </Link>
        <Link
          className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md"
          href="/admin"
        >
          Company
        </Link>
      </nav>

      <div className="flex items-center gap-md">
        <Link href="/logs" title="Activity" className="text-on-surface-variant hover:text-primary transition-colors">
          <Icon name="notifications" />
        </Link>
        <Link href="/reports" title="Reports" className="text-on-surface-variant hover:text-primary transition-colors">
          <Icon name="apps" />
        </Link>
        <Link href="/ai" className="hidden sm:flex items-center gap-sm bg-primary text-on-primary px-md py-sm rounded-full font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-colors shadow-sm">
          <Icon name="psychology" size={16} />
          AI Assistant
        </Link>
        <UserMenu userName={userName} avatarUrl={avatarUrl} role={role} roles={roles} branchLabel={branchLabel} isPlatformAdmin={isPlatformAdmin} />
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { Icon } from "./Icon";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

export function TopBar({ onMenu, userName = "You", avatarUrl = null }: { onMenu: () => void; userName?: string; avatarUrl?: string | null }) {
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
        <Link href="/settings" title={userName} className="shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={userName}
              className="w-8 h-8 rounded-full border border-outline-variant object-cover cursor-pointer"
              src={avatarUrl}
            />
          ) : (
            <span className="w-8 h-8 rounded-full border border-outline-variant bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold cursor-pointer">
              {initials(userName)}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

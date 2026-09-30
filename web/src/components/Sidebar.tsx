"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { navGroups, secondaryNav, roleCan, type NavItem } from "@/lib/nav";
import type { UserRole } from "@/lib/supabase/database.types";
import { signOut } from "@/lib/auth/actions";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const base =
    "flex items-center gap-md px-md py-sm rounded-md transition-all duration-200";
  const activeCls =
    "bg-surface-container-low shadow-sm text-primary font-bold border-r-4 border-primary opacity-90";
  const idleCls =
    "text-on-surface-variant hover:bg-surface-container-high transition-colors";

  const content = (
    <>
      <Icon name={item.icon} filled={active} />
      <span className="font-body-md text-body-md">{item.label}</span>
    </>
  );

  if (item.stub) {
    return (
      <span
        className={clsx(base, idleCls, "cursor-not-allowed opacity-70")}
        title="Coming soon"
      >
        {content}
      </span>
    );
  }

  return (
    <Link href={item.href} className={clsx(base, active ? activeCls : idleCls)}>
      {content}
    </Link>
  );
}

export function Sidebar({
  open,
  onClose,
  isPlatformAdmin = false,
  role,
  roles,
  orgName = "Workspace",
  orgLogoUrl = null,
  orgTagline = null,
}: {
  open: boolean;
  onClose: () => void;
  isPlatformAdmin?: boolean;
  role?: UserRole;
  roles?: UserRole[];
  orgName?: string;
  orgLogoUrl?: string | null;
  orgTagline?: string | null;
}) {
  const pathname = usePathname();

  // A platform admin ON the Platform Console gets a lean, platform-focused
  // sidebar (system operator context) — the company catalog/inventory nav is
  // hidden and returns when they enter a company workspace.
  const onPlatform = isPlatformAdmin && (pathname === "/platform" || pathname.startsWith("/platform/"));

  // Role-filter groups; drop groups that end up empty for this role.
  const groups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => roleCan(roles ?? (role ? [role] : []), i.roles)) }))
    .filter((g) => g.items.length > 0);

  return (
    <nav
      id="sidebar"
      className={clsx(
        "fixed left-0 top-0 h-screen w-[280px] bg-surface shadow-sm border-r border-outline-variant flex flex-col z-50 transition-transform duration-300 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="p-lg flex items-center justify-between gap-2">
        <Logo name={orgName} logoUrl={orgLogoUrl} tagline={orgTagline} />
        <button
          className="md:hidden text-on-surface-variant shrink-0"
          onClick={onClose}
          aria-label="Close menu"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-md pb-md">
        {isPlatformAdmin && (
          <div className="mb-md">
            <p className="px-md pt-xs pb-xs font-label-md text-label-md text-on-surface-variant/70 uppercase tracking-wider text-[11px]">
              Platform
            </p>
            <ul className="space-y-xs">
              <li onClick={onClose}>
                <NavLink
                  item={{ label: "Platform Console", icon: "shield_person", href: "/platform" }}
                  active={isActive(pathname, "/platform")}
                />
              </li>
            </ul>
          </div>
        )}
        {onPlatform && (
          <div className="mb-md">
            <p className="px-md pt-xs pb-xs font-label-md text-label-md text-on-surface-variant/70 uppercase tracking-wider text-[11px]">
              Workspace
            </p>
            <ul className="space-y-xs">
              <li onClick={onClose}>
                <NavLink item={{ label: "Enter Workspace", icon: "grid_view", href: "/dashboard" }} active={false} />
              </li>
            </ul>
            <p className="px-md pt-md font-body-sm text-body-sm text-on-surface-variant/60 text-[11px] leading-snug">
              You’re in platform mode. Enter a workspace to manage its catalog, inventory and sales.
            </p>
          </div>
        )}
        {!onPlatform && groups.map((group, gi) => (
          <div key={group.title ?? `group-${gi}`} className={gi === 0 ? "" : "mt-md"}>
            {group.title && (
              <p className="px-md pt-xs pb-xs font-label-md text-label-md text-on-surface-variant/70 uppercase tracking-wider text-[11px]">
                {group.title}
              </p>
            )}
            <ul className="space-y-xs">
              {group.items.map((item) => (
                <li key={item.label} onClick={onClose}>
                  <NavLink item={item} active={isActive(pathname, item.href)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-outline-variant p-md">
        <ul className="space-y-xs">
          {secondaryNav.map((item) =>
            item.label === "Log Out" ? (
              <li key={item.label}>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-md px-md py-sm rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors text-left"
                  >
                    <Icon name={item.icon} />
                    <span className="font-body-md text-body-md">{item.label}</span>
                  </button>
                </form>
              </li>
            ) : (
              <li key={item.label} onClick={onClose}>
                <NavLink item={item} active={isActive(pathname, item.href)} />
              </li>
            ),
          )}
        </ul>
      </div>
    </nav>
  );
}

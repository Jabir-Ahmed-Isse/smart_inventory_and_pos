import { AppShell } from "@/components/AppShell";
import { BranchSelector } from "@/components/BranchSelector";
import { Icon } from "@/components/Icon";
import { getPlatformContext } from "@/lib/admin/data";
import { getActiveOrg, getOrgBrand } from "@/lib/org";
import { getBranchContext } from "@/lib/branches/context";
import { getProfile } from "@/lib/data";
import { signOut } from "@/lib/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ isPlatformAdmin }, org] = await Promise.all([
    getPlatformContext(),
    getActiveOrg(),
  ]);
  const [profile, brand, branchCtx] = org
    ? await Promise.all([getProfile(org.userId), getOrgBrand(org.orgId), getBranchContext(org)])
    : [{ fullName: null, avatarUrl: null }, { logoUrl: null, tagline: null }, null];

  // A suspended company locks out its members — platform admins are exempt so
  // they can still reach the Platform Console to reactivate it.
  if (org && !org.active && !isPlatformAdmin) {
    return <SuspendedScreen name={org.orgName} />;
  }

  const branchSelector =
    branchCtx && branchCtx.showSelector ? (
      <BranchSelector
        branches={branchCtx.branches.map((b) => ({ id: b.id, name: b.name }))}
        activeBranchId={branchCtx.activeBranchId}
        canSeeAll={branchCtx.canSeeAll}
      />
    ) : null;

  // Label for the header identity chip: the selected/locked branch, or "All branches".
  const branchLabel = branchCtx
    ? branchCtx.activeBranchId
      ? branchCtx.branches.find((b) => b.id === branchCtx.activeBranchId)?.name ?? null
      : branchCtx.canSeeAll && branchCtx.branches.length > 0
        ? "All branches"
        : branchCtx.branches[0]?.name ?? null
    : null;

  return (
    <AppShell
      isPlatformAdmin={isPlatformAdmin}
      userName={profile.fullName ?? org?.orgName ?? "You"}
      avatarUrl={profile.avatarUrl}
      role={org?.role}
      roles={org?.roles}
      orgName={org?.orgName ?? "Workspace"}
      orgLogoUrl={brand.logoUrl}
      orgTagline={brand.tagline}
      branchSelector={branchSelector}
      branchLabel={branchLabel}
    >
      {children}
    </AppShell>
  );
}

function SuspendedScreen({ name }: { name: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-md">
      <div className="max-w-md w-full text-center bg-surface border border-outline-variant rounded-xl p-xl shadow-sm">
        <div className="w-16 h-16 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto mb-lg">
          <Icon name="block" size={32} />
        </div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface mb-sm">Workspace suspended</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Access to <span className="font-semibold text-on-surface">{name}</span> has been paused by the
          platform administrator. Please contact your administrator to restore access.
        </p>
        <form action={signOut} className="mt-lg">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-lg py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md"
          >
            <Icon name="logout" size={18} /> Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

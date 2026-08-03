import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getActiveOrg } from "@/lib/org";
import { getProductsWithStock } from "@/lib/data";
import { PosTerminal, type CatalogItem } from "./PosTerminal";

export const metadata = { title: "Point of Sale — Inventory Pro" };

export default async function PosPage() {
  const org = await getActiveOrg();

  if (org && !org.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-md">
        <div className="max-w-md w-full text-center bg-surface border border-outline-variant rounded-xl p-xl shadow-sm">
          <div className="w-16 h-16 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto mb-lg">
            <Icon name="block" size={32} />
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-sm">Workspace suspended</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Sales are paused for <span className="font-semibold text-on-surface">{org.orgName}</span>. Contact your
            platform administrator to restore access.
          </p>
        </div>
      </div>
    );
  }

  const products = org ? await getProductsWithStock(org.orgId) : [];
  const catalog: CatalogItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    status: p.status,
    imageUrl: p.imageUrl,
    available: p.qty,
  }));

  return (
    <div className="bg-background text-on-background h-screen flex flex-col overflow-hidden">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm flex justify-between items-center h-16 px-gutter shrink-0">
        <div className="flex items-center gap-gutter">
          <Link href="/dashboard" className="text-headline-lg font-headline-lg font-bold text-primary">
            Inventory Pro
          </Link>
          <div className="hidden md:flex gap-md font-label-md text-label-md text-on-surface-variant">
            <Link href="/dashboard" className="hover:text-primary transition-colors">Workspace</Link>
            <span className="text-primary font-semibold">Sales</span>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <button className="font-label-md text-label-md text-primary bg-surface-container-low hover:bg-surface-container-high px-md py-xs rounded-full transition-colors hidden sm:block">
            AI Assistant
          </button>
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <Icon name="notifications" />
          </button>
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <Icon name="apps" />
          </button>
          <div className="w-8 h-8 rounded-full border border-outline-variant bg-surface-container-high flex items-center justify-center text-on-surface-variant">
            <Icon name="person" size={20} />
          </div>
        </div>
      </nav>

      <PosTerminal
        catalog={catalog}
        currency={org?.currency ?? "USD"}
        taxRate={org?.taxRate ?? 0}
      />
    </div>
  );
}

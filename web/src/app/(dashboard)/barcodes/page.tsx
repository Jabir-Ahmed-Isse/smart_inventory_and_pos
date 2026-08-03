import { Icon } from "@/components/Icon";
import { Kpi } from "@/components/finance/Kpi";
import { getActiveOrg } from "@/lib/org";
import { requireRole } from "@/lib/rbac";
import { getProductBarcodes, money } from "@/lib/data";

export const metadata = { title: "Barcodes & Labels — Inventory Pro" };

/** Deterministic bar widths from a code string — a lightweight visual barcode. */
function bars(code: string): number[] {
  const seed = code || "000000";
  const out: number[] = [];
  for (let i = 0; i < 32; i++) {
    const c = seed.charCodeAt(i % seed.length) + i * 7;
    out.push((c % 3) + 1); // 1..3 relative widths
  }
  return out;
}

export default async function BarcodesPage() {
  await requireRole(["owner", "admin", "manager"]);
  const org = await getActiveOrg();
  const products = org ? await getProductBarcodes(org.orgId) : [];
  const currency = org?.currency ?? "USD";
  const withBarcode = products.filter((p) => p.barcode).length;

  return (
    <main className="flex-1 p-md md:p-lg bg-surface-container-lowest">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-xs">Barcodes &amp; Labels</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Printable labels for every product, using its barcode or SKU.
          </p>
        </div>
        <button className="px-lg py-sm rounded-lg border border-outline text-on-surface font-label-md text-label-md hover:bg-surface-container-low transition-colors flex items-center gap-sm">
          <Icon name="print" size={18} /> Print Sheet
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-lg">
        <Kpi label="Products" value={products.length.toLocaleString()} icon="inventory_2" tone="neutral" />
        <Kpi label="With Barcode" value={withBarcode.toLocaleString()} icon="qr_code_2" tone="positive" />
        <Kpi label="Using SKU Fallback" value={(products.length - withBarcode).toLocaleString()} icon="tag" tone="neutral" />
      </div>

      {products.length === 0 ? (
        <div className="bg-surface border border-outline-variant rounded-xl p-xl text-center text-on-surface-variant font-body-sm text-body-sm">
          {org ? "No products yet. Add products to generate labels." : "Sign in to view barcodes."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
          {products.map((p) => {
            const code = p.barcode ?? p.sku;
            return (
              <div key={p.id} className="bg-surface border border-outline-variant rounded-xl p-md flex flex-col items-center text-center shadow-sm">
                <div className="w-full flex items-center justify-between mb-sm">
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">{p.name}</span>
                  <span className="font-label-md text-label-md text-on-surface-variant shrink-0 ml-2">{money(p.price, currency)}</span>
                </div>
                <div className="w-full h-16 flex items-end justify-center gap-[2px] bg-white rounded-md border border-outline-variant/40 p-2">
                  {bars(code).map((w, i) => (
                    <span
                      key={i}
                      className="bg-black h-full"
                      style={{ width: `${w * 1.5}px`, opacity: i % 2 === 0 ? 1 : 0.15 }}
                    />
                  ))}
                </div>
                <div className="mt-sm font-mono text-xs text-on-surface tracking-widest">{code}</div>
                {!p.barcode && (
                  <span className="mt-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] uppercase font-medium">
                    SKU fallback
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

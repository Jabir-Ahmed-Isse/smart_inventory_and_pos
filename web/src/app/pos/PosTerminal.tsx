"use client";

import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { checkout, type CheckoutItem } from "@/lib/pos/actions";

export type CatalogItem = {
  id: string;
  name: string;
  sku: string;
  price: number;
  status: "in" | "low" | "out";
  imageUrl: string | null;
  available: number;
};

const CATEGORIES = ["All Items", "Electronics", "Fashion", "Grocery", "Home & Garden"];
const POS_STATUS: Record<CatalogItem["status"], { pill: string; icon: string; label: string }> = {
  in: { pill: "bg-surface-container text-primary", icon: "check_circle", label: "In Stock" },
  low: { pill: "bg-error-container text-on-error-container", icon: "warning", label: "Low Stock" },
  out: { pill: "bg-surface-variant text-on-surface-variant", icon: "block", label: "Out of Stock" },
};

type PayMethod = "cash" | "card" | "mobile" | "credit";

export function PosTerminal({
  catalog,
  currency,
  taxRate,
}: {
  catalog: CatalogItem[];
  currency: string;
  taxRate: number;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState<PayMethod>("card");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ orderNumber: string; total: number; due: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ item: byId.get(id)!, qty }))
    .filter((l) => l.item);

  const subtotal = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function add(item: CatalogItem) {
    if (item.status === "out") return;
    setReceipt(null);
    setError(null);
    setCart((c) => ({ ...c, [item.id]: Math.min((c[item.id] ?? 0) + 1, Math.max(item.available, 1)) }));
  }
  function setQty(id: string, qty: number) {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  function complete() {
    setError(null);
    const items: CheckoutItem[] = lines.map((l) => ({
      productId: l.item.id,
      quantity: l.qty,
      unitPrice: l.item.price,
    }));
    startTransition(async () => {
      const res = await checkout(items, payment);
      if (res.ok) {
        setReceipt({ orderNumber: res.orderNumber, total: res.total, due: payment === "credit" });
        setCart({});
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <main className="flex flex-1 w-full overflow-hidden">
      {/* Left: catalog */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-outline-variant relative">
        <div className="p-gutter pb-sm space-y-md z-10 glass-panel shadow-sm">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-full pl-xl pr-md py-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
              placeholder="Search products, scan barcode..."
              type="text"
            />
          </div>
          <div className="flex gap-sm overflow-x-auto hide-scrollbar pb-xs">
            {CATEGORIES.map((c, i) => (
              <button
                key={c}
                className={
                  i === 0
                    ? "whitespace-nowrap px-md py-xs bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-sm"
                    : "whitespace-nowrap px-md py-xs bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high rounded-full font-label-md text-label-md transition-colors"
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-gutter pt-md bg-surface-container-lowest">
          {catalog.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant gap-sm">
              <Icon name="inventory_2" size={48} className="text-outline-variant" />
              <p className="font-body-md text-body-md">No products to sell yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-md pb-xl">
              {catalog.map((p) => {
                const meta = POS_STATUS[p.status];
                const isOut = p.status === "out";
                const label = p.status === "low" ? `Low Stock (${p.available})` : meta.label;
                return (
                  <button
                    key={p.id}
                    onClick={() => add(p)}
                    disabled={isOut}
                    className={`group relative bg-surface border border-outline-variant rounded-lg overflow-hidden transition-shadow text-left ${isOut ? "opacity-75 cursor-not-allowed" : "hover:shadow-md cursor-pointer"}`}
                  >
                    <div className={`aspect-square bg-surface-container-low relative ${isOut ? "grayscale" : ""}`}>
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="w-full h-full object-cover mix-blend-multiply p-md" src={p.imageUrl} alt={p.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline-variant">
                          <Icon name="inventory_2" size={48} />
                        </div>
                      )}
                      <span className={`absolute top-xs right-xs px-sm py-xs rounded-full font-label-md text-label-md flex items-center gap-xs shadow-sm ${meta.pill}`}>
                        <Icon name={meta.icon} size={14} /> {label}
                      </span>
                    </div>
                    <div className="p-sm">
                      <h3 className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{p.name}</h3>
                      <div className="flex justify-between items-center mt-xs">
                        <span className="font-label-md text-label-md text-on-surface-variant">SKU: {p.sku}</span>
                        <span className={`font-body-md text-body-md font-semibold ${isOut ? "text-on-surface-variant line-through" : "text-primary"}`}>
                          {fmt(p.price)}
                        </span>
                      </div>
                    </div>
                    {!isOut && (
                      <div className="absolute inset-0 bg-surface/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] pointer-events-none">
                        <span className="bg-primary text-on-primary font-label-md text-label-md px-md py-sm rounded-full shadow-sm flex items-center gap-xs">
                          <Icon name="add_shopping_cart" size={16} /> Add to Cart
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: cart */}
      <div className="w-[400px] flex-shrink-0 flex flex-col bg-surface h-full shadow-[-4px_0_24px_rgba(0,0,0,0.03)] z-20">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-sm">
            <Icon name="shopping_cart" /> Current Order
          </h2>
          <span className="bg-surface-container px-sm py-xs rounded text-on-surface-variant font-label-md text-label-md">
            {count} {count === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-md space-y-sm bg-surface">
          {receipt ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-sm p-md">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="check_circle" size={32} className="text-primary" filled />
              </div>
              <p className="font-headline-lg text-headline-lg text-on-surface">
                {receipt.due ? "Due order placed" : "Sale complete"}
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Order <span className="font-mono">{receipt.orderNumber}</span> · {fmt(receipt.total)}
              </p>
              {receipt.due ? (
                <p className="font-label-md text-label-md text-tertiary flex items-center gap-1">
                  <Icon name="schedule" size={16} /> Marked as unpaid — inventory updated, payment still owed.
                </p>
              ) : (
                <p className="font-label-md text-label-md text-on-surface-variant">
                  Inventory, sales &amp; finance updated. Tap a product to start the next order.
                </p>
              )}
            </div>
          ) : lines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-sm p-md">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center">
                <Icon name="add_shopping_cart" size={28} className="text-on-surface-variant" />
              </div>
              <p className="font-body-md text-body-md text-on-surface font-semibold">Cart is empty</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-[220px]">
                Tap a product to add it to the order.
              </p>
            </div>
          ) : (
            lines.map(({ item, qty }) => (
              <div key={item.id} className="flex gap-md p-sm hover:bg-surface-container-low rounded-lg transition-colors group">
                <div className="w-16 h-16 bg-surface-container-lowest rounded border border-outline-variant overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="w-full h-full object-cover mix-blend-multiply" src={item.imageUrl} alt={item.name} />
                  ) : (
                    <Icon name="inventory_2" size={24} className="text-outline-variant" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="font-body-sm text-body-sm text-on-surface font-semibold line-clamp-2">{item.name}</span>
                    <button onClick={() => setQty(item.id, 0)} className="text-on-surface-variant hover:text-error transition-opacity">
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-xs">
                    <span className="font-body-sm text-body-sm text-primary font-semibold">{fmt(item.price)}</span>
                    <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded">
                      <button onClick={() => setQty(item.id, qty - 1)} className="px-2 py-1 text-on-surface-variant hover:bg-surface-container-low transition-colors">
                        <Icon name="remove" size={14} />
                      </button>
                      <span className="font-label-md text-label-md w-4 text-center">{qty}</span>
                      <button onClick={() => setQty(item.id, qty + 1)} className="px-2 py-1 text-on-surface-variant hover:bg-surface-container-low transition-colors">
                        <Icon name="add" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-md bg-surface-container-lowest border-t border-outline-variant space-y-md shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
          {error && (
            <div className="rounded-lg border border-error/30 bg-error-container/40 px-sm py-xs font-body-sm text-body-sm text-on-error-container">
              {error}
            </div>
          )}
          <div className="space-y-sm pt-sm">
            <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
              <span>Tax ({taxRate}%)</span>
              <span>{fmt(tax)}</span>
            </div>
            <div className="flex justify-between font-headline-lg text-headline-lg text-on-surface pt-sm border-t border-surface-container">
              <span>Total</span>
              <span className="text-primary">{fmt(total)}</span>
            </div>
          </div>
          <div className="pt-sm space-y-sm">
            <div className="grid grid-cols-4 gap-sm">
              {(["cash", "card", "mobile", "credit"] as PayMethod[]).map((m) => (
                <PayOption
                  key={m}
                  icon={
                    m === "cash"
                      ? "payments"
                      : m === "card"
                        ? "credit_card"
                        : m === "mobile"
                          ? "contactless"
                          : "schedule"
                  }
                  label={m === "cash" ? "Cash" : m === "card" ? "Card" : m === "mobile" ? "Mobile" : "Due"}
                  active={payment === m}
                  onClick={() => setPayment(m)}
                />
              ))}
            </div>
            {payment === "credit" && (
              <p className="font-body-sm text-body-sm text-tertiary flex items-center gap-1 px-1">
                <Icon name="info" size={16} /> Recorded as an unpaid (due) order — no cash counted yet.
              </p>
            )}
            <button
              onClick={complete}
              disabled={lines.length === 0 || pending}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed text-on-primary font-headline-lg text-[18px] py-md rounded-lg shadow-sm transition-all transform active:scale-[0.98] flex items-center justify-center gap-sm mt-md"
            >
              {pending ? "Processing…" : payment === "credit" ? "Place Due Order" : "Complete Order"}
              {!pending && <Icon name="arrow_forward" />}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function PayOption({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "bg-primary/10 border-2 border-primary py-sm rounded-lg flex flex-col items-center justify-center gap-xs transition-colors"
          : "bg-surface border border-outline-variant py-sm rounded-lg flex flex-col items-center justify-center gap-xs hover:border-primary hover:bg-primary/5 transition-colors group"
      }
    >
      <Icon name={icon} className={active ? "text-primary" : "text-on-surface-variant group-hover:text-primary transition-colors"} />
      <span className={`font-label-md text-label-md ${active ? "text-primary font-semibold" : "text-on-surface"}`}>{label}</span>
    </button>
  );
}

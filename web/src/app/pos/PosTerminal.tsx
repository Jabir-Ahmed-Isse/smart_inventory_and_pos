"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { checkout, updatePendingOrder, markSalePaid, type CheckoutItem } from "@/lib/pos/actions";
import { holdOrder, finalizeHeldOrder, loadSalesPanel, cancelOrder, getReceipt, loadOrderForEdit, type SalesPanelData } from "@/lib/pos/hold";
import { quickAddCustomer } from "@/lib/customers/actions";
import type { EditOrder, PendingOrderRow, RecentSaleRow, SalesOrderDetail } from "@/lib/data";

export type CatalogItem = {
  id: string;
  name: string;
  sku: string;
  price: number;
  status: "in" | "low" | "out";
  imageUrl: string | null;
  available: number;
  category: string;
  /** POS selling-price band. null = open on that side. */
  minPrice: number | null;
  maxPrice: number | null;
  /** Show in the POS quick-add "Featured" strip. */
  featured: boolean;
  /** Other branches that DO have this in stock (for out/low items → transfer hint). */
  elsewhere?: { name: string; qty: number }[];
};

const ALL = "All Items";
const POS_STATUS: Record<CatalogItem["status"], { pill: string; icon: string; label: string }> = {
  in: { pill: "bg-primary-container/20 text-primary", icon: "check_circle", label: "In Stock" },
  low: { pill: "bg-tertiary-container/30 text-tertiary", icon: "warning", label: "Low" },
  out: { pill: "bg-surface-variant text-on-surface-variant", icon: "block", label: "Out" },
};

export type PosAccount = { id: string; name: string; kind: "bank" | "mobile" | "cash" };
export type PosCustomer = { id: string; name: string };
const kindIcon = (kind: PosAccount["kind"]) =>
  kind === "mobile" ? "smartphone" : kind === "cash" ? "payments" : "account_balance";
const genRef = () => `INV-${String(Math.floor(Math.random() * 9000) + 1000)}`;

type Line = { item: CatalogItem; qty: number; price: number };

/** Clamps a price into a product's [minPrice, maxPrice] band (open if null). */
function clampToBand(item: CatalogItem, value: number): number {
  const lo = item.minPrice ?? 0;
  const hi = item.maxPrice ?? Number.POSITIVE_INFINITY;
  return Math.min(Math.max(value, Math.max(lo, 0)), hi);
}

export function PosTerminal({
  catalog,
  currency,
  taxRate,
  accounts,
  customers,
  canPay,
  orgId,
  editOrder,
  companyName,
  logoUrl,
  tagline,
}: {
  catalog: CatalogItem[];
  currency: string;
  taxRate: number;
  accounts: PosAccount[];
  customers: PosCustomer[];
  canPay: boolean;
  /** Tenant id — namespaces the saved-cart key so carts never mix across orgs. */
  orgId: string;
  /** When set, the terminal edits this existing held/pending order instead of a new sale. */
  editOrder: EditOrder | null;
  companyName: string;
  logoUrl: string | null;
  tagline: string | null;
}) {
  // Editing is client state so Edit/Resume loads instantly (one query, no page reload).
  const [activeEdit, setActiveEdit] = useState<EditOrder | null>(editOrder);
  const editing = !!activeEdit;
  const heldEditing = editing && activeEdit?.kind === "held";
  const pendingEditing = editing && activeEdit?.kind === "pending";

  const [cart, setCart] = useState<Record<string, number>>(() => {
    if (!editOrder) return {};
    const c: Record<string, number> = {};
    for (const it of editOrder.items) c[it.productId] = it.quantity;
    return c;
  });
  const [account, setAccount] = useState<string | null>(canPay ? accounts[0]?.id ?? null : null);
  const [customer, setCustomer] = useState<PosCustomer | null>(
    editOrder && editOrder.customerId ? { id: editOrder.customerId, name: editOrder.customerName ?? "Customer" } : null,
  );
  const [discountInput, setDiscountInput] = useState(editOrder && editOrder.discount ? String(editOrder.discount) : "");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ orderNumber: string; total: number; due: boolean } | null>(null);
  const [orderRef, setOrderRef] = useState(() => (editOrder ? editOrder.orderNumber : genRef()));
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState(ALL);
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    if (!editOrder) return {};
    const p: Record<string, number> = {};
    for (const it of editOrder.items) p[it.productId] = it.unitPrice;
    return p;
  });
  const [flash, setFlash] = useState<string | null>(null);
  // In-POS printable receipt (never navigates away). autoPrint fires the print
  // dialog right after a sale so a connected printer prints automatically.
  const [receiptView, setReceiptView] = useState<{ orderId: string; autoPrint: boolean } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isDue = account === null;

  // ---- Persist the in-progress order so a refresh never loses it ----------
  // (Skipped while editing an existing order — that flow seeds from the order.)
  const storeKey = `pos:cart:${orgId}`;
  const hydrated = useRef(false);
  useEffect(() => {
    if (editing) { hydrated.current = true; return; }
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const s = JSON.parse(raw) as {
          cart?: Record<string, number>; prices?: Record<string, number>;
          discountInput?: string; customer?: PosCustomer | null; orderRef?: string;
        };
        if (s.cart) setCart(s.cart);
        if (s.prices) setPrices(s.prices);
        if (s.discountInput) setDiscountInput(s.discountInput);
        if (s.customer) setCustomer(s.customer);
        if (s.orderRef) setOrderRef(s.orderRef);
      }
    } catch { /* corrupt/absent storage — start fresh */ }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (editing || !hydrated.current) return; // don't persist while editing / before load
    try {
      if (Object.keys(cart).length === 0) localStorage.removeItem(storeKey);
      else localStorage.setItem(storeKey, JSON.stringify({ cart, prices, discountInput, customer, orderRef }));
    } catch { /* storage full/blocked — ignore */ }
  }, [editing, storeKey, cart, prices, discountInput, customer, orderRef]);

  const byId = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  // Real categories present in the catalog (empty ones never appear). "All Items"
  // is always first; the tab bar hides itself when there are no categories.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of catalog) if (p.category && p.category !== "—") set.add(p.category);
    return [ALL, ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [catalog]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((p) => {
      if (activeCat !== ALL && p.category !== activeCat) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [catalog, search, activeCat]);

  // How many products are shown, and how many units of them are in the store.
  const shownUnits = useMemo(() => shown.reduce((s, p) => s + Math.max(p.available, 0), 0), [shown]);
  // Featured products — quick-add strip (in-stock only).
  const featured = useMemo(() => catalog.filter((p) => p.featured && p.status !== "out"), [catalog]);

  // Effective unit price: the cashier's override (clamped) or the retail price.
  const priceOf = (item: CatalogItem) => prices[item.id] ?? item.price;

  const lines: Line[] = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ item: byId.get(id)!, qty }))
    .filter((l) => l.item)
    .map((l) => ({ ...l, price: priceOf(l.item) }));

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = Math.max(0, Math.min(Math.round((parseFloat(discountInput) || 0) * 100) / 100, subtotal));
  const taxable = Math.round((subtotal - discount) * 100) / 100;
  const tax = Math.round(taxable * (taxRate / 100) * 100) / 100;
  const total = Math.round((taxable + tax) * 100) / 100;
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function add(item: CatalogItem) {
    if (item.status === "out") return;
    setReceipt(null);
    setError(null);
    setCart((c) => ({ ...c, [item.id]: Math.min((c[item.id] ?? 0) + 1, Math.max(item.available, 1)) }));
    setFlash(item.id);
    window.setTimeout(() => setFlash((f) => (f === item.id ? null : f)), 700);
  }
  function setQty(id: string, qty: number) {
    // Never let a line exceed the product's on-hand stock (for this branch).
    const item = byId.get(id);
    const max = item ? Math.max(0, item.available) : qty;
    const capped = Math.min(Math.max(0, Math.floor(qty || 0)), max);
    if (item && qty > max) {
      setError(`Only ${max} of ${item.name} in stock.`);
    }
    setCart((c) => {
      const next = { ...c };
      if (capped <= 0) delete next[id];
      else next[id] = capped;
      return next;
    });
  }
  // Cashier edits a line's unit price — clamped to the product's allowed band.
  function setPrice(id: string, raw: number) {
    const item = byId.get(id);
    if (!item) return;
    const clamped = clampToBand(item, Math.max(0, Math.round(raw * 100) / 100));
    setPrices((p) => ({ ...p, [id]: clamped }));
  }
  function resetOrder() {
    setCart({});
    setPrices({});
    setDiscountInput("");
    setCustomer(null);
    setError(null);
    setReceipt(null);
    setOrderRef(genRef());
  }
  function clearOrder() {
    setCart({}); setPrices({}); setDiscountInput(""); setError(null); setReceipt(null);
  }
  // Leave edit mode and return to a fresh new-sale — no page reload.
  function exitEdit() {
    setActiveEdit(null);
    resetOrder();
    try { localStorage.removeItem(storeKey); } catch { /* ignore */ }
  }
  // Load a held/pending order into the terminal instantly (client-side, one query).
  function startEdit(orderId: string) {
    setError(null);
    startTransition(async () => {
      const o = await loadOrderForEdit(orderId);
      if (!o) { setError("Could not open that order — it may have changed."); return; }
      const c: Record<string, number> = {};
      const p: Record<string, number> = {};
      for (const it of o.items) { c[it.productId] = it.quantity; p[it.productId] = it.unitPrice; }
      setActiveEdit(o);
      setCart(c);
      setPrices(p);
      setDiscountInput(o.discount ? String(o.discount) : "");
      setCustomer(o.customerId ? { id: o.customerId, name: o.customerName ?? "Customer" } : null);
      setOrderRef(o.orderNumber);
      setReceiptView(null);
    });
  }

  function hold() {
    setError(null);
    const items: CheckoutItem[] = lines.map((l) => ({ productId: l.item.id, quantity: l.qty, unitPrice: l.price }));
    if (items.length === 0) return;
    startTransition(async () => {
      const res = await holdOrder(items, discount, customer?.id ?? null);
      if (res.ok) resetOrder();
      else setError(res.error);
    });
  }

  function complete() {
    setError(null);
    const items: CheckoutItem[] = lines.map((l) => ({ productId: l.item.id, quantity: l.qty, unitPrice: l.price }));
    startTransition(async () => {
      if (pendingEditing && activeEdit) {
        // Save changes to an existing pending (due) order.
        const res = await updatePendingOrder(activeEdit.id, items, discount, customer?.id ?? null);
        if (res.ok) exitEdit();
        else setError(res.error);
        return;
      }
      if (heldEditing && activeEdit) {
        // Finalize a held draft into a real sale (paid or due) + print the bill.
        const res = await finalizeHeldOrder(activeEdit.id, items, isDue ? null : account, customer?.id ?? null, discount);
        if (res.ok) { setReceiptView({ orderId: res.orderId, autoPrint: true }); exitEdit(); }
        else setError(res.error);
        return;
      }
      const res = await checkout(items, isDue ? null : account, customer?.id ?? null, discount);
      if (res.ok) {
        setReceipt({ orderNumber: res.orderNumber, total: res.total, due: res.due });
        setReceiptView({ orderId: res.orderId, autoPrint: true }); // print the bill
        setCart({});
        setPrices({});
        setDiscountInput("");
        setCustomer(null);
        setOrderRef(genRef());
      } else {
        setError(res.error);
      }
    });
  }

  const panelProps = {
    lines, count, fmt, currency, orderRef, receipt,
    customers, customer, setCustomer,
    onQty: setQty, onPrice: setPrice, flash,
    subtotal, discount, discountInput, setDiscountInput, tax, taxRate, total,
    accounts, account, setAccount, canPay, isDue,
    error, pending, onComplete: complete, onClear: clearOrder, onHold: hold,
    editing, heldEditing, pendingEditing, editOrderNumber: activeEdit?.orderNumber ?? null, onExitEdit: exitEdit,
  };

  return (
    <main className="flex flex-1 w-full overflow-hidden">
      {/* Left: catalog */}
      <div className="flex-1 flex flex-col h-full overflow-hidden lg:border-r border-outline-variant relative">
        <div className="p-gutter pb-sm space-y-md z-10 bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm">
          <div className="relative">
            <Icon name="search" className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-full pl-[44px] pr-md py-sm font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
              placeholder="Search products, scan barcode…"
              type="text"
            />
          </div>
          {categories.length > 1 && (
            <div className="flex gap-sm overflow-x-auto hide-scrollbar pb-xs">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCat(c)}
                  className={
                    activeCat === c
                      ? "whitespace-nowrap px-md py-xs bg-primary text-on-primary rounded-full font-label-md text-label-md shadow-sm"
                      : "whitespace-nowrap px-md py-xs bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high rounded-full font-label-md text-label-md transition-colors"
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {/* Product / stock count for the current view + pending-orders resume */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
              <Icon name="inventory_2" size={15} />
              <span>
                <span className="font-bold text-on-surface tabular-nums">{shown.length}</span>{" "}
                {shown.length === 1 ? "product" : "products"}
                {activeCat !== ALL && <span> in {activeCat}</span>} ·{" "}
                <span className="font-bold text-on-surface tabular-nums">{shownUnits.toLocaleString()}</span> in stock
              </span>
            </div>
            {!editing && <SalesPanel fmt={fmt} accounts={accounts} canPay={canPay} onReceipt={(id) => setReceiptView({ orderId: id, autoPrint: false })} onEdit={startEdit} />}
          </div>

          {/* Featured products — fast quick-add row */}
          {featured.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-xs">
              <span className="flex items-center gap-1 text-[11px] font-label-md text-on-surface-variant uppercase tracking-wide shrink-0 pr-1">
                <Icon name="star" size={13} className="text-tertiary" /> Featured
              </span>
              {featured.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => add(p)}
                  title={`${p.name} · ${fmt(p.price)}`}
                  className="shrink-0 max-w-[160px] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tertiary-container/25 border border-tertiary-container/40 text-on-surface hover:bg-tertiary-container/50 active:scale-95 transition-all font-label-md text-label-md"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="font-bold tabular-nums text-primary shrink-0">{fmt(p.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-gutter pt-md bg-surface-container-lowest pb-24 lg:pb-xl">
          {shown.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant gap-sm">
              <Icon name={catalog.length === 0 ? "inventory_2" : "search_off"} size={48} className="text-outline-variant" />
              <p className="font-body-md text-body-md">
                {catalog.length === 0
                  ? "No products to sell yet."
                  : activeCat !== ALL && !search.trim()
                    ? `No products in ${activeCat}.`
                    : "No products match your search."}
              </p>
              {(activeCat !== ALL || search.trim()) && catalog.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setActiveCat(ALL); setSearch(""); }}
                  className="mt-1 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container-highest transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-md">
              {shown.map((p) => <ProductCard key={p.id} p={p} fmt={fmt} onAdd={add} flash={flash === p.id} inCart={(cart[p.id] ?? 0) > 0} />)}
            </div>
          )}
        </div>
      </div>

      {/* Right: order panel — desktop */}
      <aside className="hidden lg:flex w-[400px] flex-shrink-0 flex-col bg-surface h-full shadow-[-4px_0_24px_rgba(0,0,0,0.04)] z-20">
        <OrderPanel {...panelProps} />
      </aside>

      {/* Mobile: floating cart bar */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-primary text-on-primary rounded-full shadow-lg px-5 py-3 flex items-center justify-between active:scale-[0.99] transition-transform"
      >
        <span className="flex items-center gap-2 font-label-md text-label-md">
          <span className="relative">
            <Icon name="shopping_cart" />
            {count > 0 && <span className="absolute -top-2 -right-2 bg-on-primary text-primary rounded-full text-[10px] font-bold w-4 h-4 flex items-center justify-center">{count}</span>}
          </span>
          {count > 0 ? `${count} ${count === 1 ? "item" : "items"}` : "View order"}
        </span>
        <span className="font-headline-lg text-[16px] font-bold tabular-nums">{fmt(total)}</span>
      </button>

      {/* Mobile: full-screen order drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-surface flex flex-col animate-[slideup_180ms_ease-out]">
          <OrderPanel {...panelProps} onClose={() => setMobileOpen(false)} />
        </div>
      )}

      {/* In-POS printable receipt — opens over the till, never navigates away */}
      {receiptView && (
        <ReceiptModal
          orderId={receiptView.orderId}
          autoPrint={receiptView.autoPrint}
          currency={currency}
          companyName={companyName}
          logoUrl={logoUrl}
          tagline={tagline}
          onClose={() => setReceiptView(null)}
        />
      )}

      <style>{`@keyframes slideup{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes flashring{0%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}100%{box-shadow:0 0 0 6px rgba(16,185,129,0)}}`}</style>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sales panel — a right slide-over with Held (drafts) · Pending (due) · Latest
// tabs. Data is lazy-loaded when opened (keeps the POS fast). Each order gets
// rich actions (view/edit/cancel/add-payment/bill). Bills open in a new tab so
// the POS is never navigated away from.
// ---------------------------------------------------------------------------
type SalesTab = "held" | "pending" | "recent";
function SalesPanel({ fmt, accounts, canPay, onReceipt, onEdit }: { fmt: (n: number) => string; accounts: PosAccount[]; canPay: boolean; onReceipt: (orderId: string) => void; onEdit: (orderId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SalesPanelData | null>(null);
  const [tab, setTab] = useState<SalesTab>("held");
  const [loading, start] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function refresh() {
    start(async () => {
      const d = await loadSalesPanel();
      setData(d);
      // Land on the first non-empty tab the first time.
      if (!data) setTab(d.held.length ? "held" : d.pending.length ? "pending" : "recent");
    });
  }
  function openPanel() { setOpen(true); refresh(); }

  const held = data?.held ?? [];
  const pending = data?.pending ?? [];
  const recent = data?.recent ?? [];
  const badge = held.length + pending.length;

  const tabs: { key: SalesTab; label: string; count: number }[] = [
    { key: "held", label: "Held", count: held.length },
    { key: "pending", label: "Pending", count: pending.length },
    { key: "recent", label: "Latest", count: recent.length },
  ];

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={openPanel}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary hover:bg-primary/90 shadow-sm transition-colors font-label-md text-label-md"
        title="Held, pending and recent sales"
      >
        <Icon name="receipt_long" size={18} /> Sales
        {data && badge > 0 && <span className="font-bold tabular-nums bg-white/25 rounded-full px-1.5 min-w-[20px] text-center">{badge}</span>}
      </button>

      {open && mounted && createPortal(
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed right-0 top-0 z-[61] h-full w-full max-w-[440px] bg-surface shadow-2xl flex flex-col animate-[slidein_180ms_ease-out]">
            {/* Header + tabs */}
            <div className="shrink-0 border-b border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center justify-between px-md py-3">
                <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2"><Icon name="receipt_long" className="text-primary" size={22} /> Sales</h2>
                <div className="flex items-center gap-1">
                  <button onClick={refresh} disabled={loading} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50" title="Refresh">
                    <Icon name="refresh" size={18} className={loading ? "animate-spin" : ""} />
                  </button>
                  <button onClick={() => setOpen(false)} className="p-2 rounded-lg text-on-surface-variant hover:bg-error-container/40 hover:text-error transition-colors" title="Close"><Icon name="close" size={20} /></button>
                </div>
              </div>
              <div className="flex px-2">
                {tabs.map((t) => (
                  <button key={t.key} type="button" onClick={() => setTab(t.key)}
                    className={`flex-1 py-2.5 text-center font-label-md text-label-md border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}>
                    {t.label}{t.count > 0 && <span className="ml-1 text-[11px] tabular-nums bg-surface-container-high rounded-full px-1.5">{t.count}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-md bg-surface-container-lowest">
              {loading && !data ? (
                <div className="flex flex-col items-center justify-center h-40 text-on-surface-variant gap-2"><Icon name="progress_activity" size={28} className="animate-spin" /> <span className="font-body-sm text-body-sm">Loading sales…</span></div>
              ) : (
                <div className="space-y-2.5">
                  {tab === "held" && (held.length === 0 ? <Empty text="No held orders." /> : held.map((o) => <SaleCard key={o.id} o={o} kind="held" fmt={fmt} accounts={accounts} canPay={canPay} onDone={refresh} onReceipt={onReceipt} onEdit={onEdit} onClose={() => setOpen(false)} />))}
                  {tab === "pending" && (pending.length === 0 ? <Empty text="No pending orders." /> : pending.map((o) => <SaleCard key={o.id} o={o} kind="pending" fmt={fmt} accounts={accounts} canPay={canPay} onDone={refresh} onReceipt={onReceipt} onEdit={onEdit} onClose={() => setOpen(false)} />))}
                  {tab === "recent" && (recent.length === 0 ? <Empty text="No sales yet." /> : recent.map((o) => <SaleCard key={o.id} o={o} kind="recent" fmt={fmt} accounts={accounts} canPay={canPay} onDone={refresh} onReceipt={onReceipt} onEdit={onEdit} onClose={() => setOpen(false)} />))}
                </div>
              )}
            </div>
          </div>
          <style>{`@keyframes slidein{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        </>,
        document.body,
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-center text-on-surface-variant font-body-sm text-body-sm py-10">{text}</p>;
}

// One order card with actions appropriate to its kind (held / pending / recent).
function SaleCard({
  o, kind, fmt, accounts, canPay, onDone, onReceipt, onEdit, onClose,
}: {
  o: PendingOrderRow | RecentSaleRow; kind: "held" | "pending" | "recent";
  fmt: (n: number) => string; accounts: PosAccount[]; canPay: boolean; onDone: () => void; onReceipt: (orderId: string) => void; onEdit: (orderId: string) => void; onClose: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [acct, setAcct] = useState<string>(accounts[0]?.id ?? "");
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const paid = "paid" in o ? o.paid : false;
  const time = "time" in o ? o.time : "";

  function doCancel() {
    if (!window.confirm(`Cancel order #${o.orderNumber}? This can't be undone.`)) return;
    setErr(null);
    start(async () => {
      const res = await cancelOrder(o.id);
      if (res.ok) onDone(); else setErr(res.error);
    });
  }
  function doPay() {
    if (!acct) { setErr("Choose an account."); return; }
    setErr(null);
    start(async () => {
      const res = await markSalePaid(o.id, o.orderNumber, acct);
      if (res.ok) { setPaying(false); onDone(); } else setErr(res.error);
    });
  }

  const badge =
    kind === "held" ? <Chip tone="tertiary">HELD</Chip>
    : kind === "pending" ? <Chip tone="tertiary">DUE</Chip>
    : paid ? <Chip tone="primary">PAID</Chip> : <Chip tone="tertiary">DUE</Chip>;

  return (
    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-body-md text-body-md text-on-surface font-semibold truncate">#{o.orderNumber}</p>
            {badge}
          </div>
          <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{o.customerName} · {o.itemCount} {o.itemCount === 1 ? "item" : "items"} · {o.date}{time ? ` ${time}` : ""}</p>
        </div>
        <span className="font-headline-lg text-[17px] font-bold tabular-nums text-on-surface shrink-0">{fmt(o.total)}</span>
      </div>

      {/* Add-payment inline (pending only) */}
      {paying && (
        <div className="mt-2 p-2 rounded-lg bg-surface-container-low border border-outline-variant">
          <p className="text-[11px] text-on-surface-variant mb-1">Receive full payment into:</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {accounts.map((a) => (
              <button key={a.id} type="button" onClick={() => setAcct(a.id)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${acct === a.id ? "bg-primary text-on-primary border-primary" : "bg-surface border-outline-variant text-on-surface-variant"}`}>
                {a.name}
              </button>
            ))}
            {accounts.length === 0 && <span className="text-[11px] text-error">No active accounts.</span>}
          </div>
          <div className="flex gap-1.5">
            <button onClick={doPay} disabled={busy || !acct} className="flex-1 py-1.5 rounded-md bg-primary text-on-primary text-[12px] font-semibold hover:opacity-90 disabled:opacity-50">{busy ? "Paying…" : `Pay ${fmt(o.total)}`}</button>
            <button onClick={() => setPaying(false)} className="px-3 py-1.5 rounded-md border border-outline-variant text-[12px] text-on-surface-variant hover:bg-surface-container-high">Cancel</button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!paying && (
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {kind === "pending" && canPay && (
            <button onClick={() => setPaying(true)} className="col-span-2 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 flex items-center justify-center gap-1.5"><Icon name="payments" size={16} /> Add Payment</button>
          )}
          {(kind === "held" || kind === "pending") && (
            <button onClick={() => { onEdit(o.id); onClose(); }} className="py-1.5 text-center rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-1">
              <Icon name={kind === "held" ? "play_arrow" : "edit"} size={15} /> {kind === "held" ? "Resume" : "Edit"}
            </button>
          )}
          <button onClick={() => onReceipt(o.id)} className="py-1.5 text-center rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1">
            <Icon name={kind === "recent" ? "print" : "receipt"} size={15} /> {kind === "recent" ? "Re-Print" : "Bill"}
          </button>
          {kind === "recent" && (
            <button onClick={() => onReceipt(o.id)} className="py-1.5 text-center rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-1"><Icon name="visibility" size={15} /> View</button>
          )}
          {(kind === "held" || kind === "pending") && (
            <button onClick={doCancel} disabled={busy} className="py-1.5 rounded-lg border border-error/40 text-error font-label-md text-label-md hover:bg-error-container/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 col-span-2"><Icon name="cancel" size={15} /> Cancel order</button>
          )}
        </div>
      )}
      {err && <p className="text-[11px] text-error mt-1.5">{err}</p>}
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone: "primary" | "tertiary" }) {
  const cls = tone === "primary" ? "bg-primary-container/30 text-primary" : "bg-tertiary-container/40 text-on-surface";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{children}</span>;
}

// ---------------------------------------------------------------------------
// In-POS printable receipt — loads an order's bill and shows it over the till.
// Print uses the browser dialog (default printer, or Save-as-PDF). Never leaves
// the POS. `autoPrint` fires the dialog automatically right after a sale.
// ---------------------------------------------------------------------------
function ReceiptModal({
  orderId, autoPrint, currency, companyName, logoUrl, tagline, onClose,
}: {
  orderId: string; autoPrint: boolean; currency: string; companyName: string; logoUrl: string | null; tagline: string | null; onClose: () => void;
}) {
  const [data, setData] = useState<SalesOrderDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [, start] = useTransition();
  const printed = useRef(false);
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  useEffect(() => {
    start(async () => {
      const d = await getReceipt(orderId);
      if (d) setData(d); else setNotFound(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  function doPrint() {
    document.body.classList.add("printing-receipt");
    const cleanup = () => { document.body.classList.remove("printing-receipt"); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 1500); // fallback if afterprint never fires
  }

  // Download the receipt as a self-contained HTML file (opens/prints anywhere).
  function doDownload() {
    if (!data) return;
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const rows = data.items.map((it) => `<tr><td>${esc(it.name)}</td><td class="c">${it.quantity}</td><td class="r">${money(it.unitPrice)}</td><td class="r">${money(it.lineTotal)}</td></tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(data.orderNumber)}</title><style>
      body{font-family:'Courier New',monospace;font-size:12px;max-width:80mm;margin:0 auto;padding:12px;color:#000}
      h1{font-size:15px;text-align:center;margin:0;text-transform:uppercase}.tag{text-align:center;font-size:10px;margin:0 0 6px}
      table{width:100%;border-collapse:collapse;margin:4px 0}td,th{padding:1px 0}.c{text-align:center}.r{text-align:right}
      .dash{border-top:1px dashed #000;margin:4px 0;padding-top:4px}.row{display:flex;justify-content:space-between}
      .tot{font-weight:bold;font-size:14px;border-top:1px solid #000;padding-top:3px;margin-top:3px}
      @media print{body{padding:0}}</style></head><body>
      ${logoUrl ? `<div style="text-align:center"><img src="${logoUrl}" style="height:40px"/></div>` : ""}
      <h1>${esc(companyName)}</h1>${tagline ? `<p class="tag">${esc(tagline)}</p>` : ""}
      <div class="dash">
        <div class="row"><span>Receipt</span><b>${esc(data.orderNumber)}</b></div>
        <div class="row"><span>Date</span><span>${data.date} ${data.time}</span></div>
        <div class="row"><span>Customer</span><span>${esc(data.customer?.name ?? "Walk-in")}</span></div>
        <div class="row"><span>Status</span><b>${data.paid ? "PAID" : data.isDue ? "DUE" : data.status.toUpperCase()}</b></div>
      </div>
      <table class="dash"><tr><th style="text-align:left">Item</th><th class="c">Qty</th><th class="r">Price</th><th class="r">Total</th></tr>${rows}</table>
      <div class="dash">
        <div class="row"><span>Subtotal</span><span>${money(data.subtotal)}</span></div>
        ${data.discount > 0 ? `<div class="row"><span>Discount</span><span>-${money(data.discount)}</span></div>` : ""}
        <div class="row"><span>Tax</span><span>${money(data.tax)}</span></div>
        <div class="row tot"><span>TOTAL</span><span>${money(data.total)}</span></div>
        ${data.dueAmount > 0 ? `<div class="row"><b>Balance due</b><b>${money(data.dueAmount)}</b></div>` : ""}
      </div>
      <p style="text-align:center;font-size:10px" class="dash">Thank you for your business!</p>
    </body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `receipt-${data.orderNumber}.html`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useEffect(() => {
    if (data && autoPrint && !printed.current) {
      printed.current = true;
      const t = setTimeout(doPrint, 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, autoPrint]);

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-md pos-receipt-noprint" onClick={onClose}>
      <div className="bg-white text-black w-full max-w-[360px] rounded-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-black/10 pos-receipt-noprint">
          <span className="font-semibold text-[13px]">Receipt</span>
          <div className="flex items-center gap-1">
            <button onClick={doDownload} disabled={!data} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-black/15 text-black text-[12px] font-semibold hover:bg-black/5 disabled:opacity-50"><Icon name="download" size={15} /> Download</button>
            <button onClick={doPrint} disabled={!data} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#006c49] text-white text-[12px] font-semibold hover:opacity-90 disabled:opacity-50"><Icon name="print" size={15} /> Print</button>
            <button onClick={onClose} className="p-1.5 rounded-md text-black/60 hover:bg-black/5"><Icon name="close" size={18} /></button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 font-mono text-[12px] leading-relaxed">
          {!data ? (
            <p className="text-center py-8 text-black/50">{notFound ? "Receipt not found." : "Loading…"}</p>
          ) : (
            <div className="pos-receipt-print">
              <div className="text-center mb-2">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-10 mx-auto mb-1 object-contain" />
                )}
                <p className="text-[15px] font-bold uppercase tracking-wide">{companyName}</p>
                {tagline && <p className="text-[10px]">{tagline}</p>}
              </div>
              <div className="border-t border-dashed border-black/40 pt-1 mb-1 text-[11px]">
                <div className="flex justify-between"><span>Receipt</span><span className="font-bold">{data.orderNumber}</span></div>
                <div className="flex justify-between"><span>Date</span><span>{data.date} {data.time}</span></div>
                <div className="flex justify-between"><span>Customer</span><span>{data.customer?.name ?? "Walk-in"}</span></div>
                <div className="flex justify-between"><span>Status</span><span className="uppercase font-semibold">{data.paid ? "PAID" : data.isDue ? "DUE" : data.status}</span></div>
              </div>
              <table className="w-full border-t border-dashed border-black/40 pt-1 text-[11px]">
                <thead><tr className="text-left border-b border-dashed border-black/40"><th className="py-0.5">Item</th><th className="text-center">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {data.items.map((it, i) => (
                    <tr key={i} className="align-top"><td className="py-0.5 pr-1">{it.name}</td><td className="text-center">{it.quantity}</td><td className="text-right">{money(it.unitPrice)}</td><td className="text-right">{money(it.lineTotal)}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-dashed border-black/40 mt-1 pt-1 text-[11px] space-y-0.5">
                <div className="flex justify-between"><span>Subtotal</span><span>{money(data.subtotal)}</span></div>
                {data.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>−{money(data.discount)}</span></div>}
                <div className="flex justify-between"><span>Tax</span><span>{money(data.tax)}</span></div>
                <div className="flex justify-between font-bold text-[14px] border-t border-black/40 mt-1 pt-1"><span>TOTAL</span><span>{money(data.total)}</span></div>
                {data.paidAmount > 0 && <div className="flex justify-between"><span>Paid</span><span>{money(data.paidAmount)}</span></div>}
                {data.dueAmount > 0 && <div className="flex justify-between font-bold"><span>Balance due</span><span>{money(data.dueAmount)}</span></div>}
              </div>
              <p className="text-center text-[10px] mt-3 pt-1 border-t border-dashed border-black/40">Thank you for your business!</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Order panel — header + customer (sticky) · cart list (scrolls) · footer (sticky)
// ---------------------------------------------------------------------------
type PanelProps = {
  lines: Line[]; count: number; fmt: (n: number) => string; currency: string; orderRef: string;
  receipt: { orderNumber: string; total: number; due: boolean } | null;
  customers: PosCustomer[]; customer: PosCustomer | null; setCustomer: (c: PosCustomer | null) => void;
  onQty: (id: string, qty: number) => void; onPrice: (id: string, price: number) => void; flash: string | null;
  subtotal: number; discount: number; discountInput: string; setDiscountInput: (s: string) => void;
  tax: number; taxRate: number; total: number;
  accounts: PosAccount[]; account: string | null; setAccount: (id: string | null) => void; canPay: boolean; isDue: boolean;
  error: string | null; pending: boolean; onComplete: () => void; onClear: () => void; onHold: () => void;
  editing: boolean; heldEditing: boolean; pendingEditing: boolean; editOrderNumber: string | null; onExitEdit: () => void;
  onClose?: () => void;
};

function OrderPanel(p: PanelProps) {
  const empty = p.lines.length === 0;
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header (sticky) */}
      <div className="px-md py-3 border-b border-outline-variant bg-surface-container-lowest shrink-0">
        <div className="flex items-center justify-between gap-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon name="shopping_cart" size={20} filled />
            </div>
            <div className="min-w-0">
              <h2 className="font-headline-lg text-headline-lg text-on-surface leading-tight">{p.editing ? "Editing Order" : "Current Order"}</h2>
              <p className="font-label-md text-label-md text-on-surface-variant truncate">
                #{p.orderRef} · {p.count} {p.count === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!empty && (
              <button onClick={p.onClear} className="flex items-center gap-1 px-2 py-1 rounded-md text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors font-label-md text-label-md" title="Clear order">
                <Icon name="delete_sweep" size={16} /> Clear
              </button>
            )}
            {p.onClose && (
              <button onClick={p.onClose} className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors" title="Close">
                <Icon name="close" size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editing banner — resuming a pending order */}
      {p.editing && (
        <div className="px-md py-2 bg-tertiary-container/25 border-b border-outline-variant flex items-center justify-between gap-2 shrink-0">
          <span className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface truncate">
            <Icon name="edit_note" size={16} className="text-tertiary" /> {p.heldEditing ? "Resuming held order" : "Editing pending order"} #{p.editOrderNumber}
          </span>
          <button type="button" onClick={p.onExitEdit} className="font-label-md text-label-md text-on-surface-variant hover:text-error transition-colors shrink-0">Cancel</button>
        </div>
      )}

      {/* Customer (sticky) */}
      <div className="px-md py-sm border-b border-outline-variant bg-surface shrink-0">
        <CustomerPicker customers={p.customers} value={p.customer} onChange={p.setCustomer} />
      </div>

      {/* Cart list (independently scrollable) — min height keeps ~4 rows visible */}
      <div className="flex-1 min-h-[200px] overflow-y-auto bg-surface">
        {p.receipt ? (
          <Receipt receipt={p.receipt} fmt={p.fmt} />
        ) : empty ? (
          <EmptyCart onBrowse={p.onClose} />
        ) : (
          <ul className="p-sm space-y-1.5">
            {p.lines.map(({ item, qty, price }) => (
              <CartItemRow key={item.id} item={item} qty={qty} price={price} fmt={p.fmt} onQty={p.onQty} onPrice={p.onPrice} highlighted={p.flash === item.id} />
            ))}
          </ul>
        )}
      </div>

      {/* Footer: summary + payment + complete (sticky) */}
      {!p.receipt && (
        <div className="shrink-0 border-t border-outline-variant bg-surface-container-lowest p-3 space-y-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
          {p.error && (
            <div className="rounded-lg border border-error/30 bg-error-container/40 px-sm py-xs font-body-sm text-body-sm text-on-error-container">{p.error}</div>
          )}
          <OrderSummary subtotal={p.subtotal} discountInput={p.discountInput} setDiscountInput={p.setDiscountInput} discount={p.discount} tax={p.tax} taxRate={p.taxRate} total={p.total} fmt={p.fmt} disabled={empty} />
          {/* Payment methods shown for a new sale or finalizing a held order — hidden when editing a due order (stays pending). */}
          {!p.pendingEditing && <PaymentMethods accounts={p.accounts} account={p.account} setAccount={p.setAccount} canPay={p.canPay} isDue={p.isDue} />}
          <div className="flex gap-2">
            {/* Hold — park the cart for later. Not shown while editing an existing order. */}
            {!p.editing && (
              <button
                onClick={p.onHold}
                disabled={empty || p.pending}
                className="shrink-0 px-4 py-3 rounded-xl border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high disabled:opacity-50 transition-colors flex items-center gap-1.5"
                title="Hold this order to serve later"
              >
                <Icon name="pause_circle" size={18} /> Hold
              </button>
            )}
            <button
              onClick={p.onComplete}
              disabled={empty || p.pending}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:cursor-not-allowed text-on-primary font-headline-lg text-[16px] py-3 rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {p.pending ? (
                <><Icon name="progress_activity" className="animate-spin" size={20} /> {p.pendingEditing ? "Saving…" : "Processing…"}</>
              ) : (
                <>
                  {p.pendingEditing ? "Update Order" : p.heldEditing ? (p.isDue ? "Complete (Due)" : "Complete Sale") : p.isDue ? "Place Due Order" : "Complete Order"}
                  <span className="opacity-80">·</span>
                  <span className="tabular-nums">{p.fmt(p.total)}</span>
                  <Icon name={p.pendingEditing ? "save" : "arrow_forward"} size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cart item row — thumbnail · name/SKU · qty controls · line total · remove
// ---------------------------------------------------------------------------
function CartItemRow({ item, qty, price, fmt, onQty, onPrice, highlighted }: { item: CatalogItem; qty: number; price: number; fmt: (n: number) => string; onQty: (id: string, qty: number) => void; onPrice: (id: string, price: number) => void; highlighted: boolean }) {
  const edited = Math.abs(price - item.price) > 0.001;
  const hasBand = item.minPrice != null || item.maxPrice != null;
  const commit = (v: string) => {
    const n = parseFloat(v);
    if (Number.isFinite(n)) onPrice(item.id, n);
  };
  const bandHint = hasBand
    ? `Allowed ${item.minPrice != null ? fmt(item.minPrice) : "—"} – ${item.maxPrice != null ? fmt(item.maxPrice) : "—"}`
    : "Editable price";

  return (
    <li
      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg border border-transparent hover:border-outline-variant hover:bg-surface-container-low transition-colors group"
      style={highlighted ? { animation: "flashring 700ms ease-out" } : undefined}
    >
      <div className="w-10 h-10 bg-surface-container-lowest rounded-md border border-outline-variant overflow-hidden flex-shrink-0 flex items-center justify-center">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="w-full h-full object-cover mix-blend-multiply" src={item.imageUrl} alt={item.name} />
        ) : (
          <Icon name="inventory_2" size={18} className="text-outline-variant" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">{item.name}</p>
          <span className="font-body-sm text-body-sm text-on-surface font-semibold tabular-nums shrink-0">{fmt(price * qty)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <button onClick={() => onQty(item.id, qty - 1)} className="px-2 py-0.5 text-on-surface-variant hover:bg-surface-container-high active:scale-95 transition-all" title="Decrease">
              <Icon name="remove" size={14} />
            </button>
            <span className="font-label-md text-label-md w-5 text-center tabular-nums">{qty}</span>
            <button
              onClick={() => onQty(item.id, qty + 1)}
              disabled={qty >= Math.max(0, item.available)}
              className="px-2 py-0.5 text-on-surface-variant hover:bg-surface-container-high active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={qty >= item.available ? `Only ${item.available} in stock` : "Increase"}
            >
              <Icon name="add" size={14} />
            </button>
          </div>
          {/* Editable unit price — wide enough for prices with many decimals. */}
          <label
            className={`flex items-center gap-0.5 rounded-lg border pl-2 pr-1.5 h-7 transition-colors ${edited ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-outline-variant bg-surface-container-lowest hover:border-primary/50"}`}
            title={bandHint}
          >
            <span className="text-[12px] text-on-surface-variant shrink-0">$</span>
            <input
              key={price}
              defaultValue={price}
              type="number"
              step="0.01"
              min={item.minPrice ?? 0}
              max={item.maxPrice ?? undefined}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
              className="w-[68px] bg-transparent border-none outline-none text-right font-body-sm text-body-sm text-on-surface tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={`Unit price for ${item.name}`}
            />
            <Icon name="edit" size={12} className="text-primary/70 shrink-0" />
          </label>
          <button onClick={() => onQty(item.id, 0)} className="text-on-surface-variant hover:text-error transition-colors shrink-0 p-0.5" title="Remove">
            <Icon name="delete" size={16} />
          </button>
        </div>
        {(hasBand || edited) && (
          <p className="mt-0.5 text-[10.5px] text-on-surface-variant flex items-center gap-1 truncate">
            {edited && <span className="line-through">{fmt(item.price)}</span>}
            <span className={hasBand ? "" : "italic"}>{bandHint}</span>
          </p>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
function OrderSummary({ subtotal, discountInput, setDiscountInput, discount, tax, taxRate, total, fmt, disabled }: {
  subtotal: number; discountInput: string; setDiscountInput: (s: string) => void; discount: number;
  tax: number; taxRate: number; total: number; fmt: (n: number) => string; disabled: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
        <span>Subtotal</span>
        <span className="tabular-nums text-on-surface">{fmt(subtotal)}</span>
      </div>
      <div className="flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
        <label htmlFor="pos-discount">Discount</label>
        <div className="flex items-center gap-2">
          {discount > 0 && <span className="text-error tabular-nums font-medium">−{fmt(discount)}</span>}
          <label className="flex items-center gap-0.5 bg-surface-container-lowest border border-outline-variant rounded-lg pl-2 pr-1.5 h-7 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-colors">
            <span className="text-on-surface-variant text-[12px] shrink-0">− $</span>
            <input
              id="pos-discount"
              type="number"
              min="0"
              step="0.01"
              disabled={disabled}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              placeholder="0.00"
              className="w-[72px] bg-transparent border-none outline-none text-right font-body-sm text-body-sm text-on-surface disabled:opacity-50 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </label>
        </div>
      </div>
      <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
        <span>Tax ({taxRate}%)</span>
        <span className="tabular-nums text-on-surface">{fmt(tax)}</span>
      </div>
      <div className="flex justify-between items-baseline pt-1.5 mt-0.5 border-t border-outline-variant">
        <span className="font-headline-lg text-headline-lg text-on-surface">Total</span>
        <span className="font-display-lg text-[22px] font-bold text-primary tabular-nums leading-none">{fmt(total)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function PaymentMethods({ accounts, account, setAccount, canPay, isDue }: {
  accounts: PosAccount[]; account: string | null; setAccount: (id: string | null) => void; canPay: boolean; isDue: boolean;
}) {
  if (!canPay) {
    return (
      <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-sm py-sm flex items-start gap-2">
        <Icon name="schedule" size={18} className="text-tertiary mt-0.5 shrink-0" />
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Placed as <span className="font-semibold text-on-surface">Due</span>. A cashier or accountant records the payment.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {accounts.map((a) => (
          <PayOption key={a.id} icon={kindIcon(a.kind)} label={a.name} active={account === a.id} onClick={() => setAccount(a.id)} />
        ))}
        <PayOption icon="schedule" label="Due" active={isDue} onClick={() => setAccount(null)} />
      </div>
      {accounts.length === 0 && (
        <p className="font-label-md text-label-md text-tertiary flex items-start gap-1">
          <Icon name="info" size={15} className="mt-0.5 shrink-0" />
          No accounts yet — add banks / mobile money in Finance → Cash &amp; Bank, or place a Due order.
        </p>
      )}
      {isDue && accounts.length > 0 && (
        <p className="font-label-md text-label-md text-tertiary flex items-center gap-1">
          <Icon name="info" size={15} /> Unpaid (due) order — no money counted until settled.
        </p>
      )}
    </div>
  );
}

function PayOption({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={
        active
          ? "bg-primary/10 border-2 border-primary py-1.5 px-2.5 rounded-lg flex items-center gap-1.5 transition-colors max-w-full"
          : "bg-surface border border-outline-variant py-1.5 px-2.5 rounded-lg flex items-center gap-1.5 hover:border-primary hover:bg-primary/5 transition-colors group max-w-full"
      }
    >
      <Icon name={icon} size={17} className={active ? "text-primary shrink-0" : "text-on-surface-variant group-hover:text-primary transition-colors shrink-0"} filled={active} />
      <span className={`font-label-md text-label-md truncate ${active ? "text-primary font-semibold" : "text-on-surface"}`}>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
function EmptyCart({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-lg">
      <div className="w-20 h-20 rounded-2xl bg-surface-container-low flex items-center justify-center mb-1">
        <Icon name="shopping_cart" size={36} className="text-outline-variant" />
      </div>
      <p className="font-headline-lg text-headline-lg text-on-surface">Your order is empty</p>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-[240px]">Add products from the catalog to start a new sale.</p>
      {onBrowse && (
        <button onClick={onBrowse} className="mt-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Icon name="grid_view" size={18} /> Browse Products
        </button>
      )}
    </div>
  );
}

function Receipt({ receipt, fmt }: { receipt: { orderNumber: string; total: number; due: boolean }; fmt: (n: number) => string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-2 p-lg">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon name="check_circle" size={34} className="text-primary" filled />
      </div>
      <p className="font-headline-lg text-headline-lg text-on-surface">{receipt.due ? "Due order placed" : "Sale complete"}</p>
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Order <span className="font-mono">{receipt.orderNumber}</span> · {fmt(receipt.total)}
      </p>
      {receipt.due ? (
        <p className="font-label-md text-label-md text-tertiary flex items-center gap-1">
          <Icon name="schedule" size={16} /> Marked unpaid — inventory updated, payment still owed.
        </p>
      ) : (
        <p className="font-label-md text-label-md text-on-surface-variant max-w-[240px]">Inventory, sales &amp; finance updated. Add a product to start the next order.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function ProductCard({ p, fmt, onAdd, flash, inCart }: { p: CatalogItem; fmt: (n: number) => string; onAdd: (i: CatalogItem) => void; flash: boolean; inCart: boolean }) {
  const meta = POS_STATUS[p.status];
  const isOut = p.status === "out";
  const label = p.status === "low" ? `Low (${p.available})` : meta.label;
  return (
    <button
      onClick={() => onAdd(p)}
      disabled={isOut}
      style={flash ? { animation: "flashring 700ms ease-out" } : undefined}
      className={`group relative bg-surface border rounded-xl overflow-hidden transition-all text-left ${isOut ? "opacity-70 cursor-not-allowed border-outline-variant" : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer border-outline-variant hover:border-primary/40"} ${inCart ? "ring-1 ring-primary/40" : ""}`}
    >
      <div className={`aspect-square bg-surface-container-low relative ${isOut ? "grayscale" : ""}`}>
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="w-full h-full object-cover mix-blend-multiply p-md" src={p.imageUrl} alt={p.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-outline-variant"><Icon name="inventory_2" size={44} /></div>
        )}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full font-label-md text-label-md flex items-center gap-1 shadow-sm ${meta.pill}`}>
          <Icon name={meta.icon} size={13} /> {label}
        </span>
        {inCart && !isOut && (
          <span className="absolute top-2 left-2 bg-primary text-on-primary rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
            <Icon name="check" size={15} />
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{p.name}</h3>
        <div className="flex justify-between items-center mt-1">
          <span className="font-label-md text-label-md text-on-surface-variant truncate">{p.sku}</span>
          <span className={`font-body-md text-body-md font-bold ${isOut ? "text-on-surface-variant line-through" : "text-primary"}`}>{fmt(p.price)}</span>
        </div>
        <div className="flex items-center gap-1 mt-1.5 font-label-md text-label-md">
          <Icon name="inventory_2" size={13} className={isOut ? "text-error" : p.status === "low" ? "text-tertiary" : "text-on-surface-variant"} />
          <span className={isOut ? "text-error font-semibold" : p.status === "low" ? "text-tertiary font-semibold" : "text-on-surface-variant"}>
            {isOut ? "Out of stock" : `${p.available.toLocaleString()} in stock`}
          </span>
        </div>
        {(isOut || p.status === "low") && p.elsewhere && p.elsewhere.length > 0 && (
          <div className="flex items-center gap-1 mt-1 font-label-md text-label-md text-secondary" title={p.elsewhere.map((e) => `${e.name}: ${e.qty}`).join(" · ")}>
            <Icon name="swap_horiz" size={13} />
            <span className="truncate">In {p.elsewhere[0].name} ({p.elsewhere[0].qty}){p.elsewhere.length > 1 ? ` +${p.elsewhere.length - 1}` : ""}</span>
          </div>
        )}
      </div>
      {!isOut && (
        <div className="absolute inset-0 bg-surface/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
          <span className="bg-primary text-on-primary font-label-md text-label-md px-3 py-2 rounded-full shadow-md flex items-center gap-1.5">
            <Icon name="add_shopping_cart" size={16} /> Add
          </span>
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Customer picker (preserved) — walk-in / search / select / quick-add
// ---------------------------------------------------------------------------
function CustomerPicker({ customers, value, onChange }: { customers: PosCustomer[]; value: PosCustomer | null; onChange: (c: PosCustomer | null) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  function pick(c: PosCustomer | null) {
    onChange(c);
    setOpen(false);
    setQuery("");
    setAdding(false);
  }
  function add() {
    setError(null);
    startTransition(async () => {
      const res = await quickAddCustomer(name, phone);
      if (res.ok) { pick(res.customer); setName(""); setPhone(""); }
      else setError(res.error);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-sm px-sm py-1.5 rounded-lg border border-outline-variant hover:border-primary hover:bg-primary/5 transition-colors text-left"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${value ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
          <Icon name={value ? "person" : "person_outline"} size={18} filled={!!value} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-body-sm text-body-sm text-on-surface font-medium truncate">{value ? value.name : "Walk-in customer"}</p>
          <p className="font-label-md text-label-md text-on-surface-variant">{value ? "Tap to change" : "Tap to attach a customer"}</p>
        </div>
        {value ? (
          <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); pick(null); }} onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); pick(null); } }} className="text-on-surface-variant hover:text-error shrink-0 cursor-pointer">
            <Icon name="close" size={18} />
          </span>
        ) : (
          <Icon name="expand_more" size={18} className="text-on-surface-variant shrink-0" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 z-40 bg-surface border border-outline-variant rounded-xl shadow-lg overflow-hidden">
            {adding ? (
              <div className="p-md space-y-sm">
                <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">New customer</p>
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent" />
                {error && <p className="font-body-sm text-body-sm text-error">{error}</p>}
                <div className="flex gap-sm">
                  <button type="button" onClick={add} disabled={pending || !name.trim()} className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    <Icon name={pending ? "hourglass_empty" : "check"} size={16} /> {pending ? "Adding…" : "Add & select"}
                  </button>
                  <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">Back</button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-sm border-b border-outline-variant">
                  <div className="flex items-center gap-sm px-sm py-1 rounded-lg border border-outline-variant">
                    <Icon name="search" size={16} className="text-on-surface-variant" />
                    <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers…" className="w-full bg-transparent border-none outline-none font-body-sm text-body-sm text-on-surface focus:ring-0 py-1" />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  <button type="button" onClick={() => pick(null)} className="w-full flex items-center gap-sm px-md py-sm hover:bg-surface-container-low transition-colors text-left">
                    <Icon name="person_outline" size={18} className="text-on-surface-variant" />
                    <span className="font-body-sm text-body-sm text-on-surface">Walk-in customer</span>
                  </button>
                  {filtered.map((c) => (
                    <button key={c.id} type="button" onClick={() => pick(c)} className="w-full flex items-center gap-sm px-md py-sm hover:bg-surface-container-low transition-colors text-left">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[11px] font-semibold">{c.name.charAt(0).toUpperCase()}</div>
                      <span className="font-body-sm text-body-sm text-on-surface truncate">{c.name}</span>
                      {value?.id === c.id && <Icon name="check" size={16} className="text-primary ml-auto shrink-0" />}
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="px-md py-sm font-body-sm text-body-sm text-on-surface-variant">No matches.</p>}
                </div>
                <button type="button" onClick={() => { setAdding(true); setError(null); setName(query); }} className="w-full flex items-center gap-sm px-md py-sm border-t border-outline-variant text-primary hover:bg-primary/5 transition-colors font-label-md text-label-md">
                  <Icon name="add" size={18} /> Add new customer
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

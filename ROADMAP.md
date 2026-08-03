# Smart Inventory & POS Platform — Roadmap

_AI-powered, multi-tenant inventory, POS & business-management platform._
_Last updated: 2026-07-26_

Stack: **Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · Supabase (Postgres + RLS + Auth) · Chart.js · Gemini/Claude for AI**

---

## Status at a glance

| Phase | Scope | Status |
|------|-------|--------|
| 1–3 | Design → 30+ screens → backend (schema + RLS + auth, live) | ✅ Done |
| 4 | Wire screens to live data | ✅ Done |
| 5 | Mutations & workflows | ✅ Done |
| 6 | AI features (NL query, smart reorder, dead-stock, forecasting) | ✅ Done |
| 6.5 | Finish the web app — every screen live, nav, fixes | ✅ Done |
| 7 | Flutter mobile app (offline-first) | ⬜ Not started |
| 8 | Hardening & deploy (tests, RBAC, Vercel) | ◑ In progress — RBAC enforced, tests added, deploy-ready |

**The entire web app now runs on live Supabase data — no static placeholder screens remain.**

---

## ✅ Phase 1–3 — Design, screens & backend

- 30+ screens designed (Emerald Enterprise design system).
- Multi-tenant Supabase backend **live**: 18 tables + Row-Level Security (`is_org_member` / `is_org_admin` helpers), `create_organization()` RPC, `handle_new_user` trigger.
- Auth: register → confirm → login → dashboard; unauthenticated routes redirect to `/login` via middleware.
- Generated `database.types.ts` for full type safety.

## ✅ Phase 4 — Live data wiring

- `getActiveOrg()` (session → org) and a shared data layer (`src/lib/data.ts`).
- Core read screens on real, RLS-scoped org data: Dashboard, Products, Customers, POS catalog, Warehouse, Finance, Suppliers.

## ✅ Phase 5 — Mutations & workflows

- **Products**: create / edit / delete with inventory + opening-stock movements.
- **POS checkout**: sales order + items, stock decrement, sale movement, income transaction.
- **Purchase receiving**: PO + inventory increment + expense transaction.
- **Customers**: create.
- Pattern: server action → write → `revalidatePath` → refresh. Inventory in/out loop ripples to dashboard, finance and warehouse.

## ✅ Phase 6 — AI features

- `/ai` grounded in a live data snapshot: smart reorder (urgency + velocity), dead-stock (0 sales / 90d), top sellers, weekly revenue trend, revenue windows, inventory value.
- Assistant: **Gemini** (primary) → **Claude** → deterministic rule-based fallback, so it answers common questions even with no API key.

## ✅ Phase 6.5 — Web app completed (this milestone)

**Every remaining screen wired to live data:**

- **Catalog**: Products, Categories, Brands, Units, Bundles, Barcodes
- **Inventory**: Warehouses, Locations, Stock Movements, Transfers, Stocktake
- **Sales**: POS, Customers, Loyalty, Returns
- **Purchasing**: Purchases (real POs), Suppliers (create), RFQ, Shipping
- **Finance**: Finance, Reports (live KPIs, top products, expense breakdown, reorder alerts)
- **Admin**: Overview, Roles (inline role editor), Workspace, Timesheets, Audit Logs, Settings

**Also delivered:**

- **Dashboard charts** now live — revenue trend (last 7 days) + inventory donut by real category.
- **Grouped sidebar navigation** exposing every module (was: 11 of ~28 reachable).
- **New CRUD workflows**: stocktake (adjustments), transfers (between warehouses), returns (restock + refund), RFQ (draft POs), add supplier / warehouse.
- **Performance**: navigation cut from ~5 to ~3 Supabase round-trips (cached `getActiveOrg`, joined queries, middleware forwards the validated user id).
- **Bug fixes**: create/delete dialogs now refresh the list instantly (no manual reload).
- **Product form overhaul**: working image field (URL + live preview), grouped stock thresholds, removed dead tax toggle & fake barcode button, cleaner labels.
- **End-to-end test-cycle runbook** (interactive checklist).

**One manual step outstanding:** apply migration
`web/supabase/migrations/20260726120000_bundles_shipping_timesheets.sql`
to activate the Bundles / Shipping / Timesheets tables, then regenerate `database.types.ts`.

---

## ⬜ Phase 7 — Flutter mobile app

- 22 emerald-themed mobile screens.
- Offline-first (local cache + sync).
- Shares the same Supabase backend and RLS.
- Core mobile flows: POS, stock lookup, receiving, dashboards.

## ⬜ Phase 8 — Hardening & deploy

- Automated tests (unit + end-to-end).
- Enforce RBAC across all mutations (owner/admin/manager/staff/accountant).
- Real file uploads via Supabase Storage (product images).
- Deploy to Vercel (web) + production Supabase config.
- Observability, rate limiting, and error handling polish.

---

## Suggested next steps

1. Apply the bundles/shipping/timesheets migration to finish the web feature set.
2. (Optional) Add Supabase Storage for real product-image uploads.
3. Start **Phase 7 (Flutter)** — or jump to **Phase 8** hardening/deploy if you want the web app production-ready first.

# Smart Inventory & POS — Web

AI-Powered Multi-Tenant Inventory, POS & Business Management Platform (web client).

Pixel-perfect implementation of the **Emerald Enterprise** Stitch design system.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v3** carrying the exact Stitch design tokens (`tailwind.config.ts`)
- **Chart.js** for dashboard analytics (ported from the source chart configs)
- Material Symbols + Inter/Geist fonts

> Design tokens are ported to a Tailwind **v3** config on purpose: the source
> screens are authored against v3-style config, so reusing the exact utility class
> strings (`p-md`, `text-headline-xl`, `bg-surface-container-low`, …) guarantees
> 1:1 visual parity. Migrating to Tailwind v4's CSS-first `@theme` is a follow-up.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the root redirects to `/dashboard`.

## Implemented screens

| Route         | Screen                        | Source                          |
| ------------- | ----------------------------- | ------------------------------- |
| `/dashboard`  | Executive Dashboard           | `omnistock/executive_dashboard` |
| `/products`   | Products / Inventory catalog  | `omnistock/products_inventory`  |
| `/pos`        | Point-of-Sale terminal        | `omnistock/pos_terminal`        |
| `/login`      | Enterprise sign-in            | `omnistock/login_smart_inventory_pos` |
| `/warehouse`  | Warehouse Overview            | `omnistock/warehouse_management` |
| `/purchases`  | Purchases & Suppliers         | `omnistock/purchases_suppliers` |
| `/finance`    | Finance & Expenses            | `omnistock/finance_expenses`    |
| `/reports`    | Reports & Export Hub          | `omnistock/reports_export_hub`  |
| `/ai`         | AI Intelligence (assistant + insights) | `omnistock/ai_intelligence_analytics` |
| `/admin`      | Administration / User Management | `omnistock/administration_user_management` |
| `/customers`  | Customers & CRM (segments, LTV, detail) | `omnistock/customer_management_orders` |
| `/products/new` | Add New Product (full data-entry flow) | `omnistock/add_new_product` |

### Full module & detail screens

| Route | Screen | | Route | Screen |
| --- | --- | --- | --- | --- |
| `/categories` | Product Categories | | `/returns` | Returns & Refunds |
| `/brands` | Brand Management | | `/shipping` | Shipping & Carriers |
| `/barcodes` | Barcode & SKU config | | `/loyalty` | Loyalty & Rewards |
| `/units` | Units of Measure | | `/suppliers` | Supplier detail |
| `/bundles` | Production & Bundling | | `/rfq` | Procurement & RFQ |
| `/stock-movements` | Stock Movements | | `/roles` | Roles & Permissions |
| `/stocktake` | Audit & Stocktake | | `/logs` | System Logs & Audit |
| `/transfers` | Transfer Orders | | `/timesheets` | HR & Timesheets |
| `/locations` | Store Locations | | `/workspace` | Company Workspace |
| `/customers` | Customers & CRM | | `/settings` | System Settings |

**All 30 omnistock enterprise (web) screens are now implemented** — 35 routes total,
production-build clean. The remaining Stitch assets are the 22 **emerald mobile** screens,
which belong to the separate Flutter mobile app (Phase 6), not this web client.

## Backend (Supabase) — multi-tenant foundation

The backend layer is written and build-clean, ready to apply to a Supabase project.

```
web/
  supabase/migrations/
    20260725120000_init_schema.sql   # tables + RLS + helpers + triggers
    20260725120100_seed_function.sql # seed_demo_data(org) for new workspaces
  src/lib/supabase/{client,server,middleware}.ts   # @supabase/ssr clients
  src/lib/supabase/database.types.ts               # placeholder — regenerate after apply
  src/lib/auth/actions.ts                          # signIn / signUp / signOut
  middleware.ts                                    # session refresh + auth gating
```

**Multi-tenancy:** every business is an `organizations` row; users join via
`organization_members` (with a `user_role` RBAC enum). Every domain table carries
`organization_id` and is protected by **Row-Level Security** — a row is only
visible/writable to members of its org (`is_org_member()` / `is_org_admin()` are
`SECURITY DEFINER` helpers that avoid RLS recursion). Sign-up creates the user's
workspace via the `create_organization()` RPC and makes them its owner.

**Design-preview mode:** with no `.env.local`, middleware does **not** gate routes,
so every screen stays viewable without a database. Add Supabase env vars to switch
on real auth + tenant isolation.

### Wiring it up (once a Supabase project exists)

```bash
cp .env.local.example .env.local   # fill NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
```

1. Apply both files in `supabase/migrations/` to the project (SQL editor, `supabase db push`, or MCP `apply_migration`).
2. Regenerate `src/lib/supabase/database.types.ts` from the live schema and drop the
   `as any` cast in `src/lib/auth/actions.ts`.
3. `npm run dev` → `/register` creates a workspace; the sidebar Log Out ends the session.

### Live status ✅

Applied to Supabase project **`mkjppjqrskohlwbqptbz`** (org "modern stack"): all 18
tables + RLS, helper functions, and the seed function. Real generated types are in
`database.types.ts`. `.env.local` is set (gitignored) so the app runs against the live DB —
auth gating is active and verified end-to-end.

- **Demo login:** `jaabiraxmed3703@gmail.com` / `jabir123` (workspace pre-seeded with
  categories, brands, warehouses, 3 products + inventory, 3 customers, transactions).
- **Email confirmation is ON** in the project, so new `/register` sign-ups must confirm via
  email before first login. To make sign-up frictionless for a demo, turn it off in the
  Supabase dashboard: **Authentication → Sign In / Providers → Email → uncheck "Confirm email"**.
- **Screens still render placeholder data** — the data-fetching layer (server components
  reading the user's org rows) is the next phase; the schema, RLS, auth and types are all in
  place for it.

## Structure

```
src/
  app/
    (auth)/login/           # standalone split-screen auth
    (dashboard)/            # sidebar + topbar chrome (AppShell)
      dashboard/
      products/
    pos/                    # full-screen POS terminal (own chrome)
    layout.tsx              # fonts, metadata
  components/
    AppShell.tsx  Sidebar.tsx  TopBar.tsx  Icon.tsx
    charts/RevenueChart.tsx  charts/InventoryDonut.tsx
  lib/nav.ts                # sidebar navigation model
tailwind.config.ts          # Emerald Enterprise design tokens
```

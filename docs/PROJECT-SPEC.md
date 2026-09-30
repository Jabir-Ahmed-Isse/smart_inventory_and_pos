# Inventory Pro — Product Requirements & System Specification

**Product:** Inventory Pro — Smart Inventory & POS + ERP Platform
**Type:** Multi-tenant SaaS for inventory, point-of-sale, finance, accounting, HR, payroll & business intelligence
**Status:** Actively developed (functional MVP+ with enterprise ERP modules)
**Document version:** 1.0 — 2026-08-18
**Owner:** Abdiweli Ali Mire

---

## 1. Executive Summary

Inventory Pro is a **multi-tenant, cloud business-management platform** that lets many independent companies ("organizations") run their entire operation from one application: catalog & stock, a touch point-of-sale, sales and purchasing, customers and suppliers, a full double-entry accounting engine, finance dashboards, HR, payroll, expenses, fixed assets, budgeting, and AI-assisted business intelligence.

Each company sees only its own data. A **platform administrator** (the SaaS operator) provisions companies and their owners; each **company owner/admin** then manages their own users, roles and settings. The product is designed to scale from a single shop to a large international company, positioned as an affordable, unified alternative to stitching together Odoo, QuickBooks and a separate POS.

The application ships as a single **Next.js** web app backed by **Supabase (PostgreSQL)** with row-level security enforcing tenant isolation.

---

## 2. Product Vision, Goals & Non-Goals

### 2.1 Vision
One system of record for a whole company's operations and money — from the cash register to the balance sheet — that is fast, secure by default, and understandable by non-accountants.

### 2.2 Goals
- **Unified operations:** inventory, POS, sales, purchasing, finance and accounting in one place, sharing one data model.
- **True multi-tenancy:** strict per-company isolation enforced at the database (RLS), safe for many companies on shared infrastructure.
- **Real double-entry accounting** auto-posted from operational events (sales, purchases, payroll, expenses) — not a spreadsheet bolt-on.
- **Role-based access** that fits real teams (owner, admin, manager, cashier, accountant, staff) with the ability to combine roles per person.
- **Enterprise depth:** HR, payroll (with advances & bonuses), expenses, fixed assets & depreciation, budgeting, and a BI/reporting hub.
- **AI assistance** grounded in the company's live data.
- **Performance:** production page renders in tens of milliseconds; navigation feels instant.

### 2.3 Non-Goals (current phase)
- Native mobile apps (the web app is responsive; POS works on tablets).
- Public customer-facing e-commerce storefront.
- Built-in payment-gateway/card processing (payments are recorded, not charged).
- Manufacturing/MRP, multi-currency consolidation across tenants.
- Self-service teammate email invitations (users are created by owner/admin or platform admin).

---

## 3. Target Users & Personas

| Persona | Role in system | Needs |
|---|---|---|
| **Platform Operator** | Platform admin (SaaS owner) | Create/suspend companies, provision owners, oversee the platform |
| **Business Owner** | `owner` | Full control of their company, company profile, users, all modules & money |
| **Administrator** | `admin` | Same as owner except workspace ownership/billing |
| **Branch/Ops Manager** | `manager` | Stock, purchasing, sales processing, reports — no finance internals |
| **Accountant/Finance** | `accountant` | Finance, accounting, payments, reports — no inventory edits |
| **Cashier** | `cashier` | Sell at POS and settle payments into bank/mobile-money accounts |
| **Sales Staff** | `staff` | Ring up sales at POS; place unpaid ("due") orders for a cashier to settle |

A single person can hold **more than one role** (e.g. Manager *and* Accountant) — see §7.

---

## 4. Technology Stack & Architecture

### 4.1 Stack
- **Framework:** Next.js 15 (App Router, React Server Components, Server Actions, Suspense streaming), React 19, TypeScript.
- **Bundler/dev:** Turbopack in development; standard Next build for production.
- **Backend/DB:** Supabase — PostgreSQL, Auth, Row-Level Security (RLS), service-role admin API.
- **Data access:** `@supabase/ssr` (server & browser clients) + a service-role admin client for cross-tenant/privileged reads.
- **UI:** Tailwind CSS with a custom Material-inspired design-token system (surface/on-surface, primary/secondary/tertiary, headline/body/label type scales), `@tailwindcss/forms`, `clsx`.
- **Charts:** Chart.js 4 (lazy-loaded on the client to keep bundles small).
- **Spreadsheets:** SheetJS (`xlsx`) for Excel/CSV import & export.
- **AI:** Anthropic SDK (Claude) and a Google Gemini path, with a deterministic grounded fallback engine.
- **Testing:** Vitest (unit tests for pure compute — finance, accounting, RBAC, purchasing, ERP).

### 4.2 High-level architecture
```
Browser (React Server + Client Components)
        │   Server Actions (mutations)          Suspense-streamed reads
        ▼
Next.js App Router  ──►  middleware (session validation, x-user-id header)
        │
        ├─ lib/*/data.ts    → read queries (RLS-scoped or service-role)
        ├─ lib/*/actions.ts → "use server" mutations (self-authorizing)
        └─ lib/org.ts       → active-org resolver + effective roles (cached)
        ▼
Supabase / PostgreSQL  ──►  Row-Level Security (per-organization isolation)
                            + auto-posting triggers/functions (accounting)
```

### 4.3 Code organization
- `web/src/app/(auth)` — login/register (public).
- `web/src/app/(dashboard)` — the authenticated app; route groups `(sales)` and `(purchasing)` carry their own sub-navigation.
- `web/src/app/pos`, `web/src/app/payslip/[id]` — full-screen operational surfaces.
- `web/src/lib/<domain>/data.ts` — read/query layer (per module).
- `web/src/lib/<domain>/actions.ts` — server-action mutation layer (per module).
- `web/src/components` — shared UI (AppShell, Sidebar, charts, dialogs, settings).
- `web/supabase/migrations` — versioned SQL migrations (applied manually by the owner in the Supabase SQL editor).

**Scale today:** ~96 routes/pages, 15 data modules, 23 server-action modules, 47 database tables, 14 migrations.

---

## 5. Multi-Tenancy & Security Model

- **Tenant = organization.** Every business table carries `organization_id`; **RLS policies** restrict every row to members of that organization (helpers such as `is_org_member`, `org_role`).
- **Session flow:** middleware validates the Supabase session and forwards a trusted `x-user-id` header; `getActiveOrg()` resolves the user's active organization and caches it (30s) keyed by user id — **cache keys always include tenant context** so no entry can mix tenants.
- **Two privilege tiers:**
  - *Platform admin* (`profiles.is_platform_admin`) — the SaaS operator; can see across tenants via the service-role client only where explicitly gated.
  - *Company roles* — scoped strictly to one organization.
- **Defense in depth:** UI hides what a role can't use (nav filtering), **and** every page re-checks access server-side (`requireRole`), **and** RLS is the final backstop at the database.
- **Service-role client** (`createAdminClient`) is server-only, bypasses RLS, and every caller must self-authorize before using it.
- **Company suspension:** a platform admin can deactivate a company (`organizations.is_active=false`); suspended members are locked out (platform admins exempt).
- **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` and AI keys live in server environment only; never shipped to the client.

---

## 6. Onboarding & User Provisioning

- **Company signup / registration** creates a Supabase auth user **and** a brand-new organization owned by that user (workspace signup — every registration spins up a separate tenant).
- **Platform-driven provisioning:** the platform admin creates a company + its owner from the Platform Console; company owners/admins then create additional users inside their own company (no email self-invite).
- User creation uses the Supabase Admin API (email pre-confirmed) so people can sign in immediately with a shared temporary password they can later change.

---

## 7. Roles & Permissions (RBAC + Multi-Role)

### 7.1 Roles
`owner · admin · manager · staff · cashier · accountant` (PostgreSQL `user_role` enum).

| Role | Can do |
|---|---|
| **owner** | Everything, plus workspace ownership; only an owner can grant the owner role; owner cannot self-demote |
| **admin** | Full system access except billing/ownership; manage users & roles |
| **manager** | Inventory, purchasing, sales processing, reports (the "stock" hat) |
| **staff** | Sell at POS; places unpaid (due) orders |
| **cashier** | Settle due orders into bank/mobile-money accounts; sell & take payment |
| **accountant** | Finance, accounting, payments, reports; no inventory edits |

### 7.2 Multi-role (primary + extra roles)
A member has **one primary role** plus an optional set of **extra roles**. **Effective access = primary ∪ extra roles** (owner always covers everything). This lets one person be, e.g., *Manager (stock) + Accountant*.

- Enforced everywhere access is checked: `requireRole` passes if **any** effective role qualifies; the sidebar shows a section if any effective role grants it.
- Editable in **Roles & Permissions** via a per-person editor: a primary-role dropdown plus toggle chips for extra roles (with Save/Cancel).
- **Guardrails:** only an owner may grant the owner role; you cannot demote yourself as owner; invalid roles are rejected server-side.
- **Storage:** `organization_members.role` (primary) + `organization_members.extra_roles user_role[]`. Migration-safe: if `extra_roles` isn't present yet, the app degrades gracefully to single-role.

---

## 8. Data Model (Domains & Key Tables)

47 tables, grouped by domain (all tenant-scoped by `organization_id` unless noted):

- **Tenancy & identity:** `organizations`, `organization_members`, `profiles`, `audit_logs`.
- **Catalog:** `products`, `categories`, `brands`, `units`, `product_bundles`, `bundle_items`.
- **Inventory:** `warehouses`, `inventory_levels`, `stock_movements`.
- **Sales:** `sales_orders`, `sales_order_items`, `customers`.
- **Purchasing:** `purchase_orders`, `purchase_order_items`, `suppliers`, `shipments`.
- **Payments & finance:** `transactions`, `payment_accounts`.
- **Accounting (double-entry):** `chart_of_accounts`, `journal_entries`, `journal_lines`, `account_mappings`.
- **HR:** `employees`, `departments`, `positions`, `attendance`, `leave_types`, `leave_requests`, `timesheets`.
- **Payroll:** `salary_components`, `employee_components`, `pay_runs`, `payslips`, `payslip_items`, `pay_adjustments`, `employee_advances`, `advance_repayments`.
- **Expenses:** `expenses`, `expense_categories`, `recurring_expenses`.
- **Advanced finance:** `fixed_assets`, `depreciation_entries`, `budgets`, `budget_lines`.

Company profile fields (name, legal name, industry, tax id, registration number, address, contact, currency, timezone, tax rate, logo) live on `organizations`.

---

## 9. Feature Modules

### 9.1 Authentication & Onboarding
Login, registration (creates workspace), session middleware, sign-out, profile (name + avatar upload compressed to a data URL).

### 9.2 Platform Console (`/platform`) — platform admin only
Create companies + owners, cross-tenant company list with status, per-company detail (`/platform/[id]`): profile, business stats (products/warehouses/customers/sales+revenue/POs), members with emails, suspend/reactivate toggle, add-user dialog, and grant-platform-admin by email.

### 9.3 Company Workspace & Profile (`/workspace`)
Two tabs:
- **Company Profile** — international-grade profile editor: branding (logo upload auto-resized to ≤256px PNG, company name, legal name), company details (industry, registration no., tax/VAT id), contact (email/phone/website), registered address, and regional settings (currency, timezone, default tax rate). Owner/admin editable; permission-checked server-side.
- **Workspace & Branches** — branch/personnel/region KPIs, branches & warehouses table, workspace summary and team panel.

### 9.4 Dashboard (`/dashboard`)
At-a-glance KPIs, revenue chart, inventory donut, recent activity — parallel-fetched and Suspense-streamed for fast first paint.

### 9.5 Catalog & Products
`/products` (server-paginated explorer over a `product_stock_v` view, search/filter, product detail, create/edit, image upload), `/categories`, `/brands`, `/units`, `/bundles`, `/barcodes`. Excel/CSV **product import** (`/products/import`).

### 9.6 Inventory & Warehouses
`/warehouse` (branches with stock value), `/locations`, `/stock-movements`, `/stocktake`, `/transfers`, and per-product-per-warehouse `inventory_levels`.

### 9.7 Point of Sale (`/pos`)
Full-screen touch POS: product grid + cart, **premium Current Order panel** with independently-scrollable cart items (≥4 visible before scrolling) and fixed summary/payment/complete area, line/order **discounts**, tax on `(subtotal − discount)`, multiple payment methods, cash/bank/mobile-money account selection, and a **due-order** flow (staff place unpaid orders; a cashier settles them into an account). Records the acting user on every sale.

### 9.8 Sales (`/sales`)
Sub-navigated section: overview dashboard, `/sales/analytics`, orders (`(sales)/orders`, order detail), `/sales/returns` (top-level sidebar item), `(sales)/loyalty`, and **customers** (`(sales)/customers`) with **customer import** (`/customers/import`).

### 9.9 Purchasing (`/purchases`)
ERP purchasing: dashboard, advanced PO table, PO detail with workflow timeline, goods **receiving**, **analytics**, `/purchases/returns`, plus `(purchasing)` RFQ and shipping. **Suppliers** is a separate page (`(purchasing)/suppliers`) with **supplier import/export** (`/suppliers/import`).

### 9.10 Finance (`/finance`)
Enterprise finance section (live data): overview, income, expenses, transactions, invoices, payments, receivables, payables, cash-flow, cash & bank, profit & loss, and **AI insights** — Chart.js visualizations throughout.

### 9.11 Accounting Engine (`/accounting`) — double-entry
Chart of accounts, journal, general ledger, trial balance, balance sheet, ledger profit & loss, and **budgets** (`/accounting/budgets`, budget detail with variance). Sales, purchases, payroll and expenses **auto-post** balanced journal entries via database functions/mappings.

### 9.12 HR (`/hr`)
Employees (with **employee import**), departments, positions, attendance, leave (types & requests). Management-only access. Feeds payroll.

### 9.13 Payroll (`/payroll`)
Salary components, pay runs & payslips (`/payroll/runs`, run detail), **advances** with auto-deducted loans (`/payroll/advances`), and one-off **pay adjustments** (bonuses/deductions per pay run). Printable payslip page (`/payslip/[id]`). Posts to the accounting ledger.

### 9.14 Expenses (`/expenses`)
Vendor bills/expenses (approve → pay), **recurring** rent/utilities, and expense **categories** mapped to ledger accounts.

### 9.15 Advanced Finance
**Fixed assets** & depreciation (`/assets`), and **budgeting** with variance (under accounting). Completes the ERP expansion.

### 9.16 Reports / Business Intelligence (`/reports`)
12-section BI hub: sales, purchases, products, inventory, customers, suppliers, warehouse, financial, plus a custom report builder (`/reports/custom`), scheduled reports (`/reports/scheduled`), and an AI report path (`/reports/ai`). Reuses finance chart components and analytics helpers.

### 9.17 AI Assistant (`/ai`, finance & reports AI)
AI over the company's **live data** (Claude/Gemini) with a deterministic grounded fallback so answers are always available and accurate.

### 9.18 Administration — Users, Roles & Activity (`/admin`, `/roles`)
- **Overview (`/admin`):** summary tiles (people, roles in use, multi-role users, tracked actions), a **User Directory** (real name, **email**, primary + extra roles, last sign-in, per-user activity counts), and a live **Activity stream** — "who did what" (sales, purchases, money movements) built from real business tables, filterable by person and by type.
- **Roles & Permissions (`/roles`):** role reference & capability matrix, team directory, per-person **multi-role editor**, and a "Create User" dialog.
- `/logs` — audit log page.

### 9.19 Settings (`/settings`)
Profile, workspace and preferences tabs; feature flags/config and workflow settings.

---

## 10. Cross-Cutting Capabilities

- **Import/Export:** Excel/CSV import for products, customers, suppliers and employees (duplicate detection with skip reporting); supplier export.
- **Activity visibility:** a unified, real activity feed derived from live operational data (not a synthetic log), attributing each event to the acting user.
- **Company branding:** each tenant's own logo + name render in the sidebar and across the app.
- **Design system:** consistent Material-inspired tokens, light/dark friendly surfaces, responsive layouts, skeleton loading states per module.

---

## 11. Non-Functional Requirements

### 11.1 Performance
- Production page render measured at ~15–20 ms; the historically "slow" navigation was **dev-mode compilation**, addressed with Turbopack dev, chart lazy-loading, server-side product pagination, and parallel dashboard fetches.
- `getActiveOrg` cached (30s, tenant-keyed); Suspense shells + per-module `loading.tsx` for instant skeletons.
- **Known lever:** the largest real latency is network round-trip to the Supabase region; hosting the database closer to users is the top transformative optimization.

### 11.2 Security & Privacy
- RLS-enforced tenant isolation; tenant-scoped cache keys; server-side authorization on every privileged path; secrets server-only.
- Credential/payment entry is out of scope for automation (recorded, not charged).

### 11.3 Reliability & Data Integrity
- Double-entry accounting keeps books balanced; operational events post balanced journals.
- Mutations roll back partial work on failure (e.g., orphaned auth users removed if membership insert fails).

### 11.4 Scalability & Maintainability
- Clear per-domain `data.ts` / `actions.ts` separation; migration-safe patterns (features degrade gracefully when a column isn't applied yet).
- Migrations are additive and applied deliberately by the operator.

---

## 12. Database Migrations

Versioned SQL under `web/supabase/migrations` (applied manually in the Supabase SQL editor):

1. `20260725120000_init_schema` — core schema (orgs, members, products, sales, purchases, transactions, audit).
2. `20260725120100_seed_function` — demo seed.
3. `20260726120000_bundles_shipping_timesheets`.
4. `20260804120000_payment_accounts_cashier` — payment accounts + cashier role + bank/mobile methods.
5. `20260815120000_accounting_engine` — double-entry ledger + auto-posting.
6. `20260815130000_hr_people` — HR.
7. `20260815140000_payroll` — payroll, advances, loans.
8. `20260815150000_expenses` — bills, recurring, categories.
9. `20260815160000_advanced_finance` — fixed assets, depreciation, budgets.
10. `20260815170000_pay_adjustments` — payroll bonuses/adjustments. *(pending apply)*
11. `20260815180000_product_stock_view` — `product_stock_v` for paginated products. *(pending apply)*
12. `20260815190000_org_logo` — company logo column. *(pending apply)*
13. `20260815200000_org_profile` — extended company-profile columns. *(pending apply)*
14. `20260815210000_member_extra_roles` — multi-role support. *(pending apply)*

> **Operational note:** migrations 10–14 are pending application on the live database. Each is written to degrade gracefully until applied.

---

## 13. Testing

Vitest unit tests cover pure compute and access logic: `finance`, `accounting`, `rbac` (including multi-role cases), `purchasing`, and `erp`. Run with `npm test` (or `node node_modules/vitest/vitest.mjs run`). The Supabase server module is stubbed so compute functions import cleanly in tests.

> Note: the project folder name contains an `&`, which breaks some npm script invocations on Windows; scripts invoke Next/Vitest via `node` directly to work around this.

---

## 14. Deployment

- **Hosting:** designed for Vercel (project root = `web`), with Supabase as the managed backend.
- **Setup:** configure env vars (Supabase URL, anon key, service-role key, AI keys), apply migrations in order, set Supabase auth redirect URLs, then smoke-test.
- **Env:** `web/.env.example` documents required variables; `DEPLOY.md` documents the deploy flow.

---

## 15. Roadmap & Open Items

- **Apply pending migrations** (10–14 above) to unlock payroll adjustments, product pagination view, company logo, full company profile, and multi-role.
- **Region optimization:** move the Supabase database to a region closer to users for the biggest latency win.
- **Action-level multi-role:** extend fine-grained write gates (beyond page/nav access) to consider all effective roles where relevant.
- **Future candidates (non-goals today):** teammate email invites, multi-currency, e-commerce storefront, native mobile, payment-gateway processing.

---

## 16. Glossary

- **Organization / tenant / workspace / company** — one customer business; the isolation boundary.
- **RLS** — PostgreSQL Row-Level Security enforcing per-organization data access.
- **Effective roles** — the union of a member's primary role and extra roles.
- **Due order** — an unpaid sale placed by staff, later settled by a cashier into an account.
- **Auto-posting** — automatic creation of balanced journal entries from operational events.
- **Service-role client** — a privileged, server-only Supabase client that bypasses RLS (used only where explicitly authorized).

---

*This specification reflects the system as built at document version 1.0. Feature availability of items marked "pending apply" depends on the corresponding database migration being applied to the live database.*

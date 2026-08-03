# Smart Inventory & POS

> AI-Powered Multi-Tenant Inventory & Point of Sale (POS) Management System built with Next.js, TypeScript, Tailwind CSS, and Supabase.

![License](https://img.shields.io/badge/license-MIT-green)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)
![Tests](https://img.shields.io/badge/tests-Vitest-yellow)
![Status](https://img.shields.io/badge/status-Active-success)

---

## 📖 Overview

Smart Inventory & POS is a modern enterprise-ready SaaS platform that helps businesses manage inventory, warehouses, suppliers, customers, purchases, sales, finance, and point-of-sale operations from a single dashboard.

The system combines real-time inventory management, powerful analytics, AI-powered business insights, and a clean enterprise UI inspired by Shopify, Stripe, and Odoo — with strict **multi-tenant isolation** (every business's data is separated by Supabase Row-Level Security) and **role-based access control**.

Built as a portfolio-quality SaaS application to demonstrate production-ready full-stack development.

---

## 🚀 Live Demo

**Live app:** `(https://smart-inventory-pos-six.vercel.app/)`  ← _replace with your Vercel URL_

**Demo login (shared sandbox):**
- Email: `demo@smartinventory.app`
- Password: `DemoPass123!`

_Or register your own free workspace from the app to explore with a clean slate._

---

## ✨ Features

### Dashboard
- Executive analytics dashboard with live KPIs
- Revenue & profit trends (real charts)
- Inventory value & low-stock insights
- Top products and recent activity
- AI business summary

### Inventory
- Product management (create / edit / delete, image upload)
- Categories, brands, units
- Barcode & label view
- Stocktake / physical count reconciliation
- Low-stock alerts & inventory valuation
- Full stock-movement history (audit trail)

### Warehouse
- Multiple warehouses / locations
- Inter-warehouse stock transfers
- Goods receiving
- Per-warehouse inventory tracking

### Point of Sale (POS)
- Fast checkout with a live cart
- Cash / Card / Mobile / **Credit (Due)** payment methods
- Order history & "mark as paid" for due orders
- Automatic inventory + finance updates on every sale

### Purchasing (ERP)
- Procurement dashboard (KPIs, spend trends, supplier performance)
- Purchase Orders with an advanced table + PO detail page
- **Visual ERP workflow timeline** (RFQ → Ordered → Approved → Receiving → Received → Invoiced → Paid → Completed)
- Dedicated Goods Receiving
- Suppliers, Requests for Quotation (RFQ), Purchase Returns, Purchase Analytics

### Customers
- Customer management & segments
- Loyalty points & tiers
- Purchase history

### Finance (12 pages)
- Overview, Transactions (search + CSV export)
- Income, Expenses, Cash & Bank
- Invoices, Payments, Receivables & Payables (with aging)
- Profit & Loss, Cash Flow (with forecast)
- AI financial insights

### Reports & Analytics (12 sections)
- Executive, Sales, Inventory, Purchases
- Customers, Suppliers, Financial, Warehouse, Products
- AI Insights, a Custom Report builder (pick dataset → columns → export CSV/PDF), and Scheduled Reports

### AI Features
- Natural-language AI assistant grounded in your live data (Google Gemini, with a deterministic fallback so it always works)
- Business Health Score
- Sales & demand forecasting
- Smart reorder suggestions
- Dead-stock detection
- Profit optimization & customer insights

---

## 🖼 Screenshots

_Add screenshots here — Dashboard, Inventory, POS, Purchasing, Finance, Reports, AI Assistant._

---

## 🏗 System Architecture

```text
Browser (Next.js App Router · React Server Components)
        │
        ▼
Middleware (Supabase session validation + auth gating + RBAC)
        │
        ▼
Server Actions & Server Components
        │
        ▼
Supabase  ──  Auth  ·  PostgreSQL (18 tables)  ·  Row-Level Security
        │
        ▼
Google Gemini API  (AI insights & assistant, with deterministic fallback)
```

---

## 🛠 Tech Stack

### Frontend
- **Next.js 15** (App Router, Server Components & Server Actions)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS**
- **Chart.js** (dashboards & analytics)
- `clsx`

### Backend
- **Supabase** — PostgreSQL, Authentication, Row-Level Security
- Multi-tenant schema (18 tables) with `is_org_member` / `is_org_admin` RLS helpers
- SQL migrations under `web/supabase/migrations`

### AI
- **Google Gemini** (`@google` Generative Language API) — grounded, live-data answers
- Optional **Anthropic Claude** fallback
- Deterministic rule-based analyst as a final fallback

### Testing & Tooling
- **Vitest** (unit tests for the finance / RBAC / purchasing logic)
- ESLint, Git, GitHub, **Vercel** (deploy)

---

## 📂 Project Structure

```text
smart-inventory-pos/
├── DEPLOY.md                 # Vercel deployment guide
├── ROADMAP.md                # Build phases & status
└── web/                      # the Next.js app (Vercel root directory)
    ├── src/
    │   ├── app/              # routes (dashboard, pos, finance, reports, purchases, …)
    │   ├── components/       # shared UI (charts, KPI cards, dialogs, nav)
    │   └── lib/              # data layer, server actions, RBAC, AI, Supabase clients
    ├── supabase/migrations/  # schema + RLS + seed
    └── test/                 # Vitest unit tests
```

---

## 🚀 Getting Started

### 1. Clone

```bash
git clone https://github.com/apdiweli/smart-inventory-pos.git
cd smart-inventory-pos/web
```

### 2. Install

```bash
npm install
```

### 3. Environment variables

Copy the example and fill in your Supabase (and optionally Gemini) keys:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=            # optional — enables live AI
GEMINI_MODEL=gemini-flash-latest
```

### 4. Set up the database

Apply the migrations in `web/supabase/migrations/` to your Supabase project (SQL Editor or `supabase db push`).

### 5. Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm test         # run the unit tests
```

---

## 🔒 Security

- **Authentication** via Supabase (email/password) with middleware session validation
- **Row-Level Security** — every tenant table is scoped by `organization_id`
- **Role-Based Access Control (RBAC)** — role-filtered navigation **and** server-side page guards (`requireRole`) for owner / admin / manager / accountant / staff
- **Protected routes** — unauthenticated users are redirected to login
- **Secrets** — service-role key is server-only; `.env*` is gitignored

---

## 📊 Main Modules

Dashboard · Products · Inventory · Warehouses · Purchasing (ERP) · Suppliers · Customers · Sales · POS · Finance · Reports & Analytics · AI Intelligence · Administration · Settings

---

## 📱 Responsive & Theming

- Works across desktop, laptop, tablet and mobile
- Light / dark mode aware throughout

---

## 🎯 Roadmap

- ✅ Phases 1–6: design, backend, live data, mutations, AI features
- ◑ Phase 8: hardening & deploy — RBAC enforced, Vitest tests, Vercel deploy
- ⬜ Phase 7: Flutter mobile app (offline-first)
- ⬜ Future: real file uploads (Supabase Storage), email-scheduled reports, multi-branch, multi-language

See [ROADMAP.md](ROADMAP.md) for details.

---

## 🤝 Contributing

Contributions, suggestions, and feedback are welcome. Feel free to fork the repository and submit a pull request.

---

## 📄 License

This project is licensed under the MIT License — see [LICENSE](LICENSE).

---

## 👨‍💻 Author

**Engineer Mire** — Software Engineer

- GitHub: [@apdiweli](https://github.com/apdiweli)
- LinkedIn: https://www.linkedin.com/in/abdiweli-ali-046090209/
- Email: alizakifarah@gmail.com

---

⭐ If you like this project, consider giving it a star.

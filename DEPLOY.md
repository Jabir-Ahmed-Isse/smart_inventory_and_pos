# Deploy — Smart Inventory & POS

Production deployment guide (Phase 8). The Next.js app lives in the **`web/`** subfolder.

---

## 0. Before you deploy — apply outstanding DB migrations

Run these against your Supabase project (SQL Editor, or `supabase db push`), **in order** if not already applied:

| Migration | Status |
|---|---|
| `web/supabase/migrations/20260725120000_init_schema.sql` | ✅ applied (core schema + RLS + auth) |
| `web/supabase/migrations/20260725120100_seed_function.sql` | ✅ applied (demo seed function) |
| `web/supabase/migrations/20260726120000_bundles_shipping_timesheets.sql` | ⬜ **apply this** — activates Bundles / Shipping / Timesheets |

After applying the third one, the Bundles/Shipping/Timesheets pages switch from their empty-state to live data.

---

## 1. Push to GitHub

The workspace isn't a git repo yet. From the project root:

```bash
git init
git add .
git commit -m "Smart Inventory & POS — web app"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env.local` is gitignored — your secrets won't be committed. `.env.example` documents what's needed.

---

## 2. Import into Vercel

1. **New Project** → import the GitHub repo.
2. **Root Directory** → set to **`web`** (the Next app is not at the repo root).
3. Framework preset: **Next.js** (auto-detected). Build command / output are default.

---

## 3. Environment variables (Vercel → Settings → Environment Variables)

Set for **Production** (and Preview if you want branch deploys). See `web/.env.example`.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Secret** — server-only; powers platform-admin company creation |
| `GEMINI_API_KEY` | optional | Live AI; without it the built-in analyst is used |
| `GEMINI_MODEL` | optional | Use `gemini-flash-latest` |
| `ANTHROPIC_API_KEY` | optional | Fallback LLM |

> 🔐 Rotate any key that was ever shared in chat/screenshots before going live.

---

## 4. Supabase auth config (so login works on the live domain)

Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://<your-app>.vercel.app`
- **Redirect URLs**: add `https://<your-app>.vercel.app/**`

Email confirmation is ON by default — either keep it (users confirm via email) or disable it under Authentication → Providers → Email.

---

## 5. Verify before shipping

Run from `web/`:

```bash
node node_modules/next/dist/bin/next build   # production build (must pass)
node node_modules/vitest/vitest.mjs run      # unit tests (must pass)
```

> Note: the parent folder name contains `&`, which breaks `npm run <script>` on Windows. The scripts already invoke tools via `node node_modules/...` so they work everywhere; on Vercel (root = `web`, no `&`) `npm run build` works normally too.

---

## 6. Post-deploy smoke test

1. Visit the Vercel URL → you should be redirected to `/login`.
2. Sign in (or register a workspace).
3. Confirm RBAC: create a **staff** user → they should only see Dashboard / POS / Customers / Timesheets / Settings, and `/admin` or `/finance` should redirect them to the dashboard.
4. Ring up a sale at POS → check it flows into Finance, Reports and the dashboard.

---

## Security posture (Phase 8)

- **RLS**: every tenant table is row-level-secured by `organization_id` via `is_org_member` / `is_org_admin`.
- **RBAC**: role-filtered sidebar + `requireRole()` server guards on Administration, Finance, Reports, Purchasing, catalog/inventory config and sensitive sales pages.
- **Auth**: middleware validates the session on every request and gates unauthenticated access.
- **Secrets**: service-role key is server-only; `.env*` is gitignored.

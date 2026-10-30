# Boostov Reseller Layer — Implementation Plan

Status: **APPROVED with answers below. Waiting for the owner to confirm the production backup before any DB change.**

---

## Decisions (2026-10-30)

| Topic | Decision |
|---|---|
| Domain | This app's production domain is **`https://boostov-connect.vercel.app`**. Every merchant link (`/m/<slug>`) and stats link is built from `NEXT_PUBLIC_APP_URL`, which is set to that in Vercel. `boostov.ma` is not touched. |
| Grow location | Repo `desminoxgraphic/cardify`, deployed at **`https://cardifyv1.vercel.app`**, same Supabase project. Public page `/s/<slug>`, merchant page `/m/<merchant_token>`. |
| Grow scope | Kit v1 = Connect only. Here we build the `grow_enabled` flag + Grow merchant creation (rows in `businesses`). For Grow merchants, `/m/<slug>` → **307** redirect to `https://cardifyv1.vercel.app/s/<slug>` (temporary, so the target can change later without breaking cards). Grow stats link = `https://cardifyv1.vercel.app/m/<merchant_token>`. Grow pages are not moved. Target host comes from env `GROW_APP_URL`. |
| Grow taps | The Grow app doesn't log views, so each `/m/<slug>` redirect inserts a row in a new `merchant_taps(slug, created_at)` table. |
| Slug registry sync | AFTER INSERT triggers on `connect_businesses` and `businesses` add the slug to `merchant_slugs` (`on conflict do nothing`), so merchants created by either app keep working at `/m/`. Current production slugs have no collisions (Grow: 4, Connect: 2). |
| Database | `.env.local` = production, no staging. The migration runs only after the owner confirms a full backup. |
| Test data | Seed 1 reseller + 2 merchants named `TEST_…` for screenshots, then delete them (auth user, rows, storage files) and confirm. |
| Suspension | The reseller loses access. Their merchants stay live publicly. |
| Limit contact | WhatsApp `+212789216699`. |
| Token leak | Drop the anon read policies on `connect_businesses` / `connect_links` (they exposed `dashboard_token`). |

Note: in the Grow app, `/m/` means "merchant token page". In this app, `/m/` means "merchant public link". They're on different domains, so they never clash.

---

## 0. What exists today (from reading the repo)

| Area | Current state |
|---|---|
| Admin auth | One shared `ADMIN_PASSWORD` env var + HMAC-signed cookie (`lib/session.ts`). No Supabase Auth, no users, no 2FA. |
| DB access | Every query uses the **service role** client (`lib/supabase/server.ts`), which bypasses RLS. RLS is enabled but only has "public" policies. |
| Connect | `connect_businesses`, `connect_links`, `connect_events`. Public page `/connect/[slug]`, secret stats page `/connect/dashboard/[token]` (token = 256-bit random, already good). |
| Grow | Only the **tables** live here (`businesses`, `rewards`, `generate_reward()`), plus `merchant_token`. **No Grow pages/routes exist in this repo.** |
| Taps | `connect_events` rows with `event_type = 'view'`. |
| Uploads | `/api/admin/assets` uploads the raw file (up to 10 MB) to bucket `business-assets`, no compression. |

**Security issue found:** the existing policy `"Public active connect business reads"` lets anyone holding the public anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, shipped to browsers) read every column of active Connect businesses, **including `dashboard_token`**. That means anyone can read every merchant's secret stats link. The app never uses the anon client, so the migration drops these anon read policies. Nothing in the app breaks.

---

## 1. Data model (one additive migration: `supabase/migrations/202610300001_add_reseller_layer.sql`)

All changes are additive. No existing column is renamed, retyped or dropped, and no existing row is rewritten (only backfills into new tables).

### New tables

```sql
-- Who is who. Only service role writes. Users can read their own row.
user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('super_admin','reseller')),
  created_at timestamptz default now()
)

resellers (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null,
  email           text not null unique,
  phone           text not null,            -- E.164, used for wa.me
  merchant_limit  int  not null default 10 check (merchant_limit >= 0),
  grow_enabled    boolean not null default false,
  status          text not null default 'pending'
                  check (status in ('pending','active','suspended')),
  password_set_at timestamptz,
  created_at, updated_at
)

-- Global slug registry behind /m/<slug>, so Connect and Grow slugs never collide.
merchant_slugs (
  slug                 text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  product              text not null check (product in ('connect','grow')),
  connect_business_id  uuid unique references connect_businesses(id) on delete cascade,
  grow_business_id     uuid unique references businesses(id) on delete cascade,
  check ((product='connect') = (connect_business_id is not null)
     and (product='grow')    = (grow_business_id    is not null))
)
```

### New nullable columns on existing tables

```sql
alter table connect_businesses add column reseller_id uuid references resellers(id) on delete restrict;
alter table businesses         add column reseller_id uuid references resellers(id) on delete restrict;
create index ... on (reseller_id);
```

`reseller_id IS NULL` means the merchant belongs to you (the super admin). Every existing row stays `NULL`, so nothing changes for it.

### SQL helper functions (`security definer`, `stable`, fixed `search_path`)

- `is_super_admin()`: true when `auth.uid()` has role `super_admin` **and** the JWT is `aal2` (MFA verified).
- `current_reseller_id()`: returns `auth.uid()` if it is a reseller with `status = 'active'`, otherwise `NULL`.
- `regenerate_stats_token(merchant_id uuid, product text)`: ownership-checked rotation of `dashboard_token` / `merchant_token`.

### Triggers (the database enforces the rules, not only the UI)

- `enforce_reseller_merchant_rules` runs BEFORE INSERT on `connect_businesses` and `businesses` when `reseller_id IS NOT NULL`. It:
  - locks the reseller row (`for update`) so two parallel creates can't both pass the limit check,
  - rejects the insert if the reseller isn't `active`,
  - rejects Grow inserts when `grow_enabled = false`,
  - counts merchants across **both** tables and raises `MERCHANT_LIMIT_REACHED` when `count >= merchant_limit`.
- Lowering a limit or suspending a reseller never deletes or disables merchants. Existing merchants keep working.
- `enforce_gallery_cap` on `connect_businesses`: reseller-owned merchants are capped at `jsonb_array_length(gallery_images) <= 6`. Your own merchants have no cap.
- `reseller_id` is immutable for resellers through column grants (see RLS).

---

## 2. RLS policies

Principle: **reseller requests run with a user-scoped Supabase client (anon key + the reseller's JWT), so Postgres RLS is the real gate.** The service role is used only for super-admin operations after a server-side role + MFA check, for Auth admin calls (`createUser`, `generateLink`, ban), and for the existing public pages.

| Table | anon | reseller (authenticated) | super_admin (aal2) |
|---|---|---|---|
| `user_roles` | none | select own row | select all |
| `resellers` | none | select own row only; **no update** (can't change limit, Grow flag or status) | all |
| `merchant_slugs` | none | select/insert for own merchants | all |
| `connect_businesses` | **none** (drop the public read policy) | select/insert/update where `reseller_id = current_reseller_id()`; insert `with check` same; **no delete** | all |
| `connect_links` | **none** | all via `exists(select 1 from connect_businesses b where b.id = business_id and b.reseller_id = current_reseller_id())` | all |
| `connect_events` | keep the existing insert policy | select via owned business | all |
| `businesses` (Grow) | none | same as `connect_businesses`, and only if `grow_enabled` | all |
| `rewards` | none | select via owned business | all |
| storage `business-assets` | public read (unchanged) | none; uploads go through an API route that checks ownership, then uploads with the service role | via API |

Column grants for `authenticated` on `connect_businesses` / `businesses`: `UPDATE` only on profile fields (name, logo, contact links, gallery, theme, review link, discount). **Not** on `reseller_id`, `dashboard_token`, `merchant_token`, `slug`, `id`. That keeps the public link stable and makes token rotation go through the RPC.

Why resellers can't delete: deleting would free a slot and get around the limit, and NFC cards already in the field would break. Resellers can **deactivate**. Only you can delete.

---

## 3. Auth & roles

**Library:** add `@supabase/ssr` (cookie-based sessions for Next 14 App Router).

### Super admin (you)
1. Run a one-time local script, `scripts/create-super-admin.mjs <email>`, with the service key. It creates your Auth user, inserts `user_roles(super_admin)` and prints a setup link.
2. You set your password, then go to `/admin/mfa` and enrol TOTP (QR code for Google Authenticator / 1Password). **I recommend enrolling 2 devices.**
3. From then on, `/admin/login` asks for email + password, then the 6-digit code. Every `/admin` page and `/api/admin/*` route requires `role = super_admin` **and** `aal = aal2`.
4. The old `ADMIN_PASSWORD` login is **removed** in the same release. Otherwise the 2FA would be optional. Remove `ADMIN_PASSWORD` from Vercel afterwards (keep `AUTH_SECRET` only if needed elsewhere).
5. Lost phone: `scripts/reset-admin-mfa.mjs` (local, service key) removes your factors.

### Reseller
- No sign-up route exists. Supabase "Allow new users to sign up" is turned **off** in the dashboard (an Auth setting, done by you).
- **Create:** `/api/admin/resellers` POST → `auth.admin.createUser({ email, email_confirm: true })` → insert `user_roles` + `resellers(status='pending')` → `auth.admin.generateLink({ type: 'recovery', email })`.
- **Link format:** I don't send Supabase's `action_link`. I build our own: `https://<app>/auth/confirm?token_hash=<hashed_token>&type=recovery`. That page shows a **"Continue"** button, and verification (`verifyOtp`) only runs on the POST. Reason: WhatsApp fetches link previews with a GET, which would burn a one-time token that's verified on GET.
- **Set password:** `/auth/set-password` → `updateUser({ password })` → `resellers.password_set_at = now()`, `status = 'active'` → redirect to `/dashboard`.
- **Admin panel buttons:** "Copy link" and "Send on WhatsApp" (`https://wa.me/<phone>?text=<urlencoded message + link>`). The link is shown once. Regenerating makes a new one.
- **Reset password:** the same flow with "Generate reset link". The reseller's current session is not affected until they use it.
- **Session:** Supabase refresh-token cookies (httpOnly), so they stay logged in on their device.
- **Suspend:** `status='suspended'` + `auth.admin.updateUserById(id, { ban_duration: '876000h' })` + sign out all sessions. RLS also returns nothing because `current_reseller_id()` is NULL. **Their merchants' public pages keep working** (default; tell me if you want suspension to take merchants offline).
- **Reactivate:** clear the ban and set `status='active'`.

### Server-side enforcement (not just hidden routes)
- `middleware.ts` refreshes the Supabase session and does coarse routing: `/admin/*` → requires super_admin + aal2, otherwise redirect; `/dashboard/*` → requires an active reseller.
- **Every** route handler and server component checks again with `requireSuperAdmin()` / `requireReseller()` (`lib/authz.ts`). A reseller calling `/api/admin/*` gets **403**. A reseller opening `/admin` gets a 404-style "not found", so they can't confirm the route exists.
- Unit tests cover these guards.

### Merchant
No account. Secret stats link = existing `/connect/dashboard/<dashboard_token>` (256-bit). "Regenerate" calls the RPC. The old link dies immediately.

---

## 4. Routes

### Public — unchanged
- `/connect/[slug]`, `/connect/dashboard/[token]`, the event API. Grow pages: wherever they live today (see open question 1).

### Public — new
- `/m/[slug]`: looks up `merchant_slugs`. For `connect` it renders the same `ConnectPublicCard` as `/connect/[slug]` (no redirect, so the URL on the NFC card is final). For `grow` it renders the Grow page, or does a 308 redirect to it (depends on question 1). Unknown slug → 404.
- Existing Connect merchants get backfilled into `merchant_slugs`, so `/m/<their-slug>` also works. Their old `/connect/<slug>` keeps working forever.

### Auth
- `/admin/login` (email + password + TOTP step), `/admin/mfa` (enrol)
- `/login` (reseller email + password), `/auth/confirm` (click-to-continue), `/auth/set-password`, `/logout`

### Super admin
- `/admin`: existing Connect profiles screen (kept) plus a new nav: **Resellers · All merchants · My merchants**
- `/admin/resellers`: list with name, merchants `n / limit`, Grow on/off, status, last login
- `/admin/resellers/new`: name, email, phone, limit (default 10), Grow toggle → shows the setup link with Copy / WhatsApp
- `/admin/resellers/[id]`: change limit, toggle Grow, suspend/reactivate, generate setup/reset link
- `/admin/resellers/[id]/space`: **read-only "View their space"**. It renders the exact same dashboard components as the reseller sees, under a fixed banner ("Viewing Karim's space — read only"), with every mutating control disabled. Data comes from your own session (RLS `is_super_admin()`), so there's no impersonation token and no way to write by accident.
- `/admin/merchants`: every merchant (yours + all resellers), with reseller name, product, status and tap counts (total / 7 days), filterable by reseller

### Reseller
- `/dashboard`: onboarding checklist (1 Create a merchant · 2 Program the card with NFC Tools · 3 Test the tap; step 3 ticks itself when the first `view` event arrives), usage meter `n / limit`, merchant list with tap counts
- `/dashboard/merchants/new`, `/dashboard/merchants/[id]`: form. Name, logo, product (Connect; Grow only if enabled), phone, WhatsApp, Instagram, website, email, Google Maps; for Grow, also Google review link + discount. Reuses the existing `ConnectContactFields` / `ImageUploader` components.
- `/dashboard/merchants/[id]/share`: public link + Copy + QR code (SVG, downloadable PNG) + short NFC Tools steps + the secret stats link with Copy / Regenerate
- At the limit: the "New merchant" button is replaced by a card: *"You've reached your limit of 10 merchants. Contact Boostov to increase it."* with a WhatsApp button to your number. The server/DB also returns a clean 409 if someone forces it.

### API (all re-check the role)
- `/api/admin/resellers` GET/POST · `/api/admin/resellers/[id]` PATCH · `/api/admin/resellers/[id]/link` POST `{type:'setup'|'reset'}` · `/api/admin/merchants` GET
- `/api/reseller/merchants` GET/POST · `/api/reseller/merchants/[id]` GET/PUT · `/api/reseller/merchants/[id]/stats-token` POST · `/api/reseller/assets` POST
- Existing `/api/admin/*` Connect routes switch from the cookie check to `requireSuperAdmin()`.

---

## 5. Storage (free tier)

- **Client-side compression** before upload (canvas, no new dependency). Logo: max 512×512, WebP q≈0.85. Gallery: max 1600px long side, WebP q≈0.8. Typical result is 60–250 KB instead of 2–6 MB.
- **Server limits for reseller uploads:** WebP/JPEG/PNG only, ≤ 1.5 MB after compression (otherwise 413), max **6 gallery images** per merchant (also enforced by trigger), 1 logo.
- When a logo or gallery image is replaced or removed, the old object is deleted from storage, so no orphaned files pile up.
- Path: `resellers/<reseller_id>/<merchant_id>/...`, so usage per reseller is easy to audit. Your merchants keep their existing `businesses/<id>/` paths.

---

## 6. Migration steps (run order)

1. **Back up**: Supabase Dashboard → Database → Backups (or `pg_dump`).
2. **Run** `202610300001_add_reseller_layer.sql` in the SQL editor. It's additive and idempotent (`if not exists`, `drop policy if exists`). **The old app keeps working against the new schema**, because it uses the service role and doesn't read the new columns. So the DB can go first and the code second.
3. Run `supabase/verify-reseller-rls.sql`. It simulates anon / reseller A / reseller B / super admin with `set local role` + `request.jwt.claims` inside a rolled-back transaction, and asserts: B can't see A's merchants, a reseller can't update their limit, the limit trigger fires at 10, the Grow insert is blocked when disabled, and anon can't read `dashboard_token`.
4. In Supabase Auth settings: disable sign-ups, enable MFA (TOTP), set the email OTP expiry (setup links, up to 24 h).
5. Run `scripts/create-super-admin.mjs` → set password → enrol TOTP.
6. Deploy the app. Then smoke-test 3 existing `/connect/<slug>` links and 1 `/connect/dashboard/<token>`.
7. Remove `ADMIN_PASSWORD` from Vercel.

**Rollback:** `202610300001_down.sql` drops the new policies, triggers, functions and tables, plus the two `reseller_id` columns (only if no reseller merchant exists). It does **not** restore the anon read policies (that was the leak). Then redeploy the previous commit.

`supabase/schema.sql` gets the same changes so fresh setups match, and `tests/schema-contract.test.mts` gets new assertions.

---

## 7. How existing data stays compatible

- Existing Connect and Grow rows: `reseller_id = NULL` → owned by you, untouched. Slugs, `dashboard_token`s and `merchant_token`s are unchanged.
- `/connect/<slug>` and `/connect/dashboard/<token>` routes and code paths are unchanged. NFC cards already in the field keep working.
- The event recording API is unchanged.
- The slug backfill into `merchant_slugs` only *adds* registry rows. If a Grow slug collides with a Connect slug, the Grow one is skipped and listed in the migration output (it only affects the new `/m/` URL for that merchant, nothing existing).
- The only behavioural change for existing users is the admin login (password → email + password + TOTP).

---

## 8. Tests & verification

- `node:test` unit tests: authz guards (reseller → 403 on admin routes, suspended → 401, aal1 super admin → 403), limit messaging, wa.me URL builder, `/auth/confirm` doesn't verify on GET, slug registry resolution, image cap.
- SQL RLS verification script (above).
- `npm run typecheck`, `npm test` and `npm run build` must pass.
- Screenshots at 390px and 1280px: `/admin/resellers`, `/admin/resellers/[id]/space`, `/dashboard`, `/dashboard/merchants/[id]/share`, `/connect/dashboard/<token>`. Saved in `screenshots/reseller/`.

New dependencies: `@supabase/ssr`, `qrcode` (+ `@types/qrcode`). Nothing else.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Grow code isn't in this repo | Open question 1. I can build all the Grow *data/permission* support here regardless. |
| WhatsApp link preview burns a one-time setup link | Verify on POST via the "Continue" button, never on GET |
| Setup links expire (Supabase OTP expiry, max 24 h) | "Generate new link" button; the panel shows when the link was generated |
| You lose your TOTP device | Enrol 2 factors + local reset script with the service key |
| Admin auth rewrite touches every `/api/admin` route | Central `requireSuperAdmin()` + tests per route + smoke test before removing `ADMIN_PASSWORD` |
| Limit race (two creates at once) | Row lock in the trigger |
| Reseller deletes to free slots | No delete for resellers, only deactivate |
| Anon key previously exposed `dashboard_token`s | Policies dropped in this migration. Consider regenerating tokens for sensitive merchants (optional, breaks their current stats links) |
| Free tier: 1 GB storage, egress caps | Compression + per-merchant caps + deleting replaced files |
| Screenshots need real data | Needs a DB to seed a test reseller + merchants (open question 3) |

---

## 10. Open questions — answered (see Decisions at the top)

1. **Where does Grow live?** This repo only has the Grow tables (`businesses`, `rewards`), with no Grow pages. Is Grow a separate repo/deployment on the same Supabase project? If so, should I (a) build Grow merchant creation + permissions here and point `/m/<slug>` to the existing Grow URL, or (b) also bring the Grow pages into this app?
2. **Domain:** does `boostov.ma` point to this Vercel app? `/m/<slug>` has to be served by whichever app owns `boostov.ma`.
3. **Which Supabase project** do I build and take screenshots against? Is `.env.local` production? If yes, is it OK to seed one test reseller ("Demo Reseller") + 2 test merchants after the migration, and delete them afterwards? A separate staging project is safer.
4. **Suspension:** OK that a suspended reseller's merchants stay live publicly (only the reseller loses access)?
5. **Your WhatsApp number** for the "limit reached → contact Boostov" button.

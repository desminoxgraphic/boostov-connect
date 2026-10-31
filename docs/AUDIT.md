# Boostov Connect — Full Audit

Date: 2026-10-31 · App: `boostov-connect.vercel.app` (Next.js 14 on Vercel + Supabase free tier)
Status: **audit only, nothing changed.** Waiting for the owner's OK.

Data today: 2 Connect cards (qualityifni, alilo), 4 Grow businesses (separate Grow app), 1 real reseller, 254 events, 36 stored images (30 MB), database 12 MB.

---

## 1. What works

| Area | Status |
|---|---|
| Public cards `/connect/<slug>` and `/m/<slug>` | Work, all existing links intact |
| Grow redirect `/m/<slug>` → Grow app | Works (307, temporary) |
| Roles enforced server-side | Middleware + every page/API re-checks; resellers get 404/403 on admin |
| Database security (RLS) | 20 automated checks pass; resellers only see their own rows; limit, photo cap and suspension enforced by the database itself |
| Secret stats links | Leak closed (no longer readable by the public key or the profile API) |
| Reseller flows | Create card with the full admin form, link + QR, stats link, limit message |
| Backups | One verified backup (2026-10-30) in `C:\Users\HP\backups` |
| Tests / build | 117 tests, build passes |

## 2. What is broken or wrong (user-visible)

1. **Card images are slow and sometimes show an empty white circle.** This is the "lost images" report. Three causes stack up:
   - **The card is built in the visitor's browser.** The page HTML contains no image addresses. The phone first downloads the JavaScript, then asks the API for the card, and only then starts loading images (3 round trips). On a slow mobile connection you see the white logo circle and an empty banner for several seconds.
   - **Images are sent at full original size.** Image resizing is switched off (`images.unoptimized: true`). The qualityifni banner is a **2.2 MB PNG** shown 440 px wide; 14 of the 36 files are over 1 MB. A good size would be about 60–150 KB.
   - **No caching.** Supabase answers every image with `Cache-Control: private, no-cache` and the CDN does not cache them (`CF-Cache-Status: DYNAMIC`). Every visitor downloads every image again, every time.
2. **Login is clumsy.** Password + one-time links sent on WhatsApp. They expire after 1 hour, and a double press used to burn them (fixed). You asked for one login page with Google or an email code.
3. **Admin panel is spread over several tabs** (My profiles / Resellers / All merchants / Security). You asked for one main screen with a table and actions on each row.
4. **Branding:** the logo is an old 69 KB PNG used at 14 px in the footer; there is no `public/brand/` folder and no proper favicon set.

## 3. What is risky

| Risk | Severity | Detail |
|---|---|---|
| **Next.js 14.2.15 has known security holes** | High | Including CVE-2025-29927 (bypassing the middleware with a crafted header). Our pages and APIs check access again on the server, so the admin is not exposed today, but the framework must be upgraded (14.2.x patch, free, low risk). |
| Database password was pasted in chat | High | Reset it in Supabase. The app doesn't use it. |
| Public event endpoint has no rate limit | Medium | Anyone can inflate a card's view/tap counts with a script. |
| Supabase built-in email | Medium | About 2 emails per hour on the free plan. Email-code login needs our own free SMTP sender. |
| Orphan images | Low | Images uploaded for a card that was never saved stay in storage (free tier is 1 GB; we're at 30 MB). |
| `ADMIN_PASSWORD` may still be set in Vercel | Low | Unused; delete it. |
| Supabase free project pauses after 7 days with zero traffic | Low | Card visits keep it awake; just be aware. |

## 4. What is slow

| Item | Now | Target |
|---|---|---|
| Card: time until the logo/banner show (4G phone) | ~3–6 s (JS → API → 2.2 MB image) | < 1.5 s |
| Banner weight | 2.2 MB PNG | ~100 KB WebP/AVIF |
| Repeat visit | Downloads everything again | From cache, instant |
| Layout | Logo circle and banner pop in | Blurred placeholder, no jump |

## 5. Prioritized plan

**Phase 0 – Safety (½ day)**
- Fresh verified backup before any database change.
- Upgrade Next.js to the latest 14.2 patch (security). Rebuild, re-run all tests.

**Phase 1 – Fast, reliable cards (top priority, 1 day)**
- Render the card on the server: the HTML arrives with the logo/banner already in it, and the logo + banner are preloaded.
- Turn on Vercel image optimization. Phones get a correctly sized WebP/AVIF from Vercel's CDN, cached for a year. **No change to your stored images or card data.** Free on Hobby within the monthly allowance (enough for hundreds of cards).
- Blurred colour placeholder for logo/banner/gallery while loading, fixed sizes (no layout jump).
- New uploads: resized and converted to WebP on upload (admin and resellers).
- Rate-limit the event endpoint (simple, free).
- Re-check every existing card: same links, logo, banner, gallery, Boostov footer.

**Phase 2 – One login for everyone (1–1.5 days)**
- Single `/login`: **Continue with Google** or **email + 6-digit code**. No passwords, no WhatsApp links.
- Invite-only: only emails you added in the admin can enter. Anyone else gets a polite "no access" page (their attempt creates nothing).
- After login: super admin → admin panel, reseller → their dashboard. Same server checks + RLS as today. Optional 2FA for you stays available.
- Email codes sent through **Resend** (free: 3,000 emails/month, 100/day), connected to Supabase.
- The old `/admin/login`, setup links and set-password screens are retired (redirect to `/login`).

**Phase 3 – Admin panel, one screen (1 day)**
- Main screen = resellers table: name, email, cards / limit, total taps, last activity, status.
- Row actions: change limit, suspend/reactivate, view their space (read-only).
- "Add reseller" (name, email, phone, limit) → then you tell them "go to the login page".
- Your own client cards and the all-cards overview become secondary sections on the same screen.

**Phase 4 – Reseller dashboard polish (½ day)**
- Cards grid with taps, create card (same full form), link + QR, limit meter. Mostly done; aligned to the new design.

**Phase 5 – Branding (½ day)**
- Official logo from `public/brand/` everywhere: login, dashboards, card footer, favicon/app icons. Used as-is, never redrawn.

**Phase 6 – Full test + deploy (½ day)**
- TEST_ data: admin, reseller and visitor at 390 px and 1280 px, then delete it all and confirm. Screenshots, final report.

Everything above is on free plans. Nothing needs a paid plan, with one cosmetic exception noted in the questions below.

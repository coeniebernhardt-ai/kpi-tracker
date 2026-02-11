# Production readiness checklist

Security hardening applied. Verify before promoting to production.

---

## Section 1 – Debug & dev surfaces

- [x] Debug overlay: visible only when `NEXT_PUBLIC_VERCEL_ENV !== 'production'` (admin page).
- [x] `next.config.ts`: `compiler.removeConsole` in production (keeps `error`/`warn` for monitoring).
- [x] API 500 responses: use `getSafeErrorMessage(err)` – generic "Internal server error" in production; no stack traces.

---

## Section 2 – Environment variable safety

- [x] `SUPABASE_SERVICE_ROLE_KEY`: used only in server code under `app/api/` and `app/lib/supabase-server.ts`; never in client bundles or `NEXT_PUBLIC_*`.
- [x] `NEXT_PUBLIC_*`: only URL and anon key (no secrets). Confirm no secret keys in any `NEXT_PUBLIC_` var.
- [x] No secret keys passed to `console.log`/`console.error` in production (safe logging via `logSafeError`).

---

## Section 3 – Authentication

- [x] All API routes (except `/api/health`) require a valid session or Bearer token; handlers return 401/403.
- [x] proxy.ts: applies security headers and rate limiting; auth is enforced in each API route (session/cookie + optional Bearer).
- [x] Admin routes: check `profiles.is_admin` and return 403 when not admin.

---

## Section 4 – RLS verification (Supabase)

Confirm in Supabase Dashboard → Authentication → Policies:

- [ ] **notifications**: RLS enabled; SELECT policy includes `deleted_at IS NULL` for members; admin via service role.
- [ ] **notification_reactions**: RLS enabled; access scoped to notification recipient / admin.
- [ ] **notification_attachments**: RLS enabled; access via notification ownership / admin.
- [ ] **tickets**: RLS enabled; members see own or assigned; admin sees all.

Do not rely on frontend filtering; all member-visible data is filtered in API queries and/or RLS.

---

## Section 5 – API rate limiting

- [x] proxy.ts (Next.js 16): 100 requests per minute per IP (by `x-forwarded-for` / `x-real-ip`); 429 when exceeded.
- [x] Applies to all routes matched by proxy (including `/api/*`; `/api/health` skipped).
- Note: in-memory store; for multi-instance scaling consider Vercel KV or similar.

---

## Section 6 – Secure file delivery

- [x] Attachments served only via `/api/notifications/attachment/[attachmentId]` (no direct storage URL).
- [x] Access checked: notification recipient or admin; deleted notification → 404.
- [x] `Content-Disposition: attachment` so files are downloaded, not displayed inline.
- [x] Private bucket; streaming via service role after validation.

---

## Section 7 – Security headers

- [x] **next.config.ts**: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Content-Security-Policy.
- [x] **proxy.ts**: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP per request.

---

## Section 8 – Input validation

- [x] Reaction types: strict enum `LIKE | MUSCLE | LAUGH | COPY_THAT` in `/api/notifications/[id]/react`.
- [x] Supabase client uses parameterized queries (no raw SQL concatenation).
- [ ] Optional: add schema validation (e.g. Zod) for critical POST bodies (send notification, delete, etc.).

---

## Section 9 – Enumeration

- [x] Notification/attachment/reaction IDs are UUIDs (Supabase default).
- [x] 404 for not-found and deleted resources; no distinction that leaks existence.

---

## Section 10 – CORS / origin

- [x] No wildcard CORS in production; app is same-origin (Next.js API and frontend on same domain).
- [ ] If you add a separate frontend domain, restrict `Access-Control-Allow-Origin` to that domain in middleware or next.config.

---

## Section 11 – Logging

- [x] Production: `logSafeError(context, err)` – no sensitive data or stack in logs.
- [ ] Optional: log failed admin actions (e.g. delete notification, delete ticket) with actor id and resource id only.
- [ ] Optional: log repeated 401/403 by IP for monitoring brute force.

---

## Pre–production steps

1. Run `FIX_RLS_HIDE_DELETED_NOTIFICATIONS.sql` in Supabase if not already applied.
2. Set in Vercel (Production): `NEXT_PUBLIC_VERCEL_ENV=production` (Vercel sets this automatically for production).
3. Ensure no `.env` or secrets in repo; use Vercel Environment Variables for production.
4. Deploy to **Preview** first; run through login, notifications, attachments, admin flows.
5. Promote to **Production** after verification.

---

## Deploy to preview

```bash
git add -A
git commit -m "chore: security hardening for production"
git push origin preview-deployment
```

After verification on Preview, merge to main (or your production branch) and deploy.

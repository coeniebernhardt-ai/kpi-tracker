# Notification delete fix – data + query layer

## Summary

**Approach: SOFT DELETE.** Admin delete sets `deleted_at` on notification rows. All member-facing queries and APIs exclude or reject rows where `deleted_at IS NOT NULL`. No schema change; existing data is preserved.

---

## 1. Data layer (admin delete)

**File:** `app/api/admin/notifications/delete/route.ts`

- **Broadcast:** `UPDATE notifications SET deleted_at = NOW() WHERE broadcast_group_id = {id} AND deleted_at IS NULL`  
  → All per-recipient notification rows for that broadcast are soft-deleted.
- **Single:** `UPDATE notifications SET deleted_at = NOW() WHERE id = {notificationId} AND deleted_at IS NULL`.
- Only users with `profiles.is_admin = true` can call this API (401/403 otherwise).
- Reactions and attachments are not modified; access is blocked because the notification is deleted.

---

## 2. Member query layer (deleted never visible)

### 2.1 Notification list (dropdown + polling)

**Source:** `app/lib/supabase.ts` → `getNotificationsByUserId(userId)`

- Query: `user_id = userId AND deleted_at IS NULL`, ordered by `created_at` desc.
- Client-side safeguard: `list.filter((n) => !n.deleted_at)`.
- Used for: initial load and 30s polling on the dashboard. No separate “polling endpoint”; both use this function.

### 2.2 Database RLS (mandatory)

**File:** `FIX_RLS_HIDE_DELETED_NOTIFICATIONS.sql`

- Run once in **Supabase SQL Editor** (Dashboard → SQL Editor → New query).
- Recreates SELECT policy on `public.notifications`:  
  `USING (auth.uid() = user_id AND deleted_at IS NULL)`.
- Ensures the database never returns soft-deleted rows to members, even if the client query were wrong.

### 2.3 Member-facing APIs (all filter deleted → 404)

| Endpoint | Behavior |
|----------|----------|
| `GET /api/notifications/[id]` | Loads row; if `deleted_at` set → **404**. |
| `PATCH /api/notifications/[id]` | Loads `user_id, deleted_at`; if `deleted_at` set → **404**. |
| `GET /api/notifications/[id]/image` | Loads `user_id, image_url, deleted_at`; if `deleted_at` set → **404**. |
| `GET /api/notifications/[id]/reactions` | Auth helper checks `deleted_at`; if set → **404**. |
| `POST/DELETE /api/notifications/[id]/react` | Same auth helper; if deleted → **404**. |
| `GET /api/notifications/attachment/[attachmentId]` | Resolves notification; if `deleted_at` set → **404**. |

Direct access to a deleted notification (by ID) always returns **404** (or 403 where applicable).

---

## 3. Cache / polling

- No server-side notification list cache; list is always from `getNotificationsByUserId()` (Supabase client with RLS).
- Polling uses the same function every 30s, so after admin deletes, the next poll returns the updated list without the deleted item.
- Dashboard already removes a notification from local state when the detail request returns 404.

---

## 4. Verification test

1. Admin creates a broadcast notification.
2. Member sees it in the notification list.
3. Admin deletes the notification (soft delete).
4. Member:
   - Refreshes page → notification is gone (list uses `deleted_at IS NULL` + RLS).
   - Waits for next polling cycle → notification disappears from list.
   - Opens direct link to that notification ID → **404**.

---

## 5. Failsafe

- Delete by `broadcast_group_id` affects every row with that id (and `deleted_at` null); delete by `notificationId` affects that row only.
- If `broadcast_group_id` is null, only single-notification delete by id is used; no schema change.
- All member paths either filter `deleted_at IS NULL` in the query or check `deleted_at` after load and return 404.

---

## 6. Security

- Only admin can delete (enforced in delete API).
- Members cannot delete.
- Members cannot see deleted notifications (RLS + query + API checks).
- Deleted notifications return **404** (or 403 where appropriate) on direct access.

---

## 7. Deployment

- **Preview only:** Deploy from branch `preview-deployment` (e.g. push to `origin preview-deployment`). Production is not touched.
- **Supabase:** Run `FIX_RLS_HIDE_DELETED_NOTIFICATIONS.sql` once in the SQL Editor so RLS enforces `deleted_at IS NULL` for member SELECTs.

# Notification Attachments – Private Bucket (Required)

The multi-attachment feature stores files in Supabase Storage and serves them **only** via the secure endpoint `GET /api/notifications/attachment/[attachmentId]`. Raw storage URLs are never exposed.

## Create the bucket (one-time)

**Option A – SQL (recommended)**  
In **Supabase Dashboard** → **SQL Editor**, run the script **`CREATE_NOTIFICATION_ATTACHMENTS_BUCKET.sql`** (copy its contents into a new query and run it).  
Do **not** run this Markdown file (`.md`) in the SQL Editor – it is documentation, not SQL.

**Option B – Dashboard**  
1. In **Supabase Dashboard** → **Storage**, create a new bucket.  
2. **Name:** `notification-attachments`  
3. **Public:** **Off** (private).  
4. Save.

No RLS or extra policies are required for the bucket if you only access it from the API using the service role key.

## Behaviour

- **Upload:** Admin sends notifications with files → API uploads to `notification-attachments` and stores only the **path** in `notification_attachments.file_url`.
- **Download:** User or admin requests `/api/notifications/attachment/[id]` → API checks auth and notification ownership, then streams the file from storage. No redirect to a public URL.

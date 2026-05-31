# File Storage

The application uses **Supabase Storage** as its object store. MongoDB holds only a file path or storage key reference — the actual binary data lives in Supabase.

---

## What Is Stored

| Asset                    | Who                     | Bucket path pattern                    |
| ------------------------ | ----------------------- | -------------------------------------- |
| User profile image       | One per user            | `profile-images/<userId>/<filename>`   |
| Company logo             | One per company         | `company-logos/<companyId>/<filename>` |
| User document attachment | One per document record | `user-documents/<userId>/<filename>`   |

---

## Upload Flow (Profile Image as Example)

1. Client sends `POST /api/users/:id/profile-image` as `multipart/form-data` with field `image`.
2. `upload.middleware.ts` (Multer) validates the file: images only, max 5 MB.
3. `storage.service.ts` uploads the buffer to Supabase Storage under the designated path.
4. The Supabase storage path is saved to the user's MongoDB document (`profileImagePath`).
5. The old image, if any, is deleted from storage before the new one is written.

---

## Signed URL Flow

Files in Supabase Storage are **not** publicly accessible. Access is delivered through short-lived signed URLs:

1. Client calls `GET /api/users/:id/profile-image-url`.
2. Server calls `supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)`.
3. The signed URL is returned to the client and used directly in `<img src="...">`.

Signed URLs expire; the client must request a fresh one when it becomes stale (typically on page load or component init).

---

## Delete Flow

1. Client calls `DELETE /api/users/:id/profile-image`.
2. Server calls `supabase.storage.from(bucket).remove([path])`.
3. The `profileImagePath` field is cleared from the MongoDB user document.

---

## User Documents

User document attachments follow the same pattern with these differences:

- Accepted file types: PDF and images, max 10 MB.
- Endpoint: `POST /api/user-documents` (new record) or `PUT /api/user-documents/:id` (update).
- Signed URL: `GET /api/user-documents/:id/attachment-url`.
- Remove attachment only (keep record): `DELETE /api/user-documents/:id/attachment`.
- Remove record + attachment: `DELETE /api/user-documents/:id`.

---

## Configuration

All storage configuration comes from environment variables — no values are hard-coded:

| Variable                    | Purpose                                           |
| --------------------------- | ------------------------------------------------- |
| `SUPABASE_URL`              | Your Supabase project HTTPS URL                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for server-side operations       |
| `SUPABASE_STORAGE_BUCKET`   | Bucket name (must exist in your Supabase project) |

> `SUPABASE_URL` must be the project HTTP URL (`https://<ref>.supabase.co`). Using a Postgres connection string here will cause upload failures.

---

## Related Files

| File                                                 | Purpose                                          |
| ---------------------------------------------------- | ------------------------------------------------ |
| `server/src/services/storage.service.ts`             | All Supabase Storage operations                  |
| `server/src/middleware/upload.middleware.ts`         | Multer configuration (file type/size validation) |
| `server/src/controllers/user.controller.ts`          | Profile image endpoints                          |
| `server/src/controllers/user-document.controller.ts` | Document attachment endpoints                    |
| `server/src/controllers/company.controller.ts`       | Company logo signed URL                          |

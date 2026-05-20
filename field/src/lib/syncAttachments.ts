// field/src/lib/syncAttachments.ts
// After a feature is synced to the server, upload its pending media attachments.

import { getAuth, getAttachmentBlob, deleteAttachmentBlob } from "./db";
import type { PendingAttachment } from "../components/fields/MediaField";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

/**
 * Upload all pending attachments for a feature that just synced.
 * Silently skips items that fail (they remain in IDB for retry).
 */
export async function syncAttachmentsForFeature(
  featureId: string,
  attachments: PendingAttachment[]
): Promise<void> {
  const { token } = await getAuth();
  if (!token) return;

  const pending = attachments.filter((a) => !a.synced);
  if (pending.length === 0) return;

  for (const att of pending) {
    try {
      const blob = await getAttachmentBlob(att.blobKey);
      if (!blob) continue;

      const fd = new FormData();
      fd.append("file", blob, att.fileName);
      fd.append("field_key", att.fieldKey);

      const res = await fetch(`${API_URL}/features/${featureId}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.ok) {
        // Clean up local blob
        await deleteAttachmentBlob(att.blobKey);
        att.synced = true;
      }
    } catch {
      // Network error — will retry next sync cycle
    }
  }
}

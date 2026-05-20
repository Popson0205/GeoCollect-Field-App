// field/src/components/fields/MediaField.tsx
// Handles photo, audio, and video capture in the Field app.
// Works offline — stores blobs in IndexedDB, uploads to API on sync.

import { useRef, useState } from "react";
import { getDB } from "../../lib/db";

export interface PendingAttachment {
  id: string;           // local UUID
  fieldKey: string;
  mimeType: string;
  fileName: string;
  blobKey: string;      // IDB key in "attachments" store
  dataUrl: string;      // preview URL (revokeObjectURL on unmount)
  synced: boolean;
}

interface MediaFieldProps {
  fieldKey: string;
  label: string;
  mediaType: "photo" | "audio" | "video";
  multiple?: boolean;
  required?: boolean;
  value: PendingAttachment[];
  onChange: (attachments: PendingAttachment[]) => void;
}

const ACCEPT: Record<string, string> = {
  photo: "image/*",
  audio: "audio/*",
  video: "video/*",
};

const CAPTURE: Record<string, string> = {
  photo: "environment",   // rear camera
  audio: "microphone",
  video: "camcorder",
};

/** Store a blob in IndexedDB "attachments" store, return its key. */
async function storeBlobOffline(key: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put("attachments", { key, blob, createdAt: Date.now() });
}

export default function MediaField({
  fieldKey, label, mediaType, multiple = false,
  required = false, value, onChange,
}: MediaFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const newAttachments: PendingAttachment[] = [...value];

    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        setError(`${file.name} exceeds 50 MB limit`);
        continue;
      }

      const id = crypto.randomUUID();
      const blobKey = `attach_${id}`;
      const dataUrl = URL.createObjectURL(file);

      try {
        await storeBlobOffline(blobKey, file);
      } catch {
        // IDB storage quota exceeded — still add to UI, will retry on sync
        console.warn("IDB storage failed for", file.name);
      }

      newAttachments.push({
        id,
        fieldKey,
        mimeType: file.type,
        fileName: file.name,
        blobKey,
        dataUrl,
        synced: false,
      });

      if (!multiple) break; // single-file mode
    }

    onChange(newAttachments);
  };

  const remove = (id: string) => {
    const updated = value.filter((a) => a.id !== id);
    onChange(updated);
  };

  return (
    <div className="media-field" style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
      </label>

      {/* Capture button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 16px", borderRadius: 8,
          background: "#0ea5e9", color: "#fff",
          border: "none", cursor: "pointer", fontSize: 14,
        }}
      >
        {mediaType === "photo" && "📷"}
        {mediaType === "audio" && "🎙️"}
        {mediaType === "video" && "🎬"}
        {multiple ? `Add ${mediaType}` : `Capture ${mediaType}`}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[mediaType]}
        capture={CAPTURE[mediaType] as any}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{error}</p>
      )}

      {/* Preview grid */}
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {value.map((att) => (
            <div
              key={att.id}
              style={{ position: "relative", borderRadius: 8, overflow: "hidden",
                       border: "1px solid #e2e8f0" }}
            >
              {att.mimeType.startsWith("image/") && (
                <img
                  src={att.dataUrl}
                  alt={att.fileName}
                  style={{ width: 80, height: 80, objectFit: "cover", display: "block" }}
                />
              )}
              {att.mimeType.startsWith("audio/") && (
                <div style={{ width: 120, padding: 8, fontSize: 12, background: "#f8fafc" }}>
                  🎵 {att.fileName}
                  <audio controls src={att.dataUrl} style={{ width: "100%", marginTop: 4 }} />
                </div>
              )}
              {att.mimeType.startsWith("video/") && (
                <video
                  src={att.dataUrl}
                  style={{ width: 120, height: 80, objectFit: "cover", display: "block" }}
                  muted
                />
              )}
              {/* Sync badge */}
              <span style={{
                position: "absolute", top: 4, right: 22,
                background: att.synced ? "#22c55e" : "#f59e0b",
                borderRadius: 4, padding: "1px 4px", fontSize: 10, color: "#fff",
              }}>
                {att.synced ? "✓" : "⏳"}
              </span>
              {/* Remove */}
              <button
                type="button"
                onClick={() => remove(att.id)}
                style={{
                  position: "absolute", top: 2, right: 2,
                  background: "rgba(0,0,0,0.55)", color: "#fff",
                  border: "none", borderRadius: "50%",
                  width: 18, height: 18, cursor: "pointer",
                  fontSize: 10, lineHeight: "18px", textAlign: "center",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

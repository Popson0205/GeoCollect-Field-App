// studio/src/components/PublishPanel.tsx
// Publish panel for the Studio form builder.
//
// Usage (inside your form builder page):
//   <PublishPanel
//     formId={form.id}
//     isPublished={form.is_published}
//     shareToken={form.share_token}
//     visibility={form.visibility}
//     onPublished={(updatedForm) => setForm(updatedForm)}
//   />

"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Globe, Lock, Building2, Copy, Check, ExternalLink } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Visibility = "private" | "organization" | "public";

interface FormLike {
  id: string;
  is_published: boolean;
  share_token: string | null;
  visibility: Visibility;
}

interface Props {
  formId: string;
  isPublished: boolean;
  shareToken: string | null;
  visibility: Visibility;
  onPublished: (updated: FormLike) => void;
}

// ─── Visibility config ────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone with the link can submit — no login required.",
    icon: Globe,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
  },
  {
    value: "organization",
    label: "Organization",
    description: "Only members of this project can submit. Login required.",
    icon: Building2,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-300",
  },
  {
    value: "private",
    label: "Private",
    description: "No public submissions. Share link is disabled.",
    icon: Lock,
    color: "text-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-300",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublishPanel({
  formId,
  isPublished,
  shareToken,
  visibility: initialVisibility,
  onPublished,
}: Props) {
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility || "private");
  const [publishing, setPublishing] = useState(false);
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState(false);

  const fieldUrl = process.env.NEXT_PUBLIC_FIELD_URL || "https://geocollect-field.onrender.com";

  const shareUrl = shareToken && visibility !== "private"
    ? `${fieldUrl}/s/${shareToken}`
    : null;

  // ── Publish / re-publish ────────────────────────────────────────────────────
  const handlePublish = async () => {
    setPublishing(true);
    setError("");
    try {
      const updated = await api.post<FormLike>(`/forms/${formId}/publish`, { visibility });
      onPublished(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  // ── Copy link ───────────────────────────────────────────────────────────────
  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">

      {/* Visibility selector */}
      <div>
        <p className="label mb-2">Sharing Visibility</p>
        <div className="flex flex-col gap-2">
          {VISIBILITY_OPTIONS.map((opt) => {
            const Icon     = opt.icon;
            const selected = visibility === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  selected
                    ? `${opt.border} ${opt.bg}`
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${selected ? opt.color : "text-slate-400"}`}>
                  <Icon size={16} />
                </span>
                <div>
                  <p className={`text-sm font-semibold ${selected ? opt.color : "text-slate-700"}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                </div>
                {selected && (
                  <span className={`ml-auto shrink-0 text-xs font-bold ${opt.color}`}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Publish button */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <button
        className="btn btn-primary w-full justify-center"
        onClick={handlePublish}
        disabled={publishing}
      >
        {publishing
          ? "Publishing…"
          : isPublished
            ? "Re-publish with new settings"
            : "Publish Form"}
      </button>

      {/* Share link — only shown after publish and when not private */}
      {isPublished && shareUrl && (
        <div className="flex flex-col gap-2">
          <p className="label">Share Link</p>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-600 flex-1 truncate font-mono">{shareUrl}</span>
            <button
              className="btn btn-secondary btn-sm shrink-0 gap-1"
              onClick={copyLink}
              title="Copy link"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm shrink-0"
              title="Open in new tab"
            >
              <ExternalLink size={13} />
            </a>
          </div>
          <p className="text-xs text-slate-400">
            {visibility === "public"
              ? "Anyone with this link can submit data — no login needed."
              : "Only logged-in organization members can submit via this link."}
          </p>
        </div>
      )}

      {/* Private — explain link is disabled */}
      {isPublished && visibility === "private" && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
          <Lock size={14} className="text-slate-400 shrink-0" />
          <p className="text-xs text-slate-500">
            Share link is disabled for private forms. Change visibility to Organization or Public to enable it.
          </p>
        </div>
      )}

      {/* Not yet published */}
      {!isPublished && (
        <p className="text-xs text-slate-400 text-center">
          Publish the form to generate a shareable link.
        </p>
      )}
    </div>
  );
}

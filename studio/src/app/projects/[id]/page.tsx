// studio/src/app/projects/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  FileText,
  ChevronLeft,
  Pencil,
  Send,
  MapPin,
  MoreHorizontal,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Project, FormSchema } from "@/types";

function FormCard({
  form,
  projectId,
  onPublish,
}: {
  form: FormSchema;
  projectId: string;
  onPublish: () => void;
}) {
  const [publishing, setPublishing] = useState(false);

  const publish = async (e: React.MouseEvent) => {
    e.preventDefault();
    setPublishing(true);
    try {
      await api.post(`/forms/${form.id}/publish`, {});
      onPublish();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="card p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-slate-400 shrink-0" />
            <h3 className="font-semibold text-slate-800 truncate">
              {form.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>v{form.version}</span>
            <span>·</span>
            <span>{form.geometry_type}</span>
            <span>·</span>
            <span>{form.schema?.fields?.length || 0} fields</span>
            {form.geofence && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5 text-primary">
                  <MapPin size={10} />
                  Geofenced
                </span>
              </>
            )}
          </div>
        </div>
        <span
          className={`badge shrink-0 ${
            form.is_published ? "badge-green" : "badge-orange"
          }`}
        >
          {form.is_published ? "Published" : "Draft"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <Link
          href={`/projects/${projectId}/forms/${form.id}`}
          className="btn-secondary btn-sm flex-1 justify-center"
        >
          <Pencil size={12} />
          Edit
        </Link>
        {!form.is_published && (
          <button
            onClick={publish}
            disabled={publishing}
            className="btn-primary btn-sm flex-1 justify-center"
          >
            <Send size={12} />
            {publishing ? "Publishing…" : "Publish"}
          </button>
        )}
        <button className="btn-icon btn-secondary">
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [forms, setForms]     = useState<FormSchema[]>([]);
  const [loading, setLoading] = useState(true);

  const loadForms = () =>
    api.get<FormSchema[]>(`/projects/${id}/forms`).then(setForms);

  useEffect(() => {
    Promise.all([
      api.get<Project>(`/projects/${id}`).then(setProject),
      loadForms(),
    ]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="p-7">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-2/3" />
          <div className="grid grid-cols-2 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-5 h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-7 text-slate-400 text-sm">Project not found.</div>
    );
  }

  const published = forms.filter((f) => f.is_published).length;
  const drafts    = forms.filter((f) => !f.is_published).length;

  return (
    <div className="p-7 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-6">
        <Link href="/projects" className="hover:text-primary transition-colors flex items-center gap-1">
          <ChevronLeft size={14} />
          Projects
        </Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{project.name}</span>
      </nav>

      {/* Project header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="page-title">{project.name}</h1>
            <span
              className={`badge ${
                project.status === "active" ? "badge-green" : "badge-slate"
              }`}
            >
              {project.status}
            </span>
          </div>
          {project.description && (
            <p className="page-subtitle">{project.description}</p>
          )}
        </div>
        <Link
          href={`/projects/${id}/forms/new`}
          className="btn-primary"
        >
          <Plus size={15} />
          New Form
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <p className="stat-label">Total Forms</p>
          <p className="stat-value">{forms.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Published</p>
          <p className="stat-value text-emerald-600">{published}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Drafts</p>
          <p className="stat-value text-amber-500">{drafts}</p>
        </div>
      </div>

      {/* Forms list */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-700">
          Forms{" "}
          <span className="text-slate-400 font-normal">({forms.length})</span>
        </h2>
      </div>

      {forms.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={22} />
            </div>
            <p className="font-semibold text-slate-700 mb-1">No forms yet</p>
            <p className="text-sm mb-4">
              Create your first form to start collecting geospatial data.
            </p>
            <Link
              href={`/projects/${id}/forms/new`}
              className="btn-primary btn-sm"
            >
              Create Form
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {forms.map((f) => (
            <FormCard
              key={f.id}
              form={f}
              projectId={id}
              onPublish={loadForms}
            />
          ))}
        </div>
      )}
    </div>
  );
}

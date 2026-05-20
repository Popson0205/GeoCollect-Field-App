"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Map } from "lucide-react";
import TopNav from "../../../components/TopNav";
import { fetcher, getUser } from "../../../lib/api";

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetcher(`/projects/${id}`),
      fetcher(`/projects/${id}/forms`),
    ])
      .then(([p, f]: any) => { setProject(p); setForms(f || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <TopNav user={user ?? undefined} />
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav user={user ?? undefined} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/content" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Content
        </Link>

        {project && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Forms ({forms.length})
          </h2>
          {forms.length === 0 ? (
            <p className="text-gray-400 text-sm">No forms yet for this project.</p>
          ) : (
            <div className="space-y-2">
              {forms.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-800 font-medium text-sm">{f.name}</span>
                  <span className="text-xs text-gray-400">{f.geometry_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

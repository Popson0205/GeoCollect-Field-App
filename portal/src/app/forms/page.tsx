"use client";
import { useEffect, useState } from "react";
import { FileText, Search } from "lucide-react";
import TopNav from "../../components/TopNav";
import { fetcher, getUser } from "../../lib/api";

type Form = {
  id: string;
  name: string;
  project_name?: string;
  geometry_type: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const user = getUser();

  useEffect(() => {
    // Fetch all projects then their forms
    fetcher("/projects")
      .then(async (projects: any) => {
        const allForms: Form[] = [];
        for (const p of projects || []) {
          try {
            const pForms: any = await fetcher(`/projects/${p.id}/forms`);
            (pForms || []).forEach((f: any) => {
              allForms.push({ ...f, project_name: p.name });
            });
          } catch {}
        }
        setForms(allForms);
      })
      .catch(() => setForms([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = forms.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const published = forms.filter((f) => f.is_published).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav user={user ?? undefined} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search forms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        {!loading && forms.length > 0 && (
          <div className="flex gap-4 mb-6">
            {[
              { label: "Total Forms", value: forms.length },
              { label: "Published", value: published },
              { label: "Draft", value: forms.length - published },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl px-5 py-4 min-w-[100px]">
                <div className="text-2xl font-bold text-blue-600">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse h-14" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No forms yet</h3>
            <p className="text-gray-500 text-sm">
              Create forms in{" "}
              <a href="https://geocollect-field-app-studio.onrender.com"
                 className="text-blue-600 hover:underline" target="_blank">
                GeoCollect Studio
              </a>{" "}
              to see them here.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Form Name</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Project</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-blue-600">{form.name}</td>
                    <td className="px-4 py-3 text-gray-500">{form.project_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{form.geometry_type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        form.is_published
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {form.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(form.updated_at || form.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

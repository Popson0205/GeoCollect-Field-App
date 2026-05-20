"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Plus, Globe, Lock, Users, MoreHorizontal, Trash2, Map } from "lucide-react";
import TopNav from "../../components/TopNav";
import { fetcher, getUser } from "../../lib/api";

type ContentItem = {
  id: string;
  name: string;
  description?: string;
  status: string;
  visibility: string;
  created_by: string;
  created_at: string;
  form_count?: number;
};

function visibilityIcon(v: string) {
  if (v === "public") return <Globe className="w-3.5 h-3.5" />;
  if (v === "organization") return <Users className="w-3.5 h-3.5" />;
  return <Lock className="w-3.5 h-3.5" />;
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    fetcher("/projects")
      .then((data: any) => setItems(data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav user={user ?? undefined} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content</h1>
            <p className="text-gray-500 text-sm mt-1">Your projects and collected data</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No content yet</h3>
            <p className="text-gray-500 text-sm mb-6">
              Create projects in Studio and collect field data to see it here.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Visibility</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Forms</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>{item.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-gray-500 text-xs">
                        {visibilityIcon(item.visibility || "private")}
                        <span className="capitalize">{item.visibility || "private"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.form_count || 0}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(item.created_at).toLocaleDateString()}
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

"use client";
import { useEffect, useState } from "react";
import { Users, UserPlus } from "lucide-react";
import TopNav from "../../components/TopNav";
import { fetcher, getUser } from "../../lib/api";

export default function OrganizationPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    fetcher("/auth/me")
      .then(() => setMembers([]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav user={user ?? undefined} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organization</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your team members and roles</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Team management</h3>
          <p className="text-gray-500 text-sm">
            Manage your organization members from the Studio at{" "}
            <a href="https://geocollect-field-app-studio.onrender.com"
               className="text-blue-600 hover:underline" target="_blank">
              GeoCollect Studio
            </a>.
          </p>
        </div>
      </main>
    </div>
  );
}

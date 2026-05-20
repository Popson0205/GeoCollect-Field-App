"use client";
import { useEffect, useState } from "react";
import { Map, Plus, Clock } from "lucide-react";
import Link from "next/link";
import { api } from "../../lib/api";
import TopNav from "../../components/TopNav";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function PortalHomePage() {
  const [user, setUser] = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    api.get<any>("/auth/me").then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav user={user ?? undefined} />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting()}{user ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-gray-500 mt-1">Welcome to your GeoCollect workspace.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Map className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No maps yet</h3>
          <p className="text-gray-500 text-sm mb-6">
            Create a project in Studio and start collecting field data to see maps here.
          </p>
          <Link
            href="/content"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            View Submissions
          </Link>
        </div>
      </main>
    </div>
  );
}

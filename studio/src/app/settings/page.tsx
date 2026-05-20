"use client";
import { useEffect, useState } from "react";
import { User, Server, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; full_name: string; role: string } | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    api.get<any>("/auth/me").then(setUser).catch(() => {});
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("gc_token");
    router.push("/auth");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-4">
        {/* Account */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">Account</h2>
          </div>
          {user ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-900 font-medium">{user.full_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{user.email}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Role</span>
                <span className="text-gray-900 capitalize">{user.role?.replace("_", " ")}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Loading...</p>
          )}
        </div>

        {/* API */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold text-gray-800">API Connection</h2>
          </div>
          <div className="text-sm">
            <div className="flex justify-between py-2">
              <span className="text-gray-500">API URL</span>
              <span className="text-gray-900 font-mono text-xs">{apiUrl}</span>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

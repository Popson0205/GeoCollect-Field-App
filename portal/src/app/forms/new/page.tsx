"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function FormsNewPage() {
  const router = useRouter();
  useEffect(() => {
    // Redirect to Studio for form creation
    router.replace("https://geocollect-field-app-studio.onrender.com/projects");
  }, [router]);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Redirecting to Studio...</p>
    </div>
  );
}

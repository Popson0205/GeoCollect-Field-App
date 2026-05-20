"use client";
import { Box } from "lucide-react";
import TopNav from "../../components/TopNav";

export default function ScenePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Scene Viewer</h1>
          <p className="text-gray-500 text-sm mt-1">3D visualisation of your geospatial data</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Box className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No scenes yet</h3>
          <p className="text-gray-500 text-sm">
            3D scene views will be available once you have published geospatial data.
          </p>
        </div>
      </main>
    </div>
  );
}

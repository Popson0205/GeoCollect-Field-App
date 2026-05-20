"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { GeometryType } from "@/types";

export default function NewFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", geometry_type: "Point" as GeometryType });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = await api.post<{ id: string }>(`/projects/${id}/forms`, { ...form, schema: { fields: [] } });
    router.push(`/projects/${id}/forms/${f.id}`);
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">New Form</h1>
      <form onSubmit={create} className="card p-6 space-y-5">
        <div>
          <label className="label">Form Name</label>
          <input className="input" required placeholder="Tree Survey Form"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Geometry Type</label>
          <select className="input" value={form.geometry_type}
            onChange={e => setForm(f => ({ ...f, geometry_type: e.target.value as GeometryType }))}>
            <option value="Point">Point — GPS/manual location</option>
            <option value="LineString">LineString — GPS trace / road</option>
            <option value="Polygon">Polygon — Area boundary</option>
            <option value="Multi">Multi — Mixed geometry</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>
          <button type="submit" className="btn-primary">Create & Open Builder</button>
        </div>
      </form>
    </div>
  );
}

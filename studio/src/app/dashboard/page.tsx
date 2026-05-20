// studio/src/app/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, FileText, Users, ArrowRight, Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Project } from "@/types";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon size={18} />
      </div>
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="card-hover p-5 block group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-800 truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
            {project.description || "No description"}
          </p>
        </div>
        <span
          className={`badge shrink-0 ${
            project.status === "active" ? "badge-green" : "badge-slate"
          }`}
        >
          {project.status}
        </span>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <FileText size={11} />
            {project.form_count || 0} forms
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} />
            {project.member_count || 0} members
          </span>
        </div>
        <ArrowRight
          size={14}
          className="text-slate-300 group-hover:text-primary transition-colors"
        />
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem("gc_user");
    if (u) setUser(JSON.parse(u));

    api
      .get<Project[]>("/projects")
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalForms = projects.reduce(
    (a, p) => a + (Number(p.form_count) || 0),
    0
  );
  const totalMembers = projects.reduce(
    (a, p) => a + (Number(p.member_count) || 0),
    0
  );
  const firstName = user?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="p-7 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          {firstName ? `Good morning, ${firstName} 👋` : "Dashboard"}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Here's an overview of your GeoCollect workspace.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Projects"
          value={loading ? "—" : projects.length}
          icon={FolderKanban}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Total Forms"
          value={loading ? "—" : totalForms}
          icon={FileText}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          label="Collaborators"
          value={loading ? "—" : totalMembers}
          icon={Users}
          color="bg-violet-100 text-violet-600"
        />
      </div>

      {/* Recent projects */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-700">Recent Projects</h2>
        <Link href="/projects" className="btn btn-secondary btn-sm gap-1">
          <Plus size={13} />
          New Project
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-2/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-full mb-1" />
              <div className="h-3 bg-slate-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <FolderKanban size={22} />
            </div>
            <p className="font-semibold text-slate-700 mb-1">No projects yet</p>
            <p className="text-sm mb-4">
              Create your first project to start building forms.
            </p>
            <Link href="/projects" className="btn-primary btn-sm">
              Create Project
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.slice(0, 4).map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {projects.length > 4 && (
        <div className="mt-4 text-center">
          <Link
            href="/projects"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            View all {projects.length} projects <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}

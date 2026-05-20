// studio/src/app/portal/api-keys/page.tsx
// API Key management — list, create, revoke.
'use client';

import { useEffect, useState } from 'react';
import { Copy, Trash2, Plus } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts, headers: { 'Content-Type': 'application/json', ...opts.headers },
    credentials: 'include',
  });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.status === 204 ? null : res.json();
}

export default function ApiKeysPage() {
  const [keys, setKeys]         = useState<any[]>([]);
  const [newKey, setNewKey]     = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState({ name: '', scopes: ['read'] });
  const projectId               = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('project') || '' : '';

  const load = () => apiFetch(`/portal/api-keys?project_id=${projectId}`).then(setKeys);
  useEffect(() => { if (projectId) load(); }, [projectId]);

  async function create() {
    const res = await apiFetch('/portal/api-keys', {
      method: 'POST', body: JSON.stringify({ project_id: projectId, ...form })
    });
    setNewKey(res.key);
    setCreating(false);
    load();
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this key? This cannot be undone.')) return;
    await apiFetch(`/portal/api-keys/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">API Keys</h1>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded text-sm">
          <Plus size={14} /> New Key
        </button>
      </div>

      {newKey && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-sm">
          <p className="font-medium text-green-800 mb-1">Key created — copy it now. It won't be shown again.</p>
          <div className="flex items-center gap-2 font-mono bg-white border rounded px-3 py-2">
            <span className="flex-1 text-xs break-all">{newKey}</span>
            <button onClick={() => navigator.clipboard.writeText(newKey)}>
              <Copy size={14} className="text-gray-400 hover:text-gray-700" />
            </button>
          </div>
        </div>
      )}

      {creating && (
        <div className="border rounded-lg p-5 mb-6 bg-gray-50 space-y-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Key name (e.g. QGIS integration)"
            className="w-full border rounded px-3 py-2 text-sm" />
          <div className="flex gap-4 text-sm">
            {['read', 'export'].map(s => (
              <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={form.scopes.includes(s)}
                  onChange={e => setForm(f => ({
                    ...f, scopes: e.target.checked ? [...f.scopes, s] : f.scopes.filter(x => x !== s)
                  }))} />
                {s}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={create} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Create</button>
            <button onClick={() => setCreating(false)} className="border px-4 py-1.5 rounded text-sm">Cancel</button>
          </div>
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <thead><tr className="border-b text-left text-xs text-gray-500">
          <th className="pb-2">Name</th><th className="pb-2">Prefix</th>
          <th className="pb-2">Scopes</th><th className="pb-2">Last used</th><th className="pb-2"></th>
        </tr></thead>
        <tbody>
          {keys.map(k => (
            <tr key={k.id} className="border-b">
              <td className="py-2">{k.name}</td>
              <td className="py-2 font-mono text-xs text-gray-500">{k.key_prefix}…</td>
              <td className="py-2 text-xs">{k.scopes.join(', ')}</td>
              <td className="py-2 text-xs text-gray-400">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</td>
              <td className="py-2">
                {!k.revoked_at && (
                  <button onClick={() => revoke(k.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
                {k.revoked_at && <span className="text-xs text-gray-400">Revoked</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

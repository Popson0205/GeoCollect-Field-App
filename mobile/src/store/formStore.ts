import { create } from 'zustand';
import { Form } from '../types';
import { api } from '../services/api';
import { getDatabase } from '../db';
import { forms as formsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

interface FormState {
  forms: Form[];
  isLoading: boolean;
  lastSynced: Date | null;

  // Actions
  loadLocalForms: () => Promise<void>;
  syncForms: () => Promise<void>;
  getFormById: (id: string) => Form | undefined;
  markFormUsed: (id: string) => Promise<void>;
}

function dbRowToForm(row: typeof formsTable.$inferSelect): Form {
  return {
    id: row.id,
    version: row.version,
    title: row.title,
    description: row.description ?? undefined,
    org_id: row.org_id ?? undefined,
    created_by: row.created_by,
    sharing: row.sharing as Form['sharing'],
    fields: JSON.parse(row.fields_json),
    settings: JSON.parse(row.settings_json),
    geofence: row.geofence_json ? JSON.parse(row.geofence_json) : undefined,
    synced_at: row.synced_at ?? undefined,
  };
}

export const useFormStore = create<FormState>((set, get) => ({
  forms: [],
  isLoading: false,
  lastSynced: null,

  loadLocalForms: async () => {
    set({ isLoading: true });
    try {
      const db = getDatabase();
      const rows = await db.select().from(formsTable);
      set({ forms: rows.map(dbRowToForm) });
    } finally {
      set({ isLoading: false });
    }
  },

  syncForms: async () => {
    set({ isLoading: true });
    try {
      const remoteForms = await api.getAssignedForms();
      const db = getDatabase();
      const now = new Date().toISOString();

      for (const form of remoteForms) {
        const row = {
          id: form.id,
          version: form.version,
          title: form.title,
          description: form.description ?? null,
          org_id: form.org_id ?? null,
          created_by: form.created_by,
          sharing: form.sharing,
          fields_json: JSON.stringify(form.fields),
          settings_json: JSON.stringify(form.settings),
          geofence_json: form.geofence ? JSON.stringify(form.geofence) : null,
          synced_at: now,
          last_used_at: null,
        };
        await db.insert(formsTable).values(row)
          .onConflictDoUpdate({ target: formsTable.id, set: row });
      }

      const rows = await db.select().from(formsTable);
      set({ forms: rows.map(dbRowToForm), lastSynced: new Date() });
    } finally {
      set({ isLoading: false });
    }
  },

  getFormById: (id) => get().forms.find((f) => f.id === id),

  markFormUsed: async (id) => {
    const db = getDatabase();
    await db.update(formsTable)
      .set({ last_used_at: new Date().toISOString() })
      .where(eq(formsTable.id, id));
  },
}));

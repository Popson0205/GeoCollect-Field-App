import { create } from 'zustand';
import { Submission, SubmissionStatus } from '../types';
import { getDatabase } from '../db';
import { submissions as submissionsTable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { api } from '../services/api';
import * as Network from 'expo-network';
import * as Device from 'expo-device';

interface SubmissionState {
  submissions: Submission[];
  pendingCount: number;
  isSyncing: boolean;

  // Actions
  loadSubmissions: (formId?: string) => Promise<void>;
  saveSubmission: (submission: Omit<Submission, 'device_id'>) => Promise<string>;
  syncPending: () => Promise<{ synced: number; failed: number }>;
  getSubmissionById: (id: string) => Submission | undefined;
}

function dbRowToSubmission(row: typeof submissionsTable.$inferSelect): Submission {
  return {
    id: row.id,
    form_id: row.form_id,
    form_version: row.form_version,
    submitted_by: row.submitted_by,
    org_id: row.org_id ?? undefined,
    device_id: row.device_id,
    submitted_at: row.submitted_at,
    synced_at: row.synced_at ?? undefined,
    status: row.status as SubmissionStatus,
    location: row.location_json ? JSON.parse(row.location_json) : undefined,
    geofence_status: row.geofence_status as Submission['geofence_status'],
    answers: JSON.parse(row.answers_json),
    attachment_ids: JSON.parse(row.attachment_ids_json),
  };
}

export const useSubmissionStore = create<SubmissionState>((set, get) => ({
  submissions: [],
  pendingCount: 0,
  isSyncing: false,

  loadSubmissions: async (formId?) => {
    const db = getDatabase();
    const query = db.select().from(submissionsTable).orderBy(desc(submissionsTable.submitted_at));
    const rows = formId
      ? await db.select().from(submissionsTable)
          .where(eq(submissionsTable.form_id, formId))
          .orderBy(desc(submissionsTable.submitted_at))
      : await query;
    const subs = rows.map(dbRowToSubmission);
    const pendingCount = subs.filter((s) => s.status === 'pending').length;
    set({ submissions: subs, pendingCount });
  },

  saveSubmission: async (submission) => {
    const db = getDatabase();
    const deviceId = Device.modelName ?? 'unknown';
    const full: Submission = { ...submission, device_id: deviceId };
    
    await db.insert(submissionsTable).values({
      id: full.id,
      form_id: full.form_id,
      form_version: full.form_version,
      submitted_by: full.submitted_by,
      org_id: full.org_id ?? null,
      device_id: deviceId,
      submitted_at: full.submitted_at,
      synced_at: null,
      status: 'pending',
      location_json: full.location ? JSON.stringify(full.location) : null,
      geofence_status: full.geofence_status,
      answers_json: JSON.stringify(full.answers),
      attachment_ids_json: JSON.stringify(full.attachment_ids),
      sync_error: null,
      retry_count: 0,
    });

    await get().loadSubmissions();
    return full.id;
  },

  syncPending: async () => {
    const netState = await Network.getNetworkStateAsync();
    if (!netState.isConnected) return { synced: 0, failed: 0 };

    set({ isSyncing: true });
    let synced = 0, failed = 0;

    try {
      const db = getDatabase();
      const pendingRows = await db.select().from(submissionsTable)
        .where(eq(submissionsTable.status, 'pending'));

      if (pendingRows.length === 0) return { synced: 0, failed: 0 };

      const pendingSubs = pendingRows.map(dbRowToSubmission);
      const { results } = await api.uploadSubmissionBatch(pendingSubs);

      for (const result of results) {
        if (result.success) {
          await db.update(submissionsTable)
            .set({ status: 'synced', synced_at: result.synced_at, sync_error: null })
            .where(eq(submissionsTable.id, result.id));
          synced++;
        } else {
          await db.update(submissionsTable)
            .set({ 
              status: 'failed', 
              sync_error: result.error,
              retry_count: (pendingRows.find(r => r.id === result.id)?.retry_count ?? 0) + 1
            })
            .where(eq(submissionsTable.id, result.id));
          failed++;
        }
      }

      await get().loadSubmissions();
    } finally {
      set({ isSyncing: false });
    }

    return { synced, failed };
  },

  getSubmissionById: (id) => get().submissions.find((s) => s.id === id),
}));

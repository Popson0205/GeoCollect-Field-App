import { getUnsyncedFeatures, markFeatureSynced } from "./db";
import { apiFetch } from "./api";

export async function syncPendingFeatures(): Promise<{ synced: number; failed: number }> {
  const pending = await getUnsyncedFeatures();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0, failed = 0;
  try {
    const result = await apiFetch<{ synced: number; results: { id: string }[] }>("/features/batch", {
      method: "POST",
      body: JSON.stringify({ features: pending }),
    });
    for (const r of result.results) {
      await markFeatureSynced(r.id);
      synced++;
    }
  } catch {
    failed = pending.length;
  }
  return { synced, failed };
}

export function startAutoSync(intervalMs = 30000) {
  const run = () => {
    if (navigator.onLine) syncPendingFeatures().catch(console.error);
  };
  window.addEventListener("online", run);
  const timer = setInterval(run, intervalMs);
  return () => { clearInterval(timer); window.removeEventListener("online", run); };
}

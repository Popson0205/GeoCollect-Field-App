import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Network from 'expo-network';
import { useSubmissionStore } from '../store/submissionStore';

const SYNC_TASK_NAME = 'geocollect-background-sync';

// Register background task
TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const netState = await Network.getNetworkStateAsync();
    if (!netState.isConnected) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    const { syncPending } = useSubmissionStore.getState();
    const { synced } = await syncPending();
    return synced > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: 60, // seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.log('Background sync registration failed:', e);
  }
}

export async function unregisterBackgroundSync() {
  await BackgroundFetch.unregisterTaskAsync(SYNC_TASK_NAME);
}

/**
 * Foreground sync — call this when app becomes active or network reconnects.
 */
export async function triggerForegroundSync(): Promise<{ synced: number; failed: number }> {
  const netState = await Network.getNetworkStateAsync();
  if (!netState.isConnected) return { synced: 0, failed: 0 };
  return useSubmissionStore.getState().syncPending();
}

import {synchronize} from '@nozbe/watermelondb/sync';
import {database} from '../db';
import {api} from '../lib/api';
import {useAuthStore} from '../store/authStore';

export async function synchronizeDB(): Promise<void> {
  const setSyncStatus = useAuthStore.getState().setSyncStatus;
  setSyncStatus('syncing');
  try {
    await synchronize({
      database,
      pullChanges: async ({lastPulledAt}) => {
        const res = await api.get('/sync', {
          params: {last_pulled_at: lastPulledAt ?? undefined},
        });
        const {changes, timestamp} = res.data;
        return {changes, timestamp};
      },
      pushChanges: async ({changes}) => {
        await api.post('/sync', changes);
      },
    });
    setSyncStatus('synced');
  } catch (error) {
    setSyncStatus('error');
    throw error;
  }
}

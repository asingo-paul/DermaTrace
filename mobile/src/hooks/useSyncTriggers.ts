import {useEffect, useRef} from 'react';
import {AppState, AppStateStatus} from 'react-native';
import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {synchronizeDB} from '../services/syncService';

/**
 * Sets up automatic sync triggers:
 * - AppState: syncs when app returns to foreground
 * - NetInfo: syncs when connectivity is restored
 *
 * Returns a `triggerSync` function for manual invocation.
 */
export function useSyncTriggers(): {triggerSync: () => void} {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasConnected = useRef<boolean | null>(null);

  const triggerSync = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      synchronizeDB().catch(() => {
        // Sync errors are surfaced via syncStatus banner
      });
    }, 2000);
  };

  useEffect(() => {
    // AppState listener — sync when coming to foreground
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        triggerSync();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    // NetInfo listener — sync when connectivity is restored
    const unsubscribeNetInfo = NetInfo.addEventListener(
      (state: NetInfoState) => {
        const isConnected = state.isConnected ?? false;
        if (isConnected && wasConnected.current === false) {
          triggerSync();
        }
        wasConnected.current = isConnected;
      },
    );

    return () => {
      appStateSubscription.remove();
      unsubscribeNetInfo();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {triggerSync};
}

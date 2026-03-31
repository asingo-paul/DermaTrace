import React, {useEffect, useRef} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useAuthStore} from '../store/authStore';
import {synchronizeDB} from '../services/syncService';

const BANNER_HEIGHT = 36;

export function SyncStatusBanner(): React.ReactElement | null {
  const syncStatus = useAuthStore(state => state.syncStatus);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isVisible = syncStatus === 'pending' || syncStatus === 'error';

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-BANNER_HEIGHT, 0],
  });

  const handleRetry = () => {
    synchronizeDB().catch(() => {
      // Error is reflected via syncStatus
    });
  };

  if (syncStatus === 'synced' || syncStatus === 'syncing') {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, {transform: [{translateY}]}]}
      accessibilityLiveRegion="polite">
      {syncStatus === 'pending' && (
        <View style={[styles.banner, styles.pendingBanner]}>
          <Text style={styles.bannerText}>Syncing changes...</Text>
        </View>
      )}
      {syncStatus === 'error' && (
        <TouchableOpacity
          style={[styles.banner, styles.errorBanner]}
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Sync failed. Tap to retry.">
          <Text style={styles.bannerText}>Sync failed. Tap to retry.</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    height: BANNER_HEIGHT,
  },
  banner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBanner: {
    backgroundColor: '#F59E0B', // amber-400
  },
  errorBanner: {
    backgroundColor: '#EF4444', // red-500
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

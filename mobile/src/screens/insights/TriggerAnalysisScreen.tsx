import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {useMutation} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../../store/authStore';
import {api} from '../../lib/api';
import {InsightsStackParamList} from '../../navigation/RootNavigator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TriggerResult {
  ingredient: string;
  confidence_score: number; // 0.0 to 1.0
}

interface TriggerResponse {
  triggers: TriggerResult[];
  analyzed_at: string | null;
}

type Nav = NativeStackNavigationProp<InsightsStackParamList, 'TriggerAnalysis'>;

// ---------------------------------------------------------------------------
// TriggerAnalysisScreen
// ---------------------------------------------------------------------------

export function TriggerAnalysisScreen() {
  const navigation = useNavigation<Nav>();
  const userTier = useAuthStore(state => state.userTier);

  const {data, isPending, isError, error, mutate} = useMutation<TriggerResponse>({
    mutationFn: async () => {
      const res = await api.get<TriggerResponse>('/analysis/triggers');
      return res.data;
    },
  });

  // Detect 400 insufficient data
  const is400 =
    isError &&
    (error as any)?.response?.status === 400;

  // Pro gate
  if (userTier === 'free') {
    return (
      <View style={styles.centered}>
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeHeading}>🔒 Pro Feature</Text>
          <Text style={styles.upgradeBody}>
            Upgrade to Pro to unlock AI-powered trigger analysis
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => (navigation as any).navigate('Profile')}>
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Trigger Analysis</Text>

      {/* Run Analysis button */}
      <TouchableOpacity
        style={[styles.primaryButton, isPending && styles.primaryButtonDisabled]}
        onPress={() => mutate()}
        disabled={isPending}>
        {isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Run Analysis</Text>
        )}
      </TouchableOpacity>

      {/* Insufficient data */}
      {is400 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Not enough data yet. Log at least 3 reactions to run analysis.
          </Text>
        </View>
      )}

      {/* Results */}
      {data && (
        <>
          {data.analyzed_at && (
            <Text style={styles.timestamp}>
              Analyzed: {new Date(data.analyzed_at).toLocaleString()}
            </Text>
          )}

          {data.triggers.length === 0 ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>No triggers detected.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Ranked Triggers</Text>
              {data.triggers.map((t, i) => (
                <View key={t.ingredient} style={[styles.triggerRow, i > 0 && styles.triggerRowBorder]}>
                  <Text style={styles.ingredientName}>{t.ingredient}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {width: `${Math.round(t.confidence_score * 100)}%`},
                      ]}
                    />
                  </View>
                  <Text style={styles.scoreLabel}>
                    {Math.round(t.confidence_score * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Recommendations')}>
            <Text style={styles.secondaryButtonText}>View Recommendations</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 20,
  },
  // Upgrade card
  upgradeCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  upgradeHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 10,
    textAlign: 'center',
  },
  upgradeBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Buttons
  primaryButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: '#4A90D9',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: {
    color: '#4A90D9',
    fontSize: 15,
    fontWeight: '600',
  },
  // Info / error card
  infoCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  infoText: {
    color: '#92400E',
    fontSize: 14,
    lineHeight: 20,
  },
  // Results card
  card: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  triggerRow: {
    paddingVertical: 10,
  },
  triggerRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  barTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#E74C3C',
    borderRadius: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  timestamp: {
    fontSize: 12,
    color: '#9B9B9B',
    marginBottom: 12,
  },
});

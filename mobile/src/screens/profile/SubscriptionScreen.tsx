import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api} from '../../lib/api';
import {ProfileStackParamList} from '../../navigation/RootNavigator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SubscriptionTier = 'free' | 'trial' | 'pro';
type BillingInterval = 'monthly' | 'annual';

interface SubscriptionData {
  tier: SubscriptionTier;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  billing_interval: BillingInterval | null;
}

type Props = NativeStackScreenProps<ProfileStackParamList, 'Subscription'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function tierLabel(tier: SubscriptionTier): string {
  switch (tier) {
    case 'pro':
      return 'Pro';
    case 'trial':
      return 'Trial';
    default:
      return 'Free';
  }
}

function tierBadgeStyle(tier: SubscriptionTier) {
  switch (tier) {
    case 'pro':
      return {backgroundColor: '#4A90D9'};
    case 'trial':
      return {backgroundColor: '#F39C12'};
    default:
      return {backgroundColor: '#9B9B9B'};
  }
}

// ---------------------------------------------------------------------------
// SubscriptionScreen
// ---------------------------------------------------------------------------

export function SubscriptionScreen({navigation}: Props) {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<BillingInterval>('monthly');

  const {data, isLoading} = useQuery<SubscriptionData>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await api.get<SubscriptionData>('/subscription');
      return res.data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post('/subscription/cancel'),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['subscription']});
      Alert.alert('Cancelled', 'Your subscription has been cancelled.');
    },
    onError: () => Alert.alert('Error', 'Failed to cancel subscription.'),
  });

  const changePlanMutation = useMutation({
    mutationFn: (interval: BillingInterval) =>
      api.post('/subscription/change-plan', {billing_interval: interval}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['subscription']});
      Alert.alert('Plan Updated', 'Your billing plan has been switched.');
    },
    onError: () => Alert.alert('Error', 'Failed to switch plan.'),
  });

  function handleCancel() {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel? You will lose Pro access at the end of your billing period.',
      [
        {text: 'Keep Subscription', style: 'cancel'},
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(),
        },
      ],
    );
  }

  function handleSwitchPlan() {
    const newInterval: BillingInterval =
      data?.billing_interval === 'monthly' ? 'annual' : 'monthly';
    Alert.alert(
      'Switch Plan',
      `Switch to ${newInterval === 'annual' ? 'Annual ($39.99/yr)' : 'Monthly ($4.99/mo)'}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Switch',
          onPress: () => changePlanMutation.mutate(newInterval),
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load subscription info.</Text>
      </View>
    );
  }

  const isPro = data.tier === 'pro';
  const isTrial = data.tier === 'trial';

  // Warning banners
  const showTrialWarning =
    isTrial && data.trial_ends_at != null && daysUntil(data.trial_ends_at) <= 3;
  const showRenewalWarning =
    isPro && data.subscription_ends_at != null && daysUntil(data.subscription_ends_at) <= 3;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Subscription</Text>

      {/* Warning banners */}
      {showTrialWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ Your trial expires soon!</Text>
        </View>
      )}
      {showRenewalWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ Your subscription renews soon!</Text>
        </View>
      )}

      {/* Current tier card */}
      <View style={styles.card}>
        <View style={styles.tierRow}>
          <Text style={styles.cardLabel}>Current Plan</Text>
          <View style={[styles.tierBadge, tierBadgeStyle(data.tier)]}>
            <Text style={styles.tierBadgeText}>{tierLabel(data.tier)}</Text>
          </View>
        </View>

        {isTrial && data.trial_ends_at && (
          <Text style={styles.dateText}>
            Trial ends: {formatDate(data.trial_ends_at)}
          </Text>
        )}
        {isPro && data.subscription_ends_at && (
          <Text style={styles.dateText}>
            Renews: {formatDate(data.subscription_ends_at)}
          </Text>
        )}
      </View>

      {/* Upgrade section (shown for free/trial) */}
      {!isPro && (
        <View style={styles.card}>
          <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
          <Text style={styles.upgradeSubtitle}>
            Unlock unlimited products, AI trigger analysis, and more.
          </Text>

          <View style={styles.planToggleRow}>
            <TouchableOpacity
              style={[
                styles.planToggleBtn,
                selectedPlan === 'monthly' && styles.planToggleBtnActive,
              ]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.planToggleText,
                  selectedPlan === 'monthly' && styles.planToggleTextActive,
                ]}>
                Monthly
              </Text>
              <Text
                style={[
                  styles.planTogglePrice,
                  selectedPlan === 'monthly' && styles.planToggleTextActive,
                ]}>
                $4.99/mo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.planToggleBtn,
                selectedPlan === 'annual' && styles.planToggleBtnActive,
              ]}
              onPress={() => setSelectedPlan('annual')}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.planToggleText,
                  selectedPlan === 'annual' && styles.planToggleTextActive,
                ]}>
                Annual
              </Text>
              <Text
                style={[
                  styles.planTogglePrice,
                  selectedPlan === 'annual' && styles.planToggleTextActive,
                ]}>
                $39.99/yr
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => navigation.navigate('Billing', {plan: selectedPlan})}
            activeOpacity={0.8}>
            <Text style={styles.upgradeBtnText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pro-only actions */}
      {isPro && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Billing</Text>

          <TouchableOpacity
            style={styles.switchPlanBtn}
            onPress={handleSwitchPlan}
            disabled={changePlanMutation.isPending}
            activeOpacity={0.8}>
            {changePlanMutation.isPending ? (
              <ActivityIndicator color="#4A90D9" />
            ) : (
              <Text style={styles.switchPlanText}>
                Switch to{' '}
                {data.billing_interval === 'monthly'
                  ? 'Annual ($39.99/yr)'
                  : 'Monthly ($4.99/mo)'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
            activeOpacity={0.8}>
            {cancelMutation.isPending ? (
              <ActivityIndicator color="#E74C3C" />
            ) : (
              <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  content: {padding: 16, paddingBottom: 40},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  screenTitle: {fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 16},
  errorText: {color: '#E74C3C', fontSize: 14},
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  warningText: {fontSize: 14, color: '#92400E', fontWeight: '500'},
  card: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  tierRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  tierBadge: {borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4},
  tierBadgeText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600'},
  dateText: {fontSize: 14, color: '#6B7280', marginTop: 8},
  upgradeTitle: {fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 4},
  upgradeSubtitle: {fontSize: 14, color: '#6B7280', marginBottom: 16},
  planToggleRow: {flexDirection: 'row', gap: 10, marginBottom: 16},
  planToggleBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 12,
    alignItems: 'center',
  },
  planToggleBtnActive: {borderColor: '#4A90D9', backgroundColor: '#EBF4FF'},
  planToggleText: {fontSize: 14, fontWeight: '600', color: '#6B7280'},
  planTogglePrice: {fontSize: 13, color: '#6B7280', marginTop: 2},
  planToggleTextActive: {color: '#4A90D9'},
  upgradeBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  switchPlanBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4A90D9',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  switchPlanText: {color: '#4A90D9', fontSize: 15, fontWeight: '600'},
  cancelBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FFF0F0',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {color: '#E74C3C', fontSize: 15, fontWeight: '600'},
});

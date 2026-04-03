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

type SubscriptionTier = 'free' | 'trial' | 'pro';
type BillingInterval = 'monthly' | 'annual';

interface SubscriptionData {
  tier: SubscriptionTier;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  billing_interval: BillingInterval | null;
}

type Props = NativeStackScreenProps<ProfileStackParamList, 'Subscription'>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'});
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Tier banner component
// ---------------------------------------------------------------------------

function TierBanner({tier, trialEndsAt, subscriptionEndsAt}: {
  tier: SubscriptionTier;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
}) {
  const bannerConfig = {
    pro: {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      badge: '#1A6FD4',
      badgeText: 'PRO',
      title: 'You\'re on Pro',
      subtitle: subscriptionEndsAt ? `Renews ${formatDate(subscriptionEndsAt)}` : 'Active subscription',
    },
    trial: {
      bg: '#FFFBEB',
      border: '#FDE68A',
      badge: '#D97706',
      badgeText: 'TRIAL',
      title: '14-Day Free Trial',
      subtitle: trialEndsAt
        ? `${Math.max(0, daysUntil(trialEndsAt))} days remaining · Ends ${formatDate(trialEndsAt)}`
        : 'Trial active',
    },
    free: {
      bg: '#F8FAFC',
      border: '#E2E8F0',
      badge: '#64748B',
      badgeText: 'FREE',
      title: 'Free Plan',
      subtitle: '10 products · 20 reactions · No AI features',
    },
  };

  const cfg = bannerConfig[tier];

  return (
    <View style={[banner.container, {backgroundColor: cfg.bg, borderColor: cfg.border}]}>
      <View style={[banner.badge, {backgroundColor: cfg.badge}]}>
        <Text style={banner.badgeText}>{cfg.badgeText}</Text>
      </View>
      <View style={banner.textBlock}>
        <Text style={banner.title}>{cfg.title}</Text>
        <Text style={banner.subtitle}>{cfg.subtitle}</Text>
      </View>
      {tier === 'pro' && (
        <View style={banner.checkCircle}>
          <Text style={banner.checkText}>✓</Text>
        </View>
      )}
    </View>
  );
}

const banner = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1},
  textBlock: {flex: 1},
  title: {fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 3},
  subtitle: {fontSize: 12, color: '#64748B', lineHeight: 17},
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A6FD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
});

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
      Alert.alert('Cancelled', 'Your subscription has been cancelled. Access continues until end of billing period.');
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A6FD4" />
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
  const trialExpiringSoon = isTrial && data.trial_ends_at != null && daysUntil(data.trial_ends_at) <= 3;
  const renewalSoon = isPro && data.subscription_ends_at != null && daysUntil(data.subscription_ends_at) <= 3;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Tier banner */}
      <TierBanner
        tier={data.tier}
        trialEndsAt={data.trial_ends_at}
        subscriptionEndsAt={data.subscription_ends_at}
      />

      {/* Urgency alerts */}
      {trialExpiringSoon && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>
            Your trial expires in {daysUntil(data.trial_ends_at!)} day{daysUntil(data.trial_ends_at!) !== 1 ? 's' : ''}. Upgrade now to keep Pro access.
          </Text>
        </View>
      )}
      {renewalSoon && (
        <View style={[styles.alertBanner, styles.alertBannerBlue]}>
          <Text style={[styles.alertText, {color: '#1E40AF'}]}>
            Your subscription renews in {daysUntil(data.subscription_ends_at!)} day{daysUntil(data.subscription_ends_at!) !== 1 ? 's' : ''}.
          </Text>
        </View>
      )}

      {/* Pro features list */}
      {!isPro && (
        <>
          <Text style={styles.sectionLabel}>What you get with Pro</Text>
          <View style={styles.featureCard}>
            {[
              'Unlimited product logging',
              'Unlimited reaction tracking',
              'AI trigger ingredient analysis',
              'Personalized product recommendations',
              'Ingredient label parser',
              'Offline sync across devices',
            ].map((f, i) => (
              <View key={i} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
                <View style={styles.featureCheck}><Text style={styles.featureCheckText}>✓</Text></View>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Plan selection */}
          <Text style={styles.sectionLabel}>Choose a plan</Text>
          <View style={styles.planRow}>
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.7}>
              <Text style={[styles.planName, selectedPlan === 'monthly' && styles.planNameActive]}>Monthly</Text>
              <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceActive]}>$4.99</Text>
              <Text style={[styles.planPeriod, selectedPlan === 'monthly' && styles.planPeriodActive]}>/month</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'annual' && styles.planCardActive]}
              onPress={() => setSelectedPlan('annual')}
              activeOpacity={0.7}>
              <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>SAVE 33%</Text></View>
              <Text style={[styles.planName, selectedPlan === 'annual' && styles.planNameActive]}>Annual</Text>
              <Text style={[styles.planPrice, selectedPlan === 'annual' && styles.planPriceActive]}>$39.99</Text>
              <Text style={[styles.planPeriod, selectedPlan === 'annual' && styles.planPeriodActive]}>/year</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => navigation.navigate('Billing', {plan: selectedPlan})}
            activeOpacity={0.85}>
            <Text style={styles.upgradeBtnText}>
              {isTrial ? 'Upgrade Now' : 'Start Free Trial'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.trialNote}>14 days free · Cancel anytime · No hidden fees</Text>
        </>
      )}

      {/* Pro management */}
      {isPro && (
        <View style={styles.manageCard}>
          <Text style={styles.sectionLabel}>Manage Plan</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              const newInterval: BillingInterval = data.billing_interval === 'monthly' ? 'annual' : 'monthly';
              Alert.alert(
                'Switch Plan',
                `Switch to ${newInterval === 'annual' ? 'Annual ($39.99/yr)' : 'Monthly ($4.99/mo)'}?`,
                [
                  {text: 'Cancel', style: 'cancel'},
                  {text: 'Switch', onPress: () => changePlanMutation.mutate(newInterval)},
                ],
              );
            }}
            disabled={changePlanMutation.isPending}
            activeOpacity={0.7}>
            <Text style={styles.actionRowText}>
              Switch to {data.billing_interval === 'monthly' ? 'Annual ($39.99/yr)' : 'Monthly ($4.99/mo)'}
            </Text>
            {changePlanMutation.isPending
              ? <ActivityIndicator size="small" color="#1A6FD4" />
              : <Text style={styles.actionRowChevron}>›</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowDanger]}
            onPress={() => Alert.alert(
              'Cancel Subscription',
              'You will keep Pro access until the end of your billing period.',
              [
                {text: 'Keep Subscription', style: 'cancel'},
                {text: 'Cancel', style: 'destructive', onPress: () => cancelMutation.mutate()},
              ],
            )}
            disabled={cancelMutation.isPending}
            activeOpacity={0.7}>
            <Text style={styles.actionRowDangerText}>Cancel Subscription</Text>
            {cancelMutation.isPending
              ? <ActivityIndicator size="small" color="#EF4444" />
              : <Text style={styles.actionRowChevron}>›</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  content: {padding: 20, paddingBottom: 48},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  errorText: {color: '#EF4444', fontSize: 14},

  alertBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
  },
  alertBannerBlue: {backgroundColor: '#EFF6FF', borderLeftColor: '#1A6FD4'},
  alertText: {fontSize: 13, color: '#92400E', lineHeight: 18},

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  featureCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  featureRow: {flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12},
  featureRowBorder: {borderTopWidth: 1, borderTopColor: '#F1F5F9'},
  featureCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCheckText: {fontSize: 11, color: '#16A34A', fontWeight: '700'},
  featureText: {fontSize: 14, color: '#0F172A', fontWeight: '500'},

  planRow: {flexDirection: 'row', gap: 12, marginBottom: 16},
  planCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  planCardActive: {borderColor: '#1A6FD4', backgroundColor: '#EFF6FF'},
  saveBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  saveBadgeText: {fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5},
  planName: {fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 4, marginTop: 8},
  planNameActive: {color: '#1A6FD4'},
  planPrice: {fontSize: 26, fontWeight: '800', color: '#0F172A'},
  planPriceActive: {color: '#1A6FD4'},
  planPeriod: {fontSize: 12, color: '#94A3B8'},
  planPeriodActive: {color: '#3B82F6'},

  upgradeBtn: {
    backgroundColor: '#1A6FD4',
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  upgradeBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  trialNote: {textAlign: 'center', fontSize: 12, color: '#94A3B8'},

  manageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionRowDanger: {borderBottomWidth: 0},
  actionRowText: {fontSize: 15, color: '#0F172A', fontWeight: '500'},
  actionRowDangerText: {fontSize: 15, color: '#EF4444', fontWeight: '500'},
  actionRowChevron: {fontSize: 20, color: '#94A3B8'},
});

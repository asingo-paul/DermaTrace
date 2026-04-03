import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import {BarChart} from 'react-native-gifted-charts';
import {api} from '../lib/api';
import {useAuthStore} from '../store/authStore';

interface TimelineItem {
  id: string;
  type: 'product' | 'reaction';
  date: string;
  name?: string;
  severity?: string;
  symptoms?: string[];
}

interface ChartDataPoint {
  date: string;
  count: number;
}

interface TopProduct {
  id: string;
  name: string;
  reaction_count: number;
}

interface TopSymptom {
  symptom: string;
  count: number;
}

interface DashboardData {
  timeline: TimelineItem[];
  reaction_chart: ChartDataPoint[];
  top_products: TopProduct[];
  top_symptoms: TopSymptom[];
}

function severityColor(severity?: string): string {
  switch (severity) {
    case 'severe': return '#EF4444';
    case 'moderate': return '#F59E0B';
    case 'mild': return '#10B981';
    default: return '#F59E0B';
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

// ---------------------------------------------------------------------------
// Upgrade Banner Modal
// ---------------------------------------------------------------------------

function UpgradeBanner({onDismiss, onUpgrade}: {onDismiss: () => void; onUpgrade: () => void}) {
  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.modalOverlay}>
        <View style={styles.bannerCard}>
          <TouchableOpacity style={styles.bannerClose} onPress={onDismiss}>
            <Text style={styles.bannerCloseText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeText}>PRO</Text>
          </View>

          <Text style={styles.bannerTitle}>Unlock the full picture</Text>
          <Text style={styles.bannerBody}>
            Get AI trigger analysis, unlimited logging, and safer product recommendations.
          </Text>

          <View style={styles.bannerPricing}>
            <View style={styles.bannerPlan}>
              <Text style={styles.bannerPlanPrice}>$4.99</Text>
              <Text style={styles.bannerPlanPeriod}>/month</Text>
            </View>
            <View style={styles.bannerPlanDivider} />
            <View style={styles.bannerPlan}>
              <Text style={styles.bannerPlanPrice}>$39.99</Text>
              <Text style={styles.bannerPlanPeriod}>/year</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.bannerBtn} onPress={onUpgrade} activeOpacity={0.85}>
            <Text style={styles.bannerBtnText}>Start Free Trial</Text>
          </TouchableOpacity>

          <Text style={styles.bannerNote}>14 days free · Cancel anytime</Text>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// DashboardScreen
// ---------------------------------------------------------------------------

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const userTier = useAuthStore(state => state.userTier);
  const [showUpgrade, setShowUpgrade] = useState(
    userTier === 'free' || userTier === 'trial',
  );

  const {data, isLoading, isError} = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<DashboardData>('/dashboard');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A6FD4" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load dashboard.</Text>
      </View>
    );
  }

  const hasData = data.timeline.length > 0;

  return (
    <>
      {showUpgrade && (
        <UpgradeBanner
          onDismiss={() => setShowUpgrade(false)}
          onUpgrade={() => {
            setShowUpgrade(false);
            navigation.navigate('Profile', {screen: 'Subscription'});
          }}
        />
      )}

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>Dashboard</Text>
          {(userTier === 'free' || userTier === 'trial') && (
            <TouchableOpacity
              style={styles.upgradeChip}
              onPress={() => navigation.navigate('Profile', {screen: 'Subscription'})}
              activeOpacity={0.8}>
              <Text style={styles.upgradeChipText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
        </View>

        {!hasData ? (
          <>
            {/* Onboarding guide */}
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Welcome to DermaTrace</Text>
              <Text style={styles.welcomeSubtitle}>
                Here's how to get the most out of the app
              </Text>
            </View>

            <Text style={styles.sectionLabel}>How to get started</Text>

            {[
              {
                step: '1',
                tab: 'Products',
                title: 'Log your skincare products',
                desc: 'Tap Products in the tab bar below. Add each product you use with its ingredient list.',
                color: '#1A6FD4',
              },
              {
                step: '2',
                tab: 'Reactions',
                title: 'Record any skin reactions',
                desc: 'Tap Reactions to log symptoms like rash or itching and link them to products you used.',
                color: '#F59E0B',
              },
              {
                step: '3',
                tab: 'Insights',
                title: 'Discover your triggers',
                desc: 'After logging 3+ reactions, tap Insights to run AI analysis and find problem ingredients.',
                color: '#10B981',
              },
              {
                step: '4',
                tab: 'Profile',
                title: 'Set your skin profile',
                desc: 'Tap Profile to set your skin type and sensitivity level for better recommendations.',
                color: '#8B5CF6',
              },
            ].map(item => (
              <TouchableOpacity
                key={item.step}
                style={styles.guideCard}
                onPress={() => navigation.navigate(item.tab as any)}
                activeOpacity={0.7}>
                <View style={[styles.guideStep, {backgroundColor: item.color}]}>
                  <Text style={styles.guideStepText}>{item.step}</Text>
                </View>
                <View style={styles.guideContent}>
                  <Text style={styles.guideTitle}>{item.title}</Text>
                  <Text style={styles.guideDesc}>{item.desc}</Text>
                </View>
                <Text style={styles.guideArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {/* Timeline */}
            <Text style={styles.sectionLabel}>Recent Activity</Text>
            <View style={styles.card}>
              <FlatList
                data={data.timeline.slice(0, 10)}
                keyExtractor={item => item.id}
                renderItem={({item}) => {
                  const isReaction = item.type === 'reaction';
                  return (
                    <View style={styles.timelineRow}>
                      <View
                        style={[
                          styles.timelineDot,
                          {
                            backgroundColor: isReaction
                              ? severityColor(item.severity)
                              : '#1A6FD4',
                          },
                        ]}
                      />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineDate}>{formatDate(item.date)}</Text>
                        <Text style={styles.timelineName}>
                          {isReaction
                            ? `Reaction · ${item.severity ?? 'unknown'}`
                            : item.name ?? 'Product logged'}
                        </Text>
                        {isReaction && item.symptoms && item.symptoms.length > 0 && (
                          <Text style={styles.timelineSymptoms}>
                            {item.symptoms.join(', ')}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                }}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>

            {/* Chart */}
            {data.reaction_chart.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Reactions (Last 7 Days)</Text>
                <View style={styles.card}>
                  <BarChart
                    data={data.reaction_chart.slice(-7).map(d => ({
                      value: d.count,
                      label: formatDate(d.date),
                      frontColor: '#1A6FD4',
                    }))}
                    barWidth={28}
                    spacing={12}
                    roundedTop
                    xAxisThickness={1}
                    yAxisThickness={0}
                    xAxisColor="#E2E8F0"
                    yAxisTextStyle={styles.chartAxisText}
                    xAxisLabelTextStyle={styles.chartAxisText}
                    noOfSections={4}
                    maxValue={Math.max(
                      ...data.reaction_chart.slice(-7).map(d => d.count),
                      4,
                    )}
                    isAnimated
                  />
                </View>
              </>
            )}

            {/* Top products */}
            {data.top_products.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Most Reactive Products</Text>
                <View style={styles.card}>
                  {data.top_products.map((p, i) => (
                    <View key={p.id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                      <Text style={styles.listRank}>{i + 1}</Text>
                      <Text style={styles.listName} numberOfLines={1}>{p.name}</Text>
                      <View style={styles.reactionBadge}>
                        <Text style={styles.reactionBadgeText}>{p.reaction_count}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Top symptoms */}
            {data.top_symptoms.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Frequent Symptoms</Text>
                <View style={styles.card}>
                  <View style={styles.pillRow}>
                    {data.top_symptoms.map(s => (
                      <View key={s.symptom} style={styles.pill}>
                        <Text style={styles.pillText}>{s.symptom}</Text>
                        <Text style={styles.pillCount}>{s.count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  content: {padding: 20, paddingBottom: 40},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  errorText: {color: '#EF4444', fontSize: 14, textAlign: 'center'},

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  screenTitle: {fontSize: 24, fontWeight: '700', color: '#0F172A', letterSpacing: -0.5},
  upgradeChip: {
    backgroundColor: '#1A6FD4',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  upgradeChipText: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  // Timeline
  timelineRow: {flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6},
  timelineDot: {width: 8, height: 8, borderRadius: 4, marginTop: 5, marginRight: 12},
  timelineContent: {flex: 1},
  timelineDate: {fontSize: 11, color: '#94A3B8', marginBottom: 2},
  timelineName: {fontSize: 14, fontWeight: '500', color: '#0F172A'},
  timelineSymptoms: {fontSize: 12, color: '#64748B', marginTop: 2},
  separator: {height: 1, backgroundColor: '#F1F5F9', marginVertical: 4},

  // Chart
  chartAxisText: {fontSize: 10, color: '#94A3B8'},

  // List
  listRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 10},
  listRowBorder: {borderTopWidth: 1, borderTopColor: '#F1F5F9'},
  listRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    color: '#1A6FD4',
    marginRight: 12,
  },
  listName: {flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500'},
  reactionBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  reactionBadgeText: {fontSize: 13, fontWeight: '600', color: '#EF4444'},

  // Pills
  pillRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {fontSize: 13, color: '#1A6FD4', fontWeight: '500'},
  pillCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    backgroundColor: '#1A6FD4',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },

  // Empty
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyTitle: {fontSize: 17, fontWeight: '600', color: '#0F172A', marginBottom: 6},
  emptySubtitle: {fontSize: 14, color: '#64748B', textAlign: 'center'},

  // Onboarding guide
  welcomeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  welcomeTitle: {fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4},
  welcomeSubtitle: {fontSize: 14, color: '#3B82F6'},
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 14,
  },
  guideStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideStepText: {fontSize: 14, fontWeight: '800', color: '#FFFFFF'},
  guideContent: {flex: 1},
  guideTitle: {fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 3},
  guideDesc: {fontSize: 12, color: '#64748B', lineHeight: 17},
  guideArrow: {fontSize: 22, color: '#CBD5E1'},

  // Upgrade modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 32,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  bannerClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCloseText: {fontSize: 14, color: '#64748B', fontWeight: '600'},
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A6FD4',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  bannerBadgeText: {fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1},
  bannerTitle: {fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 8, letterSpacing: -0.3},
  bannerBody: {fontSize: 14, color: '#64748B', lineHeight: 21, marginBottom: 20},
  bannerPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  bannerPlan: {flex: 1, alignItems: 'center'},
  bannerPlanPrice: {fontSize: 22, fontWeight: '700', color: '#0F172A'},
  bannerPlanPeriod: {fontSize: 13, color: '#64748B', marginTop: 2},
  bannerPlanDivider: {width: 1, height: 40, backgroundColor: '#E2E8F0'},
  bannerBtn: {
    backgroundColor: '#1A6FD4',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bannerBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  bannerNote: {textAlign: 'center', fontSize: 12, color: '#94A3B8'},
});

import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {BarChart} from 'react-native-gifted-charts';
import {api} from '../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityColor(severity?: string): string {
  switch (severity) {
    case 'severe':
      return '#E74C3C';
    case 'moderate':
      return '#F39C12';
    case 'mild':
      return '#27AE60';
    default:
      return '#F39C12';
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({title}: {title: string}) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function Card({children}: {children: React.ReactNode}) {
  return <View style={styles.card}>{children}</View>;
}

function TimelineRow({item}: {item: TimelineItem}) {
  const isReaction = item.type === 'reaction';
  const dotColor = isReaction ? severityColor(item.severity) : '#4A90D9';

  return (
    <View style={styles.timelineRow}>
      <View style={[styles.timelineDot, {backgroundColor: dotColor}]} />
      <View style={styles.timelineContent}>
        <Text style={styles.timelineDate}>{formatDate(item.date)}</Text>
        <Text style={styles.timelineName}>
          {isReaction
            ? `Reaction${item.severity ? ` · ${item.severity}` : ''}`
            : item.name ?? 'Product logged'}
        </Text>
        {isReaction && item.symptoms && item.symptoms.length > 0 && (
          <Text style={styles.timelineSymptoms}>{item.symptoms.join(', ')}</Text>
        )}
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <Card>
      <Text style={styles.emptyTitle}>No data yet</Text>
      <Text style={styles.emptySubtitle}>Log your first product to get started</Text>
    </Card>
  );
}

function ReactionChart({data}: {data: ChartDataPoint[]}) {
  // Show last 7 days for readability on mobile
  const last7 = data.slice(-7);
  const barData = last7.map(d => ({
    value: d.count,
    label: formatDate(d.date),
    frontColor: '#4A90D9',
  }));

  return (
    <Card>
      <SectionHeader title="Reaction Frequency (Last 7 Days)" />
      <BarChart
        data={barData}
        barWidth={28}
        spacing={12}
        roundedTop
        xAxisThickness={1}
        yAxisThickness={0}
        xAxisColor="#E0E0E0"
        yAxisTextStyle={styles.chartAxisText}
        xAxisLabelTextStyle={styles.chartAxisText}
        noOfSections={4}
        maxValue={Math.max(...last7.map(d => d.count), 4)}
        isAnimated
      />
    </Card>
  );
}

function TopProductsCard({products}: {products: TopProduct[]}) {
  return (
    <Card>
      <SectionHeader title="Top Products by Reactions" />
      {products.map((p, i) => (
        <View key={p.id} style={styles.listRow}>
          <Text style={styles.listRank}>{i + 1}.</Text>
          <Text style={styles.listName} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={styles.listCount}>{p.reaction_count}</Text>
        </View>
      ))}
    </Card>
  );
}

function TopSymptomsCard({symptoms}: {symptoms: TopSymptom[]}) {
  return (
    <Card>
      <SectionHeader title="Top Symptoms" />
      <View style={styles.pillRow}>
        {symptoms.map(s => (
          <View key={s.symptom} style={styles.pill}>
            <Text style={styles.pillText}>
              {s.symptom} · {s.count}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// DashboardScreen
// ---------------------------------------------------------------------------

export function DashboardScreen() {
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
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load dashboard. Pull to retry.</Text>
      </View>
    );
  }

  const hasData = data.timeline.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Dashboard</Text>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Timeline */}
          <SectionHeader title="Timeline" />
          <Card>
            <FlatList
              data={data.timeline}
              keyExtractor={item => item.id}
              renderItem={({item}) => <TimelineRow item={item} />}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </Card>

          {/* Reaction chart */}
          {data.reaction_chart.length > 0 && (
            <ReactionChart data={data.reaction_chart} />
          )}

          {/* Top products */}
          {data.top_products.length > 0 && (
            <TopProductsCard products={data.top_products} />
          )}

          {/* Top symptoms */}
          {data.top_symptoms.length > 0 && (
            <TopSymptomsCard symptoms={data.top_symptoms} />
          )}
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
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  // Timeline
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    fontSize: 11,
    color: '#9B9B9B',
    marginBottom: 2,
  },
  timelineName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A2E',
  },
  timelineSymptoms: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  // Chart
  chartAxisText: {
    fontSize: 10,
    color: '#9B9B9B',
  },
  // Top products list
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  listRank: {
    fontSize: 13,
    color: '#9B9B9B',
    width: 20,
  },
  listName: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A2E',
  },
  listCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E74C3C',
  },
  // Symptom pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: '#4A90D9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  // Error
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  // Empty state
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api} from '../../lib/api';
import {useAuthStore} from '../../store/authStore';
import {ReactionsStackParamList} from '../../navigation/RootNavigator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Reaction {
  id: string;
  reaction_date: string;
  severity: 'mild' | 'moderate' | 'severe';
  symptoms: string[];
  notes: string | null;
  product_ids: string[];
  created_at: string;
}

type Props = NativeStackScreenProps<ReactionsStackParamList, 'ReactionList'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<Reaction['severity'], string> = {
  mild: '#27AE60',
  moderate: '#F39C12',
  severe: '#E74C3C',
};

// ---------------------------------------------------------------------------
// ReactionListScreen
// ---------------------------------------------------------------------------

export function ReactionListScreen({navigation}: Props) {
  const userTier = useAuthStore(state => state.userTier);

  const {data: reactions, isLoading} = useQuery<Reaction[]>({
    queryKey: ['reactions'],
    queryFn: async () => {
      const res = await api.get<Reaction[]>('/reactions');
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

  const count = reactions?.length ?? 0;
  const isFree = userTier === 'free';

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Reactions</Text>

      {isFree && (
        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>{count}/20 reactions (Free tier)</Text>
        </View>
      )}

      <FlatList
        data={reactions}
        keyExtractor={item => item.id}
        contentContainerStyle={
          reactions?.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No reactions logged yet.</Text>
          </View>
        }
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.dateText}>{item.reaction_date}</Text>
              <View
                style={[
                  styles.severityBadge,
                  {backgroundColor: SEVERITY_COLORS[item.severity]},
                ]}>
                <Text style={styles.severityText}>{item.severity}</Text>
              </View>
            </View>
            {item.symptoms.length > 0 && (
              <View style={styles.symptomsRow}>
                {item.symptoms.map(symptom => (
                  <View key={symptom} style={styles.symptomChip}>
                    <Text style={styles.symptomChipText}>{symptom}</Text>
                  </View>
                ))}
              </View>
            )}
            {item.notes ? (
              <Text style={styles.notesText} numberOfLines={2}>
                {item.notes}
              </Text>
            ) : null}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddReaction')}
        activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tierBadge: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  tierBadgeText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  card: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  severityBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  symptomsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  symptomChip: {
    backgroundColor: '#E8F0FE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  symptomChipText: {
    color: '#4A90D9',
    fontSize: 12,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  separator: {
    height: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90D9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 32,
  },
});

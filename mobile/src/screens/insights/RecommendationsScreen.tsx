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
import {useNavigation} from '@react-navigation/native';
import {useAuthStore} from '../../store/authStore';
import {api} from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecommendedProduct {
  id: string;
  name: string;
  brand: string;
  ingredient_count: number;
}

// ---------------------------------------------------------------------------
// RecommendationsScreen
// ---------------------------------------------------------------------------

export function RecommendationsScreen() {
  const navigation = useNavigation();
  const userTier = useAuthStore(state => state.userTier);

  const {data, isLoading, isError, error} = useQuery<RecommendedProduct[]>({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const res = await api.get<RecommendedProduct[]>('/recommendations');
      return res.data;
    },
    enabled: userTier !== 'free',
  });

  const is400 =
    isError && (error as any)?.response?.status === 400;

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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (is400) {
    return (
      <View style={styles.centered}>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Run trigger analysis first to get recommendations.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        (!data || data.length === 0) && styles.centeredContent,
      ]}
      data={data ?? []}
      keyExtractor={item => item.id}
      renderItem={({item}) => <ProductCard product={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recommendations available.</Text>
        </View>
      }
    />
  );
}

// ---------------------------------------------------------------------------
// ProductCard
// ---------------------------------------------------------------------------

function ProductCard({product}: {product: RecommendedProduct}) {
  return (
    <View style={styles.card}>
      <Text style={styles.productName} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={styles.productBrand}>{product.brand}</Text>
      <Text style={styles.ingredientCount}>
        {product.ingredient_count} ingredients
      </Text>
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
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
  // Info card
  infoCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 14,
  },
  infoText: {
    color: '#92400E',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  // Product card
  card: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  ingredientCount: {
    fontSize: 12,
    color: '#9B9B9B',
  },
  separator: {
    height: 12,
  },
  // Empty state
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
});

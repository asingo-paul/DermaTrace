import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api} from '../../lib/api';
import {useAuthStore} from '../../store/authStore';
import {ProductsStackParamList} from '../../navigation/RootNavigator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  ingredients: string[];
  image_url: string | null;
  is_catalog: boolean;
  created_at: string;
}

type Props = NativeStackScreenProps<ProductsStackParamList, 'ProductList'>;

// ---------------------------------------------------------------------------
// ProductListScreen
// ---------------------------------------------------------------------------

export function ProductListScreen({navigation}: Props) {
  const queryClient = useQueryClient();
  const userTier = useAuthStore(state => state.userTier);

  const {data: products, isLoading} = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get<Product[]>('/products');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['products']});
    },
  });

  function confirmDelete(product: Product) {
    Alert.alert(
      'Delete Product',
      `Remove "${product.name}" from your list?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(product.id),
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

  const count = products?.length ?? 0;
  const isFree = userTier === 'free';

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Products</Text>

      {isFree && (
        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>{count}/10 products (Free tier)</Text>
        </View>
      )}

      <FlatList
        data={products}
        keyExtractor={item => item.id}
        contentContainerStyle={products?.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No products yet.</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first product.</Text>
          </View>
        }
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ProductDetail', {product: item})}
            onLongPress={() => confirmDelete(item)}
            activeOpacity={0.7}>
            <View style={styles.cardContent}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.brand ? (
                <Text style={styles.productBrand} numberOfLines={1}>
                  {item.brand}
                </Text>
              ) : null}
              <Text style={styles.ingredientCount}>
                {item.ingredients.length} ingredient{item.ingredients.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
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
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  productBrand: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  ingredientCount: {
    fontSize: 12,
    color: '#9B9B9B',
  },
  chevron: {
    fontSize: 22,
    color: '#9B9B9B',
    marginLeft: 8,
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

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api} from '../../lib/api';
import {ProductsStackParamList} from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<ProductsStackParamList, 'ProductDetail'>;

// ---------------------------------------------------------------------------
// ProductDetailScreen
// ---------------------------------------------------------------------------

export function ProductDetailScreen({route, navigation}: Props) {
  const {product} = route.params;
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/products/${product.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['products']});
      navigation.goBack();
    },
    onError: (error: any) => {
      if (error?.response?.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to delete this product.');
      } else {
        Alert.alert('Error', 'Failed to delete product. Please try again.');
      }
    },
  });

  function confirmDelete() {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Product image */}
      {product.image_url ? (
        <Image
          source={{uri: product.image_url}}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderIcon}>🧴</Text>
        </View>
      )}

      {/* Name & brand */}
      <Text style={styles.productName}>{product.name}</Text>
      {product.brand ? (
        <Text style={styles.productBrand}>{product.brand}</Text>
      ) : null}

      {/* Ingredients */}
      <Text style={styles.sectionHeader}>
        Ingredients ({product.ingredients.length})
      </Text>
      {product.ingredients.length > 0 ? (
        <View style={styles.pillRow}>
          {product.ingredients.map((ing, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>{ing}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noIngredients}>No ingredients recorded.</Text>
      )}

      {/* Delete button */}
      <TouchableOpacity
        style={[styles.deleteButton, deleteMutation.isPending && styles.deleteButtonDisabled]}
        onPress={confirmDelete}
        disabled={deleteMutation.isPending}
        activeOpacity={0.85}>
        <Text style={styles.deleteButtonText}>
          {deleteMutation.isPending ? 'Deleting…' : 'Delete Product'}
        </Text>
      </TouchableOpacity>
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
    paddingBottom: 40,
  },
  productImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 20,
    backgroundColor: '#F5F7FA',
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    backgroundColor: '#F5F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  imagePlaceholderIcon: {
    fontSize: 56,
  },
  productName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  productBrand: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  pill: {
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillText: {
    color: '#1A1A2E',
    fontSize: 13,
    fontWeight: '500',
  },
  noIngredients: {
    fontSize: 14,
    color: '#9B9B9B',
    marginBottom: 32,
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

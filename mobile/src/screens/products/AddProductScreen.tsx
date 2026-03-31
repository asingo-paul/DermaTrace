import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api} from '../../lib/api';
import {ProductsStackParamList} from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<ProductsStackParamList, 'AddProduct'>;

// ---------------------------------------------------------------------------
// AddProductScreen
// ---------------------------------------------------------------------------

export function AddProductScreen({navigation}: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [rawIngredients, setRawIngredients] = useState('');
  const [parsedIngredients, setParsedIngredients] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post('/products', {
        name: name.trim(),
        brand: brand.trim() || null,
        ingredients: parsedIngredients,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['products']});
      navigation.goBack();
    },
    onError: (error: any) => {
      if (error?.response?.status === 403) {
        Alert.alert(
          'Free Tier Limit Reached',
          "You've reached the free tier limit. Upgrade to Pro for unlimited products.",
        );
      } else {
        Alert.alert('Error', 'Failed to save product. Please try again.');
      }
    },
  });

  async function handleParse() {
    if (!rawIngredients.trim()) {
      Alert.alert('No ingredients', 'Please enter some ingredients text first.');
      return;
    }
    setIsParsing(true);
    try {
      const res = await api.post<{ingredients: string[]}>('/ingredients/parse', {
        text: rawIngredients,
      });
      setParsedIngredients(res.data.ingredients);
    } catch {
      Alert.alert('Parse failed', 'Could not parse ingredients. Please try again.');
    } finally {
      setIsParsing(false);
    }
  }

  function handleCamera() {
    Alert.alert('Camera', 'Camera coming soon');
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Required', 'Product name is required.');
      return;
    }
    saveMutation.mutate();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>Add Product</Text>

      {/* Name */}
      <Text style={styles.label}>
        Product Name <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. CeraVe Moisturizing Cream"
        placeholderTextColor="#9B9B9B"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />

      {/* Brand */}
      <Text style={styles.label}>Brand (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. CeraVe"
        placeholderTextColor="#9B9B9B"
        value={brand}
        onChangeText={setBrand}
        autoCapitalize="words"
      />

      {/* Ingredients */}
      <Text style={styles.label}>Ingredients</Text>
      <View style={styles.ingredientsRow}>
        <TextInput
          style={[styles.input, styles.ingredientsInput]}
          placeholder="Paste comma-separated ingredients from label..."
          placeholderTextColor="#9B9B9B"
          value={rawIngredients}
          onChangeText={setRawIngredients}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Parse + Camera buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, styles.parseButton]}
          onPress={handleParse}
          disabled={isParsing}
          activeOpacity={0.7}>
          {isParsing ? (
            <ActivityIndicator size="small" color="#4A90D9" />
          ) : (
            <Text style={styles.secondaryButtonText}>Parse from label</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, styles.cameraButton]}
          onPress={handleCamera}
          activeOpacity={0.7}>
          <Text style={styles.cameraIcon}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* Parsed ingredients display */}
      {parsedIngredients.length > 0 && (
        <View style={styles.parsedContainer}>
          <Text style={styles.parsedLabel}>
            Parsed ({parsedIngredients.length} ingredients)
          </Text>
          <View style={styles.pillRow}>
            {parsedIngredients.map((ing, i) => (
              <View key={i} style={styles.pill}>
                <Text style={styles.pillText}>{ing}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saveMutation.isPending}
        activeOpacity={0.85}>
        {saveMutation.isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save Product</Text>
        )}
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
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  required: {
    color: '#E74C3C',
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
    marginBottom: 16,
  },
  ingredientsRow: {
    marginBottom: 0,
  },
  ingredientsInput: {
    minHeight: 100,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#4A90D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parseButton: {
    flex: 1,
  },
  cameraButton: {
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#4A90D9',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraIcon: {
    fontSize: 20,
  },
  parsedContainer: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  parsedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    backgroundColor: '#4A90D9',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

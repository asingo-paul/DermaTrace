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
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api} from '../../lib/api';
import {ReactionsStackParamList} from '../../navigation/RootNavigator';
import {Product} from '../products/ProductListScreen';

type Props = NativeStackScreenProps<ReactionsStackParamList, 'AddReaction'>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_OPTIONS = ['mild', 'moderate', 'severe'] as const;
type Severity = (typeof SEVERITY_OPTIONS)[number];

const SEVERITY_COLORS: Record<Severity, string> = {
  mild: '#27AE60',
  moderate: '#F39C12',
  severe: '#E74C3C',
};

const SYMPTOM_OPTIONS = [
  'rash',
  'itching',
  'acne',
  'swelling',
  'redness',
  'dryness',
  'burning',
  'hives',
];

// ---------------------------------------------------------------------------
// AddReactionScreen
// ---------------------------------------------------------------------------

export function AddReactionScreen({navigation}: Props) {
  const queryClient = useQueryClient();

  const [reactionDate, setReactionDate] = useState('');
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  const {data: products} = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get<Product[]>('/products');
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post('/reactions', {
        reaction_date: reactionDate.trim(),
        severity,
        symptoms: Array.from(selectedSymptoms),
        product_ids: Array.from(selectedProducts),
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['reactions']});
      queryClient.invalidateQueries({queryKey: ['dashboard']});
      navigation.goBack();
    },
    onError: (error: any) => {
      if (error?.response?.status === 403) {
        Alert.alert(
          'Free Tier Limit',
          "You've reached the free tier limit. Upgrade to Pro.",
        );
      } else {
        Alert.alert('Error', 'Failed to log reaction. Please try again.');
      }
    },
  });

  function toggleSymptom(symptom: string) {
    setSelectedSymptoms(prev => {
      const next = new Set(prev);
      next.has(symptom) ? next.delete(symptom) : next.add(symptom);
      return next;
    });
  }

  function toggleProduct(id: string) {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSave() {
    if (!reactionDate.trim()) {
      Alert.alert('Required', 'Please enter a reaction date.');
      return;
    }
    if (!severity) {
      Alert.alert('Required', 'Please select a severity level.');
      return;
    }
    saveMutation.mutate();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>Log Reaction</Text>

      {/* Date */}
      <Text style={styles.label}>
        Date <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9B9B9B"
        value={reactionDate}
        onChangeText={setReactionDate}
        keyboardType="numbers-and-punctuation"
      />

      {/* Severity */}
      <Text style={styles.label}>
        Severity <Text style={styles.required}>*</Text>
      </Text>
      <View style={styles.severityRow}>
        {SEVERITY_OPTIONS.map(level => {
          const isSelected = severity === level;
          return (
            <TouchableOpacity
              key={level}
              style={[
                styles.severityButton,
                isSelected && {
                  backgroundColor: SEVERITY_COLORS[level],
                  borderColor: SEVERITY_COLORS[level],
                },
              ]}
              onPress={() => setSeverity(level)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.severityButtonText,
                  isSelected && styles.severityButtonTextSelected,
                ]}>
                {level}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Symptoms */}
      <Text style={styles.label}>Symptoms</Text>
      <View style={styles.chipGrid}>
        {SYMPTOM_OPTIONS.map(symptom => {
          const isSelected = selectedSymptoms.has(symptom);
          return (
            <TouchableOpacity
              key={symptom}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleSymptom(symptom)}
              activeOpacity={0.7}>
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {symptom}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Products */}
      {products && products.length > 0 && (
        <>
          <Text style={styles.label}>Products involved</Text>
          <View style={styles.productList}>
            {products.map(product => {
              const isSelected = selectedProducts.has(product.id);
              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productRow}
                  onPress={() => toggleProduct(product.id)}
                  activeOpacity={0.7}>
                  <View
                    style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Notes */}
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Any additional observations..."
        placeholderTextColor="#9B9B9B"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saveMutation.isPending}
        activeOpacity={0.85}>
        {saveMutation.isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Log Reaction</Text>
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
  notesInput: {
    minHeight: 100,
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  severityButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F5F7FA',
  },
  severityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  severityButtonTextSelected: {
    color: '#FFFFFF',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F5F7FA',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  chipSelected: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  productList: {
    marginBottom: 20,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  productName: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A2E',
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

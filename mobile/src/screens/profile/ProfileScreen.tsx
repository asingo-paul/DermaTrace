import React, {useState, useEffect} from 'react';
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
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import * as Keychain from 'react-native-keychain';
import {api} from '../../lib/api';
import {useAuthStore} from '../../store/authStore';
import {ProfileStackParamList} from '../../navigation/RootNavigator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SkinType = 'normal' | 'dry' | 'oily' | 'combination' | 'sensitive';
type SensitivityLevel = 'low' | 'medium' | 'high';

interface ProfileData {
  skin_type: SkinType | null;
  known_allergies: string | null;
  sensitivity_level: SensitivityLevel | null;
}

interface ValidationErrors {
  skin_type?: string;
  known_allergies?: string;
  sensitivity_level?: string;
}

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

// ---------------------------------------------------------------------------
// Option selectors
// ---------------------------------------------------------------------------

const SKIN_TYPES: SkinType[] = ['normal', 'dry', 'oily', 'combination', 'sensitive'];
const SENSITIVITY_LEVELS: SensitivityLevel[] = ['low', 'medium', 'high'];

function OptionSelector<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: T[];
  value: T | null;
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.optionBtn, value === opt && styles.optionBtnActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}>
            <Text
              style={[styles.optionBtnText, value === opt && styles.optionBtnTextActive]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ProfileScreen
// ---------------------------------------------------------------------------

export function ProfileScreen({navigation}: Props) {
  const queryClient = useQueryClient();
  const clearToken = useAuthStore(state => state.clearToken);

  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [allergies, setAllergies] = useState('');
  const [sensitivity, setSensitivity] = useState<SensitivityLevel | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});

  const {data, isLoading} = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<ProfileData>('/profile');
      return res.data;
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (data) {
      setSkinType(data.skin_type);
      setAllergies(data.known_allergies ?? '');
      setSensitivity(data.sensitivity_level);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: ProfileData) => api.put('/profile', payload),
    onSuccess: () => {
      setFieldErrors({});
      queryClient.invalidateQueries({queryKey: ['profile']});
      Alert.alert('Saved', 'Your profile has been updated.');
    },
    onError: (err: any) => {
      if (err?.response?.status === 422) {
        const detail = err.response.data?.detail;
        if (Array.isArray(detail)) {
          const errs: ValidationErrors = {};
          detail.forEach((d: {loc: string[]; msg: string}) => {
            const field = d.loc[d.loc.length - 1] as keyof ValidationErrors;
            errs[field] = d.msg;
          });
          setFieldErrors(errs);
        } else {
          Alert.alert('Validation Error', String(detail ?? 'Invalid input'));
        }
      } else {
        Alert.alert('Error', 'Failed to save profile. Please try again.');
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: async () => {
      await Keychain.resetGenericPassword();
      clearToken();
    },
  });

  function handleSave() {
    saveMutation.mutate({
      skin_type: skinType,
      known_allergies: allergies.trim() || null,
      sensitivity_level: sensitivity,
    });
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => logoutMutation.mutate(),
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Profile</Text>

      <OptionSelector
        label="Skin Type"
        options={SKIN_TYPES}
        value={skinType}
        onChange={setSkinType}
        error={fieldErrors.skin_type}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Known Allergies</Text>
        <TextInput
          style={[styles.textInput, fieldErrors.known_allergies ? styles.inputError : null]}
          value={allergies}
          onChangeText={setAllergies}
          placeholder="e.g. fragrance, lanolin, nickel"
          placeholderTextColor="#9B9B9B"
          multiline
          numberOfLines={3}
        />
        {fieldErrors.known_allergies ? (
          <Text style={styles.errorText}>{fieldErrors.known_allergies}</Text>
        ) : null}
      </View>

      <OptionSelector
        label="Sensitivity Level"
        options={SENSITIVITY_LEVELS}
        value={sensitivity}
        onChange={setSensitivity}
        error={fieldErrors.sensitivity_level}
      />

      <TouchableOpacity
        style={[styles.saveBtn, saveMutation.isPending && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saveMutation.isPending}
        activeOpacity={0.8}>
        {saveMutation.isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveBtnText}>Save</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.subscriptionBtn}
        onPress={() => navigation.navigate('Subscription')}
        activeOpacity={0.8}>
        <Text style={styles.subscriptionBtnText}>Manage Subscription</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        disabled={logoutMutation.isPending}
        activeOpacity={0.8}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
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
  screenTitle: {fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 24},
  fieldGroup: {marginBottom: 20},
  label: {fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8},
  optionRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F5F7FA',
  },
  optionBtnActive: {borderColor: '#4A90D9', backgroundColor: '#4A90D9'},
  optionBtnText: {fontSize: 14, color: '#6B7280', fontWeight: '500'},
  optionBtnTextActive: {color: '#FFFFFF'},
  textInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 14,
    color: '#1A1A2E',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {borderColor: '#E74C3C'},
  errorText: {fontSize: 12, color: '#E74C3C', marginTop: 4},
  saveBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  btnDisabled: {opacity: 0.6},
  saveBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  subscriptionBtn: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  subscriptionBtnText: {color: '#4A90D9', fontSize: 16, fontWeight: '600'},
  logoutBtn: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  logoutBtnText: {color: '#E74C3C', fontSize: 16, fontWeight: '600'},
});

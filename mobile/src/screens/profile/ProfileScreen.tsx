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
  StatusBar,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import * as Keychain from 'react-native-keychain';
import {api} from '../../lib/api';
import {useAuthStore} from '../../store/authStore';
import {ProfileStackParamList} from '../../navigation/RootNavigator';

type SkinType = 'normal' | 'dry' | 'oily' | 'combination' | 'sensitive';
type SensitivityLevel = 'low' | 'medium' | 'high';

interface ProfileData {
  email?: string;
  skin_type: SkinType | null;
  known_allergies: string | null;
  sensitivity_level: SensitivityLevel | null;
}

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

const SKIN_TYPES: SkinType[] = ['normal', 'dry', 'oily', 'combination', 'sensitive'];
const SENSITIVITY_LEVELS: SensitivityLevel[] = ['low', 'medium', 'high'];

function SectionHeader({title}: {title: string}) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

export function ProfileScreen({navigation}: Props) {
  const queryClient = useQueryClient();
  const {clearToken, setToken} = useAuthStore();

  // Skin profile state
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [allergies, setAllergies] = useState('');
  const [sensitivity, setSensitivity] = useState<SensitivityLevel | null>(null);

  // Account state
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const {data, isLoading} = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get<ProfileData>('/profile');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      setSkinType(data.skin_type);
      setAllergies(data.known_allergies ?? '');
      setSensitivity(data.sensitivity_level);
      if (data.email) setNewEmail(data.email);
    }
  }, [data]);

  const saveProfileMutation = useMutation({
    mutationFn: () =>
      api.put('/profile', {
        skin_type: skinType,
        known_allergies: allergies.trim() || null,
        sensitivity_level: sensitivity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['profile']});
      Alert.alert('Saved', 'Skin profile updated.');
    },
    onError: () => Alert.alert('Error', 'Failed to save profile.'),
  });

  const changeEmailMutation = useMutation({
    mutationFn: () =>
      api.put('/auth/change-email', {
        new_email: newEmail.trim(),
        current_password: emailPassword,
      }),
    onSuccess: async (res: any) => {
      const {access_token, token_type} = res.data;
      await Keychain.setGenericPassword(
        useAuthStore.getState().userTier ?? 'free',
        access_token,
      );
      setToken(access_token, useAuthStore.getState().userTier ?? 'free');
      setEmailPassword('');
      queryClient.invalidateQueries({queryKey: ['profile']});
      Alert.alert('Done', 'Email address updated.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Failed to update email.';
      Alert.alert('Error', msg);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      api.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Done', 'Password updated successfully.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail ?? 'Failed to update password.';
      Alert.alert('Error', msg);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: async () => {
      await Keychain.resetGenericPassword();
      clearToken();
    },
  });

  function handleChangeEmail() {
    if (!newEmail.trim()) return Alert.alert('Required', 'Enter a new email address.');
    if (!emailPassword) return Alert.alert('Required', 'Enter your current password to confirm.');
    changeEmailMutation.mutate();
  }

  function handleChangePassword() {
    if (!currentPassword) return Alert.alert('Required', 'Enter your current password.');
    if (newPassword.length < 8) return Alert.alert('Too short', 'New password must be at least 8 characters.');
    changePasswordMutation.mutate();
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Log Out', style: 'destructive', onPress: () => logoutMutation.mutate()},
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A6FD4" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Account info header */}
      <View style={styles.accountHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(data?.email ?? 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.accountEmail}>{data?.email ?? ''}</Text>
          <Text style={styles.accountTier}>
            {useAuthStore.getState().userTier === 'pro'
              ? 'Pro Plan'
              : useAuthStore.getState().userTier === 'trial'
              ? '14-day Trial'
              : 'Free Plan'}
          </Text>
        </View>
      </View>

      <Divider />

      {/* Skin Profile */}
      <SectionHeader title="Skin Profile" />

      <Text style={styles.fieldLabel}>Skin Type</Text>
      <View style={styles.chipRow}>
        {SKIN_TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, skinType === t && styles.chipActive]}
            onPress={() => setSkinType(t)}
            activeOpacity={0.7}>
            <Text style={[styles.chipText, skinType === t && styles.chipTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 16}]}>Sensitivity Level</Text>
      <View style={styles.chipRow}>
        {SENSITIVITY_LEVELS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, sensitivity === s && styles.chipActive]}
            onPress={() => setSensitivity(s)}
            activeOpacity={0.7}>
            <Text style={[styles.chipText, sensitivity === s && styles.chipTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 16}]}>Known Allergies</Text>
      <TextInput
        style={styles.textArea}
        value={allergies}
        onChangeText={setAllergies}
        placeholder="e.g. fragrance, lanolin, nickel sulfate"
        placeholderTextColor="#94A3B8"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.primaryBtn, saveProfileMutation.isPending && styles.btnDisabled]}
        onPress={() => saveProfileMutation.mutate()}
        disabled={saveProfileMutation.isPending}
        activeOpacity={0.85}>
        {saveProfileMutation.isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryBtnText}>Save Skin Profile</Text>
        )}
      </TouchableOpacity>

      <Divider />

      {/* Change Email */}
      <SectionHeader title="Change Email" />

      <Text style={styles.fieldLabel}>New Email Address</Text>
      <TextInput
        style={styles.input}
        value={newEmail}
        onChangeText={setNewEmail}
        placeholder="new@example.com"
        placeholderTextColor="#94A3B8"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={[styles.fieldLabel, {marginTop: 12}]}>Current Password</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          value={emailPassword}
          onChangeText={setEmailPassword}
          placeholder="Confirm with your password"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!showEmailPassword}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setShowEmailPassword(v => !v)}>
          <Text style={styles.eyeText}>{showEmailPassword ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.outlineBtn, changeEmailMutation.isPending && styles.btnDisabled]}
        onPress={handleChangeEmail}
        disabled={changeEmailMutation.isPending}
        activeOpacity={0.85}>
        {changeEmailMutation.isPending ? (
          <ActivityIndicator color="#1A6FD4" />
        ) : (
          <Text style={styles.outlineBtnText}>Update Email</Text>
        )}
      </TouchableOpacity>

      <Divider />

      {/* Change Password */}
      <SectionHeader title="Change Password" />

      <Text style={styles.fieldLabel}>Current Password</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!showCurrentPw}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setShowCurrentPw(v => !v)}>
          <Text style={styles.eyeText}>{showCurrentPw ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.fieldLabel, {marginTop: 12}]}>New Password</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Min. 8 characters"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!showNewPw}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setShowNewPw(v => !v)}>
          <Text style={styles.eyeText}>{showNewPw ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.outlineBtn, changePasswordMutation.isPending && styles.btnDisabled]}
        onPress={handleChangePassword}
        disabled={changePasswordMutation.isPending}
        activeOpacity={0.85}>
        {changePasswordMutation.isPending ? (
          <ActivityIndicator color="#1A6FD4" />
        ) : (
          <Text style={styles.outlineBtnText}>Update Password</Text>
        )}
      </TouchableOpacity>

      <Divider />

      {/* Account actions */}
      <SectionHeader title="Account" />

      <TouchableOpacity
        style={styles.menuRow}
        onPress={() => navigation.navigate('Subscription')}
        activeOpacity={0.7}>
        <Text style={styles.menuRowText}>Manage Subscription</Text>
        <Text style={styles.menuRowChevron}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuRow, styles.menuRowDanger]}
        onPress={handleLogout}
        disabled={logoutMutation.isPending}
        activeOpacity={0.7}>
        <Text style={styles.menuRowDangerText}>
          {logoutMutation.isPending ? 'Signing out…' : 'Sign Out'}
        </Text>
      </TouchableOpacity>

      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  content: {paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},

  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A6FD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: 22, fontWeight: '700', color: '#FFFFFF'},
  accountEmail: {fontSize: 15, fontWeight: '600', color: '#0F172A'},
  accountTier: {fontSize: 13, color: '#64748B', marginTop: 2},

  divider: {height: 1, backgroundColor: '#F1F5F9', marginVertical: 24},

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipActive: {borderColor: '#1A6FD4', backgroundColor: '#EFF6FF'},
  chipText: {fontSize: 13, color: '#64748B', fontWeight: '500'},
  chipTextActive: {color: '#1A6FD4', fontWeight: '600'},

  textArea: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    backgroundColor: '#F8FAFC',
  },

  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    height: 50,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
  },
  eyeBtn: {paddingHorizontal: 14, height: '100%', justifyContent: 'center'},
  eyeText: {fontSize: 13, color: '#1A6FD4', fontWeight: '500'},

  primaryBtn: {
    backgroundColor: '#1A6FD4',
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryBtnText: {color: '#FFFFFF', fontSize: 15, fontWeight: '600'},

  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#1A6FD4',
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  outlineBtnText: {color: '#1A6FD4', fontSize: 15, fontWeight: '600'},

  btnDisabled: {opacity: 0.5},

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuRowText: {fontSize: 15, color: '#0F172A', fontWeight: '500'},
  menuRowChevron: {fontSize: 20, color: '#94A3B8'},
  menuRowDanger: {borderBottomWidth: 0, marginTop: 8},
  menuRowDangerText: {fontSize: 15, color: '#EF4444', fontWeight: '500'},
});

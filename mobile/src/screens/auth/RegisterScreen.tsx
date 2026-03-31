import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import * as Keychain from 'react-native-keychain';
import {api} from '../../lib/api';
import {useAuthStore} from '../../store/authStore';
import type {AuthStackParamList} from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({navigation}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setToken = useAuthStore(state => state.setToken);

  const handleCreateAccount = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {email, password});
      const {access_token, tier} = response.data;
      await Keychain.setGenericPassword(tier ?? 'trial', access_token);
      setToken(access_token, tier ?? 'trial');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        setError('Email already registered');
      } else if (status === 422) {
        const detail = err?.response?.data?.detail;
        if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError('Please check your email and password');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start tracking with DermaTrace</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9B9B9B"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9B9B9B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateAccount}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#9B9B9B',
    marginBottom: 24,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#FDF0EF',
    padding: 10,
    borderRadius: 8,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333333',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8F4FD',
  },
  button: {
    backgroundColor: '#4A90D9',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#9B9B9B',
  },
  linkHighlight: {
    color: '#4A90D9',
    fontWeight: '600',
  },
});

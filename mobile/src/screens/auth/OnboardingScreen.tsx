import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {AuthStackParamList} from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const FEATURES = [
  {icon: '📦', label: 'Log products'},
  {icon: '⚠️', label: 'Track reactions'},
  {icon: '🧠', label: 'AI-powered insights'},
];

export function OnboardingScreen({navigation}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>DT</Text>
        </View>

        {/* App name */}
        <Text style={styles.appName}>DermaTrace</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Track your skin. Know your triggers.</Text>

        {/* Feature bullets */}
        <View style={styles.featuresContainer}>
          {FEATURES.map(feature => (
            <View key={feature.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTAs */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4A90D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#4A90D9',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#333333',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  featuresContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureLabel: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#4A90D9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4A90D9',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  linkContainer: {
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

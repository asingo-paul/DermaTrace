import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import {QueryClientProvider} from '@tanstack/react-query';
import {StripeProvider} from '@stripe/stripe-react-native';
import * as Keychain from 'react-native-keychain';
import {queryClient} from './lib/queryClient';
import {useAuthStore} from './store/authStore';
import {RootNavigator} from './navigation/RootNavigator';

const STRIPE_PUBLISHABLE_KEY =
  (process.env.STRIPE_PUBLISHABLE_KEY as string) ?? '';

function SplashScreen({onDone}: {onDone: () => void}) {
  const opacity = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(onDone);
    }, 800);
    return () => clearTimeout(timer);
  }, [opacity, onDone]);

  return (
    <Animated.View style={[styles.splash, {opacity}]}>
      <View style={styles.splashLogo}>
        <Text style={styles.splashLogoText}>DT</Text>
      </View>
      <Text style={styles.splashName}>DermaTrace</Text>
    </Animated.View>
  );
}

export default function App() {
  const setToken = useAuthStore(state => state.setToken);
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          setToken(credentials.password, credentials.username);
        }
      } catch {
        // no stored credentials
      } finally {
        setReady(true);
      }
    })();
  }, [setToken]);

  if (showSplash || !ready) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <RootNavigator />
      </StripeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  splashLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#1A6FD4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  splashName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
});

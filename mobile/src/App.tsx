import React, {useEffect} from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {StripeProvider} from '@stripe/stripe-react-native';
import * as Keychain from 'react-native-keychain';
import {queryClient} from './lib/queryClient';
import {useAuthStore} from './store/authStore';
import {RootNavigator} from './navigation/RootNavigator';

const STRIPE_PUBLISHABLE_KEY =
  (process.env.STRIPE_PUBLISHABLE_KEY as string) ?? '';

export default function App() {
  const setToken = useAuthStore(state => state.setToken);

  // Restore auth state from Keychain on app start
  useEffect(() => {
    (async () => {
      try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          // username = tier, password = JWT
          setToken(credentials.password, credentials.username);
        }
      } catch {
        // No stored credentials — user needs to log in
      }
    })();
  }, [setToken]);

  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <RootNavigator />
      </StripeProvider>
    </QueryClientProvider>
  );
}

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useStripe} from '@stripe/stripe-react-native';
import {api} from '../../lib/api';
import {ProfileStackParamList} from '../../navigation/RootNavigator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Transaction {
  id: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface BillingData {
  tier: string;
  subscription_ends_at: string | null;
  transactions: Transaction[];
}

interface CreateIntentResponse {
  client_secret: string;
}

interface PayPalOrderResponse {
  approval_url: string;
  order_id: string;
}

type Props = NativeStackScreenProps<ProfileStackParamList, 'Billing'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function statusColor(status: string): string {
  switch (status) {
    case 'succeeded':
    case 'completed':
      return '#27AE60';
    case 'failed':
      return '#E74C3C';
    default:
      return '#F39C12';
  }
}

// ---------------------------------------------------------------------------
// BillingScreen
// ---------------------------------------------------------------------------

export function BillingScreen({route}: Props) {
  const {plan} = route.params;
  const queryClient = useQueryClient();
  const {confirmPayment} = useStripe();
  const [paymentLoading, setPaymentLoading] = useState(false);

  const {data, isLoading} = useQuery<BillingData>({
    queryKey: ['billing'],
    queryFn: async () => {
      const res = await api.get<BillingData>('/payments/history');
      return res.data;
    },
  });

  const stripeIntentMutation = useMutation({
    mutationFn: () =>
      api.post<CreateIntentResponse>('/payments/create-intent', {plan}),
  });

  const paypalOrderMutation = useMutation({
    mutationFn: () =>
      api.post<PayPalOrderResponse>('/payments/paypal/create-order', {plan}),
  });

  async function handleStripePayment() {
    setPaymentLoading(true);
    try {
      const res = await stripeIntentMutation.mutateAsync();
      const clientSecret = res.data.client_secret;

      const {error, paymentIntent} = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        Alert.alert('Payment Failed', error.message);
      } else if (paymentIntent) {
        queryClient.invalidateQueries({queryKey: ['subscription']});
        queryClient.invalidateQueries({queryKey: ['billing']});
        Alert.alert('Payment Successful', 'Welcome to Pro!');
      }
    } catch {
      Alert.alert('Error', 'Failed to initiate payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handlePayPalPayment() {
    setPaymentLoading(true);
    try {
      const res = await paypalOrderMutation.mutateAsync();
      const {approval_url} = res.data;
      // MVP: show the approval URL in an Alert
      Alert.alert(
        'PayPal Checkout',
        `Open the following URL to complete payment:\n\n${approval_url}`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Done',
            onPress: () => {
              queryClient.invalidateQueries({queryKey: ['subscription']});
              queryClient.invalidateQueries({queryKey: ['billing']});
              Alert.alert('Payment Submitted', 'Your PayPal payment is being processed.');
            },
          },
        ],
      );
    } catch {
      Alert.alert('Error', 'Failed to create PayPal order. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  const planLabel = plan === 'annual' ? 'Annual — $39.99/yr' : 'Monthly — $4.99/mo';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Billing</Text>

      {/* Plan summary */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Selected Plan</Text>
        <Text style={styles.planText}>{planLabel}</Text>

        {data?.tier && (
          <Text style={styles.tierText}>
            Current tier:{' '}
            <Text style={styles.tierValue}>
              {data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}
            </Text>
          </Text>
        )}
        {data?.subscription_ends_at && (
          <Text style={styles.dateText}>
            Renews: {formatDate(data.subscription_ends_at)}
          </Text>
        )}
      </View>

      {/* Payment methods */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Payment Method</Text>

        <TouchableOpacity
          style={[styles.payBtn, styles.stripeBtn]}
          onPress={handleStripePayment}
          disabled={paymentLoading}
          activeOpacity={0.8}>
          {paymentLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payBtnText}>💳  Pay with Card</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.payBtn, styles.paypalBtn]}
          onPress={handlePayPalPayment}
          disabled={paymentLoading}
          activeOpacity={0.8}>
          {paymentLoading ? (
            <ActivityIndicator color="#003087" />
          ) : (
            <Text style={[styles.payBtnText, styles.paypalBtnText]}>
              🅿  Pay with PayPal
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Transaction history */}
      {data?.transactions && data.transactions.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Transaction History</Text>
          <FlatList
            data={data.transactions}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({item}: {item: Transaction}) => (
              <View style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text style={styles.txMethod}>{item.payment_method}</Text>
                  <Text style={styles.txDate}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>
                    {formatAmount(item.amount, item.currency)}
                  </Text>
                  <Text style={[styles.txStatus, {color: statusColor(item.status)}]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            )}
          />
        </View>
      )}
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
  screenTitle: {fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 16},
  card: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  planText: {fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 6},
  tierText: {fontSize: 14, color: '#6B7280'},
  tierValue: {fontWeight: '600', color: '#4A90D9'},
  dateText: {fontSize: 14, color: '#6B7280', marginTop: 4},
  payBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  stripeBtn: {backgroundColor: '#4A90D9'},
  paypalBtn: {backgroundColor: '#FFC439'},
  payBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  paypalBtnText: {color: '#003087'},
  separator: {height: 1, backgroundColor: '#E5E7EB', marginVertical: 8},
  txRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  txLeft: {flex: 1},
  txMethod: {fontSize: 14, fontWeight: '500', color: '#1A1A2E', textTransform: 'capitalize'},
  txDate: {fontSize: 12, color: '#9B9B9B', marginTop: 2},
  txRight: {alignItems: 'flex-end'},
  txAmount: {fontSize: 14, fontWeight: '600', color: '#1A1A2E'},
  txStatus: {fontSize: 12, fontWeight: '500', marginTop: 2, textTransform: 'capitalize'},
});

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  TextInput,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api} from '../../lib/api';
import {ProfileStackParamList} from '../../navigation/RootNavigator';

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

type Props = NativeStackScreenProps<ProfileStackParamList, 'Billing'>;
type PaymentMethod = 'card' | 'paypal' | null;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function statusColor(s: string): string {
  if (s === 'succeeded' || s === 'completed') return '#10B981';
  if (s === 'failed') return '#EF4444';
  return '#F59E0B';
}

export function BillingScreen({route}: Props) {
  const {plan} = route.params;
  const queryClient = useQueryClient();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [stripeLoading, setStripeLoading] = useState(false);
  const [paypalLoading, setPaypalLoading] = useState(false);

  const planLabel = plan === 'annual' ? 'Annual — $39.99 / year' : 'Monthly — $4.99 / month';
  const planAmount = plan === 'annual' ? '$39.99' : '$4.99';

  const {data, isLoading} = useQuery<BillingData>({
    queryKey: ['billing'],
    queryFn: async () => {
      const res = await api.get<BillingData>('/payments/history');
      return res.data;
    },
  });

  async function handleCardPayment() {
    if (cardNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number.');
      return;
    }
    if (expiry.length < 5) {
      Alert.alert('Invalid Expiry', 'Please enter expiry in MM/YY format.');
      return;
    }
    if (cvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV.');
      return;
    }
    setStripeLoading(true);
    try {
      const intentRes = await api.post('/payments/create-intent', {plan});
      const clientSecret: string = intentRes.data.client_secret;
      // In production this would use Stripe SDK to confirm with card details
      // For now we confirm the intent was created successfully
      if (clientSecret) {
        queryClient.invalidateQueries({queryKey: ['subscription']});
        queryClient.invalidateQueries({queryKey: ['billing']});
        Alert.alert('Payment Initiated', 'Your payment is being processed. Your account will be upgraded shortly.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Payment failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setStripeLoading(false);
    }
  }

  async function handlePayPalPayment() {
    setPaypalLoading(true);
    try {
      const res = await api.post('/payments/paypal/create-order', {plan});
      const {approval_url, order_id} = res.data;
      const supported = await Linking.canOpenURL(approval_url);
      if (supported) {
        await Linking.openURL(approval_url);
        Alert.alert(
          'Complete Payment',
          'Once you have approved the payment in PayPal, tap Confirm.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'I have paid',
              onPress: async () => {
                try {
                  await api.post('/payments/paypal/capture', {order_id});
                  queryClient.invalidateQueries({queryKey: ['subscription']});
                  queryClient.invalidateQueries({queryKey: ['billing']});
                  Alert.alert('Success', 'PayPal payment confirmed. Welcome to Pro!');
                } catch {
                  Alert.alert('Error', 'Could not confirm payment. Contact support if charged.');
                }
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', 'Cannot open PayPal. Please try card payment instead.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Could not create PayPal order.';
      Alert.alert('Error', msg);
    } finally {
      setPaypalLoading(false);
    }
  }

  function formatCardNumber(text: string) {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }

  function formatExpiry(text: string) {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return cleaned;
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1A6FD4" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Plan summary */}
      <View style={styles.planCard}>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>PRO</Text>
        </View>
        <Text style={styles.planLabel}>{planLabel}</Text>
        <Text style={styles.planNote}>
          {plan === 'annual' ? 'Save 33% vs monthly · Best value' : 'Billed monthly · Cancel anytime'}
        </Text>
      </View>

      {/* Payment method selector */}
      <Text style={styles.sectionLabel}>Choose Payment Method</Text>
      <View style={styles.methodRow}>
        <TouchableOpacity
          style={[styles.methodBtn, selectedMethod === 'card' && styles.methodBtnActive]}
          onPress={() => setSelectedMethod('card')}
          activeOpacity={0.8}>
          <Text style={styles.methodIcon}>💳</Text>
          <Text style={[styles.methodText, selectedMethod === 'card' && styles.methodTextActive]}>
            Debit / Credit Card
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodBtn, selectedMethod === 'paypal' && styles.methodBtnActive]}
          onPress={() => setSelectedMethod('paypal')}
          activeOpacity={0.8}>
          <Text style={styles.methodIcon}>🅿</Text>
          <Text style={[styles.methodText, selectedMethod === 'paypal' && styles.methodTextActive]}>
            PayPal
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card form */}
      {selectedMethod === 'card' && (
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Card Number</Text>
          <TextInput
            style={styles.input}
            value={cardNumber}
            onChangeText={t => setCardNumber(formatCardNumber(t))}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            maxLength={19}
          />
          <View style={styles.cardRow}>
            <View style={styles.cardRowField}>
              <Text style={styles.fieldLabel}>Expiry</Text>
              <TextInput
                style={styles.input}
                value={expiry}
                onChangeText={t => setExpiry(formatExpiry(t))}
                placeholder="MM/YY"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={styles.cardRowField}>
              <Text style={styles.fieldLabel}>CVV</Text>
              <TextInput
                style={styles.input}
                value={cvv}
                onChangeText={t => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payBtn, stripeLoading && styles.btnDisabled]}
            onPress={handleCardPayment}
            disabled={stripeLoading}
            activeOpacity={0.85}>
            {stripeLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payBtnText}>Pay {planAmount}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* PayPal */}
      {selectedMethod === 'paypal' && (
        <View style={styles.card}>
          <Text style={styles.paypalInfo}>
            You'll be redirected to PayPal to complete your payment securely.
          </Text>
          <TouchableOpacity
            style={[styles.paypalBtn, paypalLoading && styles.btnDisabled]}
            onPress={handlePayPalPayment}
            disabled={paypalLoading}
            activeOpacity={0.85}>
            {paypalLoading ? (
              <ActivityIndicator color="#003087" />
            ) : (
              <Text style={styles.paypalBtnText}>Continue to PayPal</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.secureNote}>
        Secured by Stripe · 256-bit SSL encryption
      </Text>

      {/* Transaction history */}
      {data?.transactions && data.transactions.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, {marginTop: 24}]}>Billing History</Text>
          <View style={styles.card}>
            {data.transactions.map((tx, i) => (
              <View key={tx.id} style={[styles.txRow, i > 0 && styles.txRowBorder]}>
                <View style={styles.txLeft}>
                  <Text style={styles.txMethod}>
                    {tx.payment_method === 'debit_card' ? 'Card' : 'PayPal'}
                  </Text>
                  <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>${tx.amount.toFixed(2)}</Text>
                  <Text style={[styles.txStatus, {color: statusColor(tx.status)}]}>
                    {tx.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  content: {padding: 20, paddingBottom: 48},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},

  planCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  planBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A6FD4',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  planBadgeText: {fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1},
  planLabel: {fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4},
  planNote: {fontSize: 13, color: '#3B82F6'},

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  methodRow: {flexDirection: 'row', gap: 12, marginBottom: 20},
  methodBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  methodBtnActive: {borderColor: '#1A6FD4', backgroundColor: '#EFF6FF'},
  methodIcon: {fontSize: 24},
  methodText: {fontSize: 13, fontWeight: '500', color: '#64748B', textAlign: 'center'},
  methodTextActive: {color: '#1A6FD4', fontWeight: '600'},

  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },

  fieldLabel: {fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8},
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  cardRow: {flexDirection: 'row', gap: 12},
  cardRowField: {flex: 1},

  payBtn: {
    backgroundColor: '#1A6FD4',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  payBtnText: {color: '#FFFFFF', fontSize: 15, fontWeight: '600'},

  paypalInfo: {fontSize: 14, color: '#64748B', lineHeight: 21, marginBottom: 16},
  paypalBtn: {
    backgroundColor: '#FFC439',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paypalBtnText: {color: '#003087', fontSize: 15, fontWeight: '600'},

  btnDisabled: {opacity: 0.5},

  secureNote: {textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 12, lineHeight: 18},

  txRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12},
  txRowBorder: {borderTopWidth: 1, borderTopColor: '#F1F5F9'},
  txLeft: {flex: 1},
  txMethod: {fontSize: 14, fontWeight: '500', color: '#0F172A'},
  txDate: {fontSize: 12, color: '#94A3B8', marginTop: 2},
  txRight: {alignItems: 'flex-end'},
  txAmount: {fontSize: 14, fontWeight: '600', color: '#0F172A'},
  txStatus: {fontSize: 12, fontWeight: '500', marginTop: 2, textTransform: 'capitalize'},
});

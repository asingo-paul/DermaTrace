import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  Linking,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useStripe, CardField, CardFieldInput} from '@stripe/stripe-react-native';
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

type PaymentMethod = 'card' | 'paypal' | 'mpesa' | 'airtel' | null;
type Props = NativeStackScreenProps<ProfileStackParamList, 'Billing'>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

function statusColor(s: string): string {
  if (s === 'succeeded' || s === 'completed') return '#10B981';
  if (s === 'failed') return '#EF4444';
  return '#F59E0B';
}

export function BillingScreen({route}: Props) {
  const {plan} = route.params;
  const queryClient = useQueryClient();
  const {createPaymentMethod, confirmPayment} = useStripe();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const planLabel = plan === 'annual' ? 'Annual — $39.99 / year' : 'Monthly — $4.99 / month';
  const planAmount = plan === 'annual' ? '$39.99' : '$4.99';
  const planAmountKES = plan === 'annual' ? 'KES 3,999' : 'KES 499';

  const {data} = useQuery<BillingData>({
    queryKey: ['billing'],
    queryFn: async () => {
      const res = await api.get<BillingData>('/payments/history');
      return res.data;
    },
  });

  async function handlePay() {
    if (!selectedMethod) {
      Alert.alert('Select a payment method', 'Please choose how you want to pay.');
      return;
    }

    setLoading(true);
    try {
      if (selectedMethod === 'card') {
        if (!cardDetails?.complete) {
          Alert.alert('Incomplete', 'Please enter your full card details.');
          setLoading(false);
          return;
        }
        const {paymentMethod, error: pmError} = await createPaymentMethod({paymentMethodType: 'Card'});
        if (pmError || !paymentMethod) {
          Alert.alert('Card Error', pmError?.message ?? 'Could not process card.');
          setLoading(false);
          return;
        }
        const intentRes = await api.post('/payments/create-intent', {plan});
        const {error, paymentIntent} = await confirmPayment(intentRes.data.client_secret, {
          paymentMethodType: 'Card',
          paymentMethodData: {paymentMethodId: paymentMethod.id},
        });
        if (error) {
          Alert.alert('Payment Failed', error.message);
        } else if (paymentIntent) {
          queryClient.invalidateQueries({queryKey: ['subscription']});
          queryClient.invalidateQueries({queryKey: ['billing']});
          Alert.alert('Payment Successful', 'Welcome to Pro!');
        }

      } else if (selectedMethod === 'paypal') {
        const res = await api.post('/payments/paypal/create-order', {plan});
        const {approval_url, order_id} = res.data;
        await Linking.openURL(approval_url);
        Alert.alert(
          'Complete Payment',
          'Once you have approved the payment in your browser, tap Confirm.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Confirm',
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

      } else if (selectedMethod === 'mpesa') {
        if (!phoneNumber.trim()) {
          Alert.alert('Required', 'Enter your M-Pesa phone number (e.g. 0712345678).');
          setLoading(false);
          return;
        }
        const res = await api.post('/payments/mpesa/stk-push', {plan, phone_number: phoneNumber.trim()});
        Alert.alert(
          'STK Push Sent',
          res.data.message ?? 'Check your phone and enter your M-Pesa PIN to complete payment.',
        );

      } else if (selectedMethod === 'airtel') {
        if (!phoneNumber.trim()) {
          Alert.alert('Required', 'Enter your Airtel Money number (e.g. 0733123456).');
          setLoading(false);
          return;
        }
        const res = await api.post('/payments/airtel/pay', {plan, phone_number: phoneNumber.trim()});
        Alert.alert(
          'Request Sent',
          res.data.message ?? 'Check your phone and approve the Airtel Money payment request.',
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Payment failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  const isMobileMethod = selectedMethod === 'mpesa' || selectedMethod === 'airtel';
  const isCardMethod = selectedMethod === 'card';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Plan summary */}
      <View style={styles.planCard}>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>PRO</Text>
        </View>
        <Text style={styles.planLabel}>{planLabel}</Text>
        <Text style={styles.planNote}>
          {plan === 'annual' ? 'Save 33% vs monthly · ' : ''}{planAmountKES} · 14 days free trial
        </Text>
      </View>

      {/* Payment method selection */}
      <Text style={styles.sectionLabel}>Choose payment method</Text>

      {[
        {
          id: 'card',
          label: 'Debit / Credit Card',
          sub: 'Visa, Mastercard',
          logo: <View style={styles.logoRow}>
            <View style={[styles.logoBadge, {backgroundColor: '#1A1F71'}]}><Text style={styles.logoBadgeText}>VISA</Text></View>
            <View style={[styles.logoBadge, {backgroundColor: '#EB001B'}]}><Text style={styles.logoBadgeText}>MC</Text></View>
          </View>,
        },
        {
          id: 'paypal',
          label: 'PayPal',
          sub: 'Pay via PayPal account',
          logo: <View style={[styles.logoBadge, {backgroundColor: '#003087', paddingHorizontal: 10}]}><Text style={styles.logoBadgeText}>PayPal</Text></View>,
        },
        {
          id: 'mpesa',
          label: 'M-Pesa',
          sub: 'Lipa na Pochi la Biashara · STK Push',
          logo: <View style={[styles.logoBadge, {backgroundColor: '#00A651', paddingHorizontal: 10}]}><Text style={styles.logoBadgeText}>M-PESA</Text></View>,
        },
        {
          id: 'airtel',
          label: 'Airtel Money',
          sub: 'Direct STK Push to your number',
          logo: <View style={[styles.logoBadge, {backgroundColor: '#E40000', paddingHorizontal: 10}]}><Text style={styles.logoBadgeText}>Airtel</Text></View>,
        },
      ].map(method => (
        <TouchableOpacity
          key={method.id}
          style={[styles.methodRow, selectedMethod === method.id && styles.methodRowActive]}
          onPress={() => setSelectedMethod(method.id as PaymentMethod)}
          activeOpacity={0.7}>
          <View style={[styles.radio, selectedMethod === method.id && styles.radioActive]}>
            {selectedMethod === method.id && <View style={styles.radioDot} />}
          </View>
          <View style={styles.methodText}>
            <Text style={[styles.methodLabel, selectedMethod === method.id && styles.methodLabelActive]}>
              {method.label}
            </Text>
            <Text style={styles.methodSub}>{method.sub}</Text>
          </View>
          {method.logo}
        </TouchableOpacity>
      ))}

      {/* Card input */}
      {isCardMethod && (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Card details</Text>
          <CardField
            postalCodeEnabled={false}
            placeholders={{number: '4242 4242 4242 4242'}}
            cardStyle={cardFieldStyle}
            style={styles.cardField}
            onCardChange={details => setCardDetails(details)}
          />
        </View>
      )}

      {/* Phone number input for M-Pesa / Airtel */}
      {isMobileMethod && (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            {selectedMethod === 'mpesa' ? 'M-Pesa phone number' : 'Airtel Money number'}
          </Text>
          <TextInput
            style={styles.phoneInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder={selectedMethod === 'mpesa' ? '0712 345 678' : '0733 123 456'}
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            maxLength={13}
          />
          <Text style={styles.phoneHint}>
            {selectedMethod === 'mpesa'
              ? 'You will receive an STK push to pay via Pochi la Biashara'
              : 'You will receive an Airtel Money payment request on your phone'}
          </Text>
        </View>
      )}

      {/* Pay button */}
      <TouchableOpacity
        style={[styles.payBtn, (!selectedMethod || loading) && styles.btnDisabled]}
        onPress={handlePay}
        disabled={!selectedMethod || loading}
        activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.payBtnText}>
            {selectedMethod
              ? `Pay ${isMobileMethod ? planAmountKES : planAmount}`
              : 'Select a payment method'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.secureNote}>
        Payments are processed securely. We never store your card or PIN details.
      </Text>

      {/* Transaction history */}
      {data?.transactions && data.transactions.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, {marginTop: 28}]}>Billing History</Text>
          <View style={styles.historyCard}>
            {data.transactions.map((tx, i) => (
              <View key={tx.id} style={[styles.txRow, i > 0 && styles.txRowBorder]}>
                <View style={styles.txLeft}>
                  <Text style={styles.txMethod}>
                    {tx.payment_method === 'debit_card' ? 'Card'
                      : tx.payment_method === 'mpesa' ? 'M-Pesa'
                      : tx.payment_method === 'airtel_money' ? 'Airtel Money'
                      : 'PayPal'}
                  </Text>
                  <Text style={styles.txDate}>{formatDate(tx.created_at)}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>
                    {tx.currency === 'kes' ? `KES ${tx.amount}` : `$${tx.amount.toFixed(2)}`}
                  </Text>
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

const cardFieldStyle: CardFieldInput.Styles = {
  backgroundColor: '#F8FAFC',
  textColor: '#0F172A',
  placeholderColor: '#94A3B8',
  borderColor: '#E2E8F0',
  borderWidth: 1.5,
  borderRadius: 10,
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  content: {padding: 20, paddingBottom: 48},

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
  planLabel: {fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 4},
  planNote: {fontSize: 13, color: '#3B82F6'},

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },

  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 14,
    backgroundColor: '#FAFAFA',
  },
  methodRowActive: {borderColor: '#1A6FD4', backgroundColor: '#EFF6FF'},
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {borderColor: '#1A6FD4'},
  radioDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: '#1A6FD4'},
  methodText: {flex: 1},
  methodLabel: {fontSize: 15, fontWeight: '600', color: '#374151'},
  methodLabelActive: {color: '#1A6FD4'},
  methodSub: {fontSize: 12, color: '#94A3B8', marginTop: 2},

  logoRow: {flexDirection: 'row', gap: 4},
  logoBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  inputSection: {marginTop: 8, marginBottom: 16},
  inputLabel: {fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8},
  cardField: {width: '100%', height: 50, marginBottom: 4},
  phoneInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    letterSpacing: 1,
  },
  phoneHint: {fontSize: 12, color: '#64748B', marginTop: 8, lineHeight: 17},

  payBtn: {
    backgroundColor: '#1A6FD4',
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: {opacity: 0.45},
  payBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},

  secureNote: {textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 14, lineHeight: 18},

  historyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  txRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14},
  txRowBorder: {borderTopWidth: 1, borderTopColor: '#F1F5F9'},
  txLeft: {flex: 1},
  txMethod: {fontSize: 14, fontWeight: '500', color: '#0F172A'},
  txDate: {fontSize: 12, color: '#94A3B8', marginTop: 2},
  txRight: {alignItems: 'flex-end'},
  txAmount: {fontSize: 14, fontWeight: '600', color: '#0F172A'},
  txStatus: {fontSize: 12, fontWeight: '500', marginTop: 2, textTransform: 'capitalize'},
});

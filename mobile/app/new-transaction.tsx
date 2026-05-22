import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';

import { getAllTills } from '@/db/repositories/till.repo';
import { getAllCategories } from '@/db/repositories/category.repo';
import { createTransaction, createTransfer, createCreditCardPayment } from '@/db/repositories/transaction.repo';
import { getAllCreditCards, getCreditCardPendingPurchases } from '@/db/repositories/credit-card.repo';
import { getOccurrenceById, applyOccurrencePayment, getUpcomingOccurrences } from '@/db/repositories/scheduled.repo';
import { scheduleOccurrenceNotifications } from '@/services/notifications.service';
import { ThemedText } from '@/components/themed-text';

type TxType = 'ingreso' | 'egreso' | 'transferencia';
type PaymentMethod = 'cash' | 'credit_card';

const formatDate = (d: Date) => d.toISOString().split('T')[0];

export default function NewTransactionScreen() {
  const router = useRouter();
  const { occurrenceId } = useLocalSearchParams<{ occurrenceId?: string }>();
  
  const [tills, setTills] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [txType, setTxType] = useState<TxType>('ingreso');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isCardPayment, setIsCardPayment] = useState(false);
  const [creditCardId, setCreditCardId] = useState<number | null>(null);
  const [tillId, setTillId] = useState<number | null>(null);
  const [fromTillId, setFromTillId] = useState<number | null>(null);
  const [toTillId, setToTillId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [interestAmount, setInterestAmount] = useState('0');
  const [pendingPurchases, setPendingPurchases] = useState<any[]>([]);
  const [selectedPurchaseAmounts, setSelectedPurchaseAmounts] = useState<Record<string, string>>({});
  
  // Smart link state
  const [linkedOccurrence, setLinkedOccurrence] = useState<any>(null);
  const [loadingOccurrence, setLoadingOccurrence] = useState(false);

  const txTypeLabels: Record<TxType, string> = {
    ingreso: 'Ingreso',
    egreso: 'Egreso',
    transferencia: 'Transferencia',
  };
  const availableCreditCards = useMemo(
    () => (tillId ? creditCards.filter((card) => card.till_id === tillId) : creditCards),
    [creditCards, tillId]
  );
  const selectedCapitalAmount = useMemo(
    () => Object.values(selectedPurchaseAmounts).reduce((acc, value) => acc + (Number(value.replace(',', '.')) || 0), 0),
    [selectedPurchaseAmounts]
  );
  const selectedInterestAmount = useMemo(
    () => Number(interestAmount.replace(',', '.')) || 0,
    [interestAmount]
  );

  // Load tills and categories
  useFocusEffect(
    useCallback(() => {
      getAllTills().then((data) => {
        setTills(data);
        if (data.length > 0) {
          setTillId(data[0].id);
          setFromTillId(data[0].id);
          setToTillId(data[1]?.id ?? data[0].id);
        }
      });
      getAllCreditCards().then(setCreditCards);
      getAllCategories().then(setCategories);
    }, [])
  );

  useEffect(() => {
    if (txType !== 'egreso') {
      setPaymentMethod('cash');
      setIsCardPayment(false);
      setCreditCardId(null);
      return;
    }

    if (paymentMethod === 'credit_card' && availableCreditCards.length > 0 && !creditCardId) {
      setCreditCardId(availableCreditCards[0].id);
    }

    if (paymentMethod === 'credit_card' && availableCreditCards.length > 0 && creditCardId) {
      const selectedStillExists = availableCreditCards.some((card) => card.id === creditCardId);
      if (!selectedStillExists) {
        setCreditCardId(availableCreditCards[0].id);
      }
    }

    if (paymentMethod === 'credit_card' && availableCreditCards.length === 0) {
      setCreditCardId(null);
    }
  }, [txType, paymentMethod, availableCreditCards, creditCardId]);

  useEffect(() => {
    if (paymentMethod !== 'credit_card') {
      setIsCardPayment(false);
      setPendingPurchases([]);
      setSelectedPurchaseAmounts({});
      setInterestAmount('0');
      return;
    }

    if (!isCardPayment || !creditCardId) {
      setPendingPurchases([]);
      setSelectedPurchaseAmounts({});
      return;
    }

    getCreditCardPendingPurchases(creditCardId)
      .then((rows) => setPendingPurchases(rows))
      .catch((err) => {
        console.warn('Error loading pending card purchases:', err);
        setPendingPurchases([]);
      });
  }, [paymentMethod, isCardPayment, creditCardId]);

  useEffect(() => {
    if (!isCardPayment) return;
    const total = selectedCapitalAmount + selectedInterestAmount;
    setAmount(total > 0 ? String(total) : '');
  }, [isCardPayment, selectedCapitalAmount, selectedInterestAmount]);

  // Load occurrence if linked
  useEffect(() => {
    if (occurrenceId) {
      setLoadingOccurrence(true);
      (async () => {
        try {
          const occ: any = await getOccurrenceById(parseInt(occurrenceId, 10));
          if (occ) {
            setLinkedOccurrence(occ);
            // Auto-fill form
            const occTxType = occ.type === 'ingreso' ? 'ingreso' : 'egreso';
            setTxType(occTxType);
            setPaymentMethod('cash');
            setIsCardPayment(false);
            setTillId(occ.till_id);
            const prefillAmount = Number(occ.remaining_amount ?? occ.amount ?? 0);
            if (prefillAmount > 0) {
              setAmount(prefillAmount.toString());
            }
            setDescription(
              `Pago ${occ.title} - Cuota ${occ.installment_number || '?'}`
            );
            setDate(new Date(occ.due_date));
          }
        } catch (err) {
          console.warn('Error loading occurrence:', err);
        } finally {
          setLoadingOccurrence(false);
        }
      })();
    }
  }, [occurrenceId]);

  const handleSave = async () => {
    if (tills.length === 0) {
      Alert.alert('Sin cuentas', 'Primero crea una cuenta en la pestaña Cuentas.');
      return;
    }
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido mayor a cero.');
      return;
    }
    if (txType === 'egreso' && paymentMethod === 'credit_card' && !creditCardId) {
      Alert.alert('Error', 'Selecciona una tarjeta de crédito.');
      return;
    }
    if (txType === 'egreso' && paymentMethod === 'credit_card' && isCardPayment) {
      if (selectedCapitalAmount <= 0) {
        Alert.alert('Error', 'Selecciona al menos una compra pendiente para pagar.');
        return;
      }
      if (selectedInterestAmount < 0) {
        Alert.alert('Error', 'El interés no puede ser negativo.');
        return;
      }
      const expectedTotal = selectedCapitalAmount + selectedInterestAmount;
      if (Math.abs(expectedTotal - numAmount) > 0.01) {
        Alert.alert('Error', 'El monto debe coincidir con capital seleccionado + interés.');
        return;
      }
    }
    if (linkedOccurrence) {
      const remaining = Number(linkedOccurrence.remaining_amount ?? linkedOccurrence.amount ?? 0);
      if (numAmount > remaining) {
        Alert.alert('Error', 'El monto no puede ser mayor al saldo pendiente de la cuota.');
        return;
      }
    }
    if (txType === 'transferencia') {
      if (tills.length < 2) {
        Alert.alert('Error', 'Necesitas al menos 2 cuentas para hacer una transferencia.');
        return;
      }
      if (fromTillId === toTillId) {
        Alert.alert('Error', 'La cuenta origen y destino deben ser diferentes.');
        return;
      }
      await createTransfer({
        fromTillId: fromTillId!,
        toTillId: toTillId!,
        amount: numAmount,
        description,
        date: formatDate(date),
      });
    } else {
      if (txType === 'egreso' && paymentMethod === 'credit_card' && isCardPayment) {
        const paymentItems = Object.entries(selectedPurchaseAmounts)
          .map(([purchaseTransactionId, amountPaid]) => ({
            purchaseTransactionId: Number(purchaseTransactionId),
            amountPaid: Number(amountPaid.replace(',', '.')) || 0,
          }))
          .filter((item) => item.amountPaid > 0);

        await createCreditCardPayment({
          tillId: tillId!,
          creditCardId: creditCardId!,
          capitalAmount: selectedCapitalAmount,
          interestAmount: selectedInterestAmount,
          description: description || 'Pago de tarjeta',
          date: formatDate(date),
          paymentMethod: 'cash',
          paymentItems,
        });
        router.back();
        return;
      }

      const transactionId = await createTransaction({
        tillId: tillId!,
        amount: numAmount,
        type: txType,
        description,
        date: formatDate(date),
        categoryId,
        paymentMethod: txType === 'egreso' ? paymentMethod : 'cash',
        creditCardId: txType === 'egreso' && paymentMethod === 'credit_card' ? creditCardId : null,
        affectsBalance: txType === 'egreso' && paymentMethod === 'credit_card' ? 0 : 1,
      });

      // If linked to an occurrence, apply the payment amount.
      if (linkedOccurrence && transactionId) {
        try {
          await applyOccurrencePayment(
            linkedOccurrence.id,
            transactionId,
            numAmount,
            formatDate(date)
          );
          // Re-schedule notifications
          const upcoming = await getUpcomingOccurrences(30);
          await scheduleOccurrenceNotifications(upcoming);
        } catch (err) {
          Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo aplicar el pago parcial.');
          console.warn('Error processing occurrence:', err);
          return;
        }
      }
    }
    router.back();
  };

  const togglePurchaseSelection = (purchase: any) => {
    const key = String(purchase.id);
    setSelectedPurchaseAmounts((prev) => {
      const next = { ...prev };
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        delete next[key];
      } else {
        next[key] = String(Number(purchase.pending_amount ?? 0));
      }
      return next;
    });
  };

  const updateSelectedPurchaseAmount = (purchaseId: number, value: string, pendingLimit: number) => {
    const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const numeric = Number(normalized);
    const key = String(purchaseId);

    if (!normalized) {
      setSelectedPurchaseAmounts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    if (Number.isNaN(numeric) || numeric <= 0) return;
    const capped = Math.min(numeric, pendingLimit);
    setSelectedPurchaseAmounts((prev) => ({ ...prev, [key]: String(capped) }));
  };

  function TillPicker({
    value,
    onChange,
    exclude,
  }: {
    value: number | null;
    onChange: (id: number) => void;
    exclude?: number | null;
  }) {
    return (
      <View className="flex-row flex-wrap gap-2">
        {tills
          .filter((t) => t.id !== exclude)
          .map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => onChange(t.id)}
              className={`px-3 py-2 rounded-xl border ${
                value === t.id
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600'
              }`}>
              <Text className={value === t.id ? 'text-white' : 'text-gray-700 dark:text-gray-200'}>
                {t.name}
              </Text>
            </TouchableOpacity>
          ))}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <ThemedText type="title">Nuevo movimiento</ThemedText>
            {linkedOccurrence && (
              <Text className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                Abonando cuota {linkedOccurrence.installment_number}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-gray-400 text-xl">✕</Text>
          </TouchableOpacity>
        </View>

        {loadingOccurrence && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" />
          </View>
        )}

        {/* Type selector */}
        <ThemedText type="defaultSemiBold" className="mb-2">Tipo</ThemedText>
        <TouchableOpacity
          onPress={() => setShowTypePicker(true)}
          className="flex-row justify-between items-center border border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-5">
          <Text className="text-black dark:text-white text-base capitalize">
            {txTypeLabels[txType]}
          </Text>
          <Text className="text-gray-400">▼</Text>
        </TouchableOpacity>

        <Modal visible={showTypePicker} transparent animationType="fade">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowTypePicker(false)}
            className="flex-1 justify-center items-center bg-black/40">
            <View className="bg-white dark:bg-neutral-800 rounded-2xl w-72 overflow-hidden">
              {(['ingreso', 'egreso', 'transferencia'] as TxType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setTxType(t);
                    setShowTypePicker(false);
                  }}
                  className={`px-5 py-4 border-b border-gray-100 dark:border-neutral-700 ${
                    txType === t ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}>
                  <Text
                    className={`text-base capitalize ${
                      txType === t
                        ? 'font-semibold text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}>
                    {txTypeLabels[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Account picker(s) */}
        {txType === 'transferencia' ? (
          <>
            <ThemedText type="defaultSemiBold" className="mb-2">Cuenta Origen</ThemedText>
            <TillPicker value={fromTillId} onChange={setFromTillId} exclude={toTillId} />
            <ThemedText type="defaultSemiBold" className="mt-4 mb-2">Cuenta Destino</ThemedText>
            <TillPicker value={toTillId} onChange={setToTillId} exclude={fromTillId} />
          </>
        ) : (
          <>
            <ThemedText type="defaultSemiBold" className="mb-2">Cuenta</ThemedText>
            <TillPicker value={tillId} onChange={setTillId} />
          </>
        )}

        {txType === 'egreso' && (
          <>
            <ThemedText type="defaultSemiBold" className="mt-5 mb-2">Método de pago</ThemedText>
            <TouchableOpacity
              onPress={() => setShowPaymentMethodPicker(true)}
              className="flex-row justify-between items-center border border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-1">
              <Text className="text-black dark:text-white text-base">
                {paymentMethod === 'credit_card' ? 'Tarjeta de crédito' : 'Efectivo / Débito'}
              </Text>
              <Text className="text-gray-400">▼</Text>
            </TouchableOpacity>
          </>
        )}

        <Modal visible={showPaymentMethodPicker} transparent animationType="fade">
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowPaymentMethodPicker(false)}
            className="flex-1 justify-center items-center bg-black/40">
            <View className="bg-white dark:bg-neutral-800 rounded-2xl w-72 overflow-hidden">
              {[
                { id: 'cash', label: 'Efectivo / Débito' },
                { id: 'credit_card', label: 'Tarjeta de crédito' },
              ].map((method) => (
                <TouchableOpacity
                  key={method.id}
                  onPress={() => {
                    const nextMethod = method.id as PaymentMethod;
                    setPaymentMethod(nextMethod);
                    if (nextMethod !== 'credit_card') {
                      setCreditCardId(null);
                    }
                    setShowPaymentMethodPicker(false);
                  }}
                  className={`px-5 py-4 border-b border-gray-100 dark:border-neutral-700 ${
                    paymentMethod === method.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}>
                  <Text
                    className={`text-base ${
                      paymentMethod === method.id
                        ? 'font-semibold text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {txType === 'egreso' && paymentMethod === 'credit_card' && (
          <>
            <ThemedText type="defaultSemiBold" className="mt-4 mb-2">Tarjeta</ThemedText>
            <View className="flex-row flex-wrap gap-2">
              {availableCreditCards.length === 0 ? (
                <Text className="text-xs text-amber-600 dark:text-amber-400">
                  No hay tarjetas creadas. Crea una en la pestaña Cuentas.
                </Text>
              ) : (
                availableCreditCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    onPress={() => setCreditCardId(card.id)}
                    className={`px-3 py-2 rounded-xl border ${
                      creditCardId === card.id
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600'
                    }`}>
                    <Text className={creditCardId === card.id ? 'text-white' : 'text-gray-700 dark:text-gray-200'}>
                      {card.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Las compras con tarjeta registran gasto, pero no descuentan saldo bancario hasta el pago.
            </Text>

            <View className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
              <TouchableOpacity
                onPress={() => setIsCardPayment((prev) => !prev)}
                className="flex-row items-center justify-between">
                <Text className="text-blue-800 dark:text-blue-200 font-semibold">
                  Registrar como pago de tarjeta
                </Text>
                <Text className="text-blue-700 dark:text-blue-300 font-bold">
                  {isCardPayment ? 'SI' : 'NO'}
                </Text>
              </TouchableOpacity>
              <Text className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Activa esta opción para conciliar compras pendientes y separar intereses.
              </Text>
            </View>

            {isCardPayment && (
              <View className="mt-4">
                <ThemedText type="defaultSemiBold" className="mb-2">Compras pendientes</ThemedText>
                {pendingPurchases.length === 0 ? (
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    No hay compras pendientes para esta tarjeta.
                  </Text>
                ) : (
                  pendingPurchases.map((purchase) => {
                    const key = String(purchase.id);
                    const isSelected = Object.prototype.hasOwnProperty.call(selectedPurchaseAmounts, key);
                    return (
                      <TouchableOpacity
                        key={purchase.id}
                        activeOpacity={0.85}
                        onPress={() => togglePurchaseSelection(purchase)}
                        className={`rounded-xl border p-3 mb-2 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                        }`}>
                        <View className="flex-row justify-between items-start mb-1">
                          <Text className="text-black dark:text-white font-medium flex-1 mr-2" numberOfLines={1}>
                            {purchase.description || 'Compra sin descripción'}
                          </Text>
                          <Text className="text-gray-500 dark:text-gray-300 text-xs">
                            {purchase.transaction_date}
                          </Text>
                        </View>
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Pendiente: {Number(purchase.pending_amount).toLocaleString('es-PY')}
                        </Text>
                        {isSelected && (
                          <TextInput
                            value={selectedPurchaseAmounts[key] ?? ''}
                            onChangeText={(value) =>
                              updateSelectedPurchaseAmount(
                                purchase.id,
                                value,
                                Number(purchase.pending_amount ?? 0)
                              )
                            }
                            keyboardType="decimal-pad"
                            placeholder="Monto a pagar de esta compra"
                            placeholderTextColor="#9CA3AF"
                            className="border border-blue-300 dark:border-blue-700 rounded-lg p-2 text-black dark:text-white"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}

                <ThemedText type="defaultSemiBold" className="mt-2 mb-2">Interés (opcional)</ThemedText>
                <TextInput
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={interestAmount}
                  onChangeText={setInterestAmount}
                  className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-black dark:text-white"
                />
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Capital: {selectedCapitalAmount.toLocaleString('es-PY')} · Interés: {selectedInterestAmount.toLocaleString('es-PY')} · Total: {(selectedCapitalAmount + selectedInterestAmount).toLocaleString('es-PY')}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Amount */}
        <ThemedText type="defaultSemiBold" className="mt-5 mb-2">Monto</ThemedText>
        <TextInput
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-black dark:text-white text-lg"
        />
        {linkedOccurrence && (
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Saldo pendiente: {Number(linkedOccurrence.remaining_amount ?? linkedOccurrence.amount ?? 0).toLocaleString('es-PY')}
          </Text>
        )}

        {/* Category picker */}
        {txType !== 'transferencia' && !(txType === 'egreso' && paymentMethod === 'credit_card' && isCardPayment) && (
          <>
            <ThemedText type="defaultSemiBold" className="mt-5 mb-2">Categoría</ThemedText>
            <TouchableOpacity
              onPress={() => { setCategorySearch(''); setShowCategoryPicker(true); }}
              className="flex-row justify-between items-center border border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-1">
              <Text className={categoryId ? 'text-black dark:text-white' : 'text-gray-400'}>
                {categoryId
                  ? (categories.find((c) => c.id === categoryId)?.name ?? 'Seleccionar')
                  : 'Seleccionar categoría'}
              </Text>
              <Text className="text-gray-400 text-xs">▼</Text>
            </TouchableOpacity>
          </>
        )}

        <Modal visible={showCategoryPicker} transparent animationType="slide">
          <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
              <ThemedText type="subtitle">Categoría</ThemedText>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Text className="text-gray-400 text-xl">✕</Text>
              </TouchableOpacity>
            </View>
            <View className="px-4 pb-2">
              <TextInput
                placeholder="Buscar..."
                placeholderTextColor="#9CA3AF"
                value={categorySearch}
                onChangeText={setCategorySearch}
                autoFocus
                className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-black dark:text-white"
              />
            </View>
            <FlatList
              data={categories.filter((c) =>
                (txType === 'ingreso' ? c.type === 'income' : c.type === 'expense') &&
                c.name.toLowerCase().includes(categorySearch.toLowerCase())
              )}
              keyExtractor={(item) => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setCategoryId(item.id); setShowCategoryPicker(false); }}
                  className={`px-4 py-4 border-b border-gray-100 dark:border-neutral-800 flex-row justify-between items-center ${
                    categoryId === item.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}>
                  <Text className={`text-base ${
                    categoryId === item.id
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-black dark:text-white'
                  }`}>
                    {item.name}
                  </Text>
                  {categoryId === item.id && (
                    <Text className="text-blue-600 dark:text-blue-400 text-lg">✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="text-gray-400 text-center py-8">Sin resultados</Text>
              }
            />
          </SafeAreaView>
        </Modal>

        {/* Description */}
        <ThemedText type="defaultSemiBold" className="mt-4 mb-2">
          Descripción (opcional)
        </ThemedText>
        <TextInput
          placeholder="Ej. Pago proveedor"
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-black dark:text-white"
        />

        {/* Date */}
        <ThemedText type="defaultSemiBold" className="mt-4 mb-2">Fecha</ThemedText>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-1">
          <Text className="text-black dark:text-white">{formatDate(date)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selected) setDate(selected);
            }}
          />
        )}

        {/* Save */}
        <TouchableOpacity onPress={handleSave} className="bg-blue-600 rounded-xl p-4 mt-6">
          <Text className="text-white text-center font-semibold text-base">Guardar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

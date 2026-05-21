import { useState, useCallback, useEffect } from 'react';
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
import { createTransaction, createTransfer } from '@/db/repositories/transaction.repo';
import { getOccurrenceById, applyOccurrencePayment, getUpcomingOccurrences } from '@/db/repositories/scheduled.repo';
import { scheduleOccurrenceNotifications } from '@/services/notifications.service';
import { ThemedText } from '@/components/themed-text';

type TxType = 'ingreso' | 'egreso' | 'transferencia';

const formatDate = (d: Date) => d.toISOString().split('T')[0];

export default function NewTransactionScreen() {
  const router = useRouter();
  const { occurrenceId } = useLocalSearchParams<{ occurrenceId?: string }>();
  
  const [tills, setTills] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [txType, setTxType] = useState<TxType>('ingreso');
  const [tillId, setTillId] = useState<number | null>(null);
  const [fromTillId, setFromTillId] = useState<number | null>(null);
  const [toTillId, setToTillId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  
  // Smart link state
  const [linkedOccurrence, setLinkedOccurrence] = useState<any>(null);
  const [loadingOccurrence, setLoadingOccurrence] = useState(false);

  const txTypeLabels: Record<TxType, string> = {
    ingreso: 'Ingreso',
    egreso: 'Egreso',
    transferencia: 'Transferencia',
  };

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
      getAllCategories().then(setCategories);
    }, [])
  );

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
      const transactionId = await createTransaction({
        tillId: tillId!,
        amount: numAmount,
        type: txType,
        description,
        date: formatDate(date),
        categoryId,
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
        {txType !== 'transferencia' && (
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

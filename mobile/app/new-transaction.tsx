import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useFocusEffect } from 'expo-router';

import { getAllTills } from '@/db/repositories/till.repo';
import { createTransaction, createTransfer } from '@/db/repositories/transaction.repo';
import { ThemedText } from '@/components/themed-text';

type TxType = 'ingreso' | 'egreso' | 'transferencia';

const formatDate = (d: Date) => d.toISOString().split('T')[0];

export default function NewTransactionScreen() {
  const router = useRouter();
  const [tills, setTills] = useState<any[]>([]);
  const [txType, setTxType] = useState<TxType>('ingreso');
  const [tillId, setTillId] = useState<number | null>(null);
  const [fromTillId, setFromTillId] = useState<number | null>(null);
  const [toTillId, setToTillId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    }, [])
  );

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
      await createTransaction({
        tillId: tillId!,
        amount: numAmount,
        type: txType,
        description,
        date: formatDate(date),
      });
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
          <ThemedText type="title">Nuevo movimiento</ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-gray-400 text-xl">✕</Text>
          </TouchableOpacity>
        </View>

        {/* Type selector */}
        <View className="flex-row bg-gray-100 dark:bg-neutral-800 rounded-xl p-1 mb-5">
          {(['ingreso', 'egreso', 'transferencia'] as TxType[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTxType(t)}
              className={`flex-1 py-2 rounded-lg ${
                txType === t ? 'bg-white dark:bg-neutral-700 shadow-sm' : ''
              }`}>
              <Text
                className={`text-center text-sm capitalize ${
                  txType === t
                    ? 'font-semibold text-black dark:text-white'
                    : 'text-gray-500'
                }`}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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

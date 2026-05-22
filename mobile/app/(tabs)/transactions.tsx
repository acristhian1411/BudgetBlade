import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { getTransactions, deleteTransaction } from '@/db/repositories/transaction.repo';
import { getAllTills } from '@/db/repositories/till.repo';
import { ThemedText } from '@/components/themed-text';

const TYPES = [
  { label: 'Todos',           value: '' },
  { label: 'Ingresos',        value: 'ingreso' },
  { label: 'Egresos',         value: 'egreso' },
  { label: 'Transferencias',  value: 'transferencia' },
];

const PERIODS = [
  { label: 'Todo',         value: '' },
  { label: 'Esta semana',  value: 'week' },
  { label: 'Este mes',     value: 'month' },
];

const fmt = (val: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

const getDateRange = (period: string) => {
  const now = new Date();
  if (period === 'week') {
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    return {
      dateFrom: from.toISOString().split('T')[0],
      dateTo:   now.toISOString().split('T')[0],
    };
  }
  if (period === 'month') {
    return {
      dateFrom: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
      dateTo:   now.toISOString().split('T')[0],
    };
  }
  return {};
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full mr-2 ${
        active
          ? 'bg-blue-600'
          : 'bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600'
      }`}>
      <Text className={`text-sm ${active ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function TransactionsScreen() {
  const params = useLocalSearchParams<{ tillId?: string }>();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tills, setTills] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedTillId, setSelectedTillId] = useState(params.tillId ?? '');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [txs, allTills] = await Promise.all([
      getTransactions({
        tillId:   selectedTillId ? Number(selectedTillId) : undefined,
        type:     selectedType   || undefined,
        ...getDateRange(selectedPeriod),
      }),
      getAllTills(),
    ]);
    setTransactions(txs);
    setTills(allTills);
  }, [selectedPeriod, selectedTillId, selectedType]);

  useFocusEffect(
    useCallback(() => { void load(); }, [load])
  );

  const confirmDeleteTx = (tx: any) => {
    Alert.alert(
      'Eliminar movimiento',
      `¿Eliminar "${tx.description || 'Sin descripción'}"?${tx.transfer_id ? ' Se eliminarán ambos lados de la transferencia.' : ''}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteTransaction(tx.id); await load(); } },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-900">
      <View className="px-4 pt-2 pb-1">
        <ThemedText type="title" className="mb-3">Historial</ThemedText>

        {/* Type filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {TYPES.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              active={selectedType === t.value}
              onPress={() => setSelectedType(t.value)}
            />
          ))}
        </ScrollView>

        {/* Period filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {PERIODS.map((p) => (
            <Chip
              key={p.value}
              label={p.label}
              active={selectedPeriod === p.value}
              onPress={() => setSelectedPeriod(p.value)}
            />
          ))}
        </ScrollView>

        {/* Account filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1">
          <Chip label="Todas" active={!selectedTillId} onPress={() => setSelectedTillId('')} />
          {tills.map((t) => (
            <Chip
              key={t.id}
              label={t.name}
              active={selectedTillId === String(t.id)}
              onPress={() => setSelectedTillId(String(t.id))}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text className="text-gray-400 text-center py-10">
            Sin movimientos para los filtros seleccionados
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => confirmDeleteTx(item)}
            activeOpacity={0.7}
            className="bg-white dark:bg-neutral-800 rounded-xl p-4 mb-2 flex-row justify-between items-center">
            <View className="flex-1 mr-3">
              <Text
                className="text-black dark:text-white font-medium"
                numberOfLines={1}>
                {item.description || '—'}
              </Text>
              <Text className="text-gray-400 text-xs">
                {item.till_name} · {item.transaction_date}
              </Text>
              {!!item.payment_method && item.type === 'egreso' && (
                <Text className="text-gray-500 text-xs mt-0.5">
                  {item.payment_method === 'credit_card'
                    ? `Tarjeta${item.credit_card_name ? ` · ${item.credit_card_name}` : ''}`
                    : 'Efectivo / Débito'}
                </Text>
              )}
            </View>
            <View className="items-end">
              <Text
                className={`font-bold ${
                  item.type === 'ingreso'
                    ? 'text-green-500'
                    : item.type === 'egreso'
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`}>
                {item.type === 'ingreso' ? '+' : item.type === 'egreso' ? '−' : ''}
                {fmt(Math.abs(item.amount))}
              </Text>
              <Text className="text-gray-400 text-xs capitalize">{item.type}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

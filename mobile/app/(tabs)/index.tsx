import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';

import { getTotal, getTotalByCategory, getLastN, deleteTransaction } from '@/db/repositories/transaction.repo';
import { getUpcomingOccurrences, getPendingAndOverdue } from '@/db/repositories/scheduled.repo';
import { ThemedText } from '@/components/themed-text';

const fmt = (val: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);

const formatDateStr = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function DashboardScreen() {
  const router = useRouter();
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState({ banco: 0, efectivo: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [allPendingOverdue, setAllPendingOverdue] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, c, r, up, all] = await Promise.all([
        getTotal(),
        getTotalByCategory(),
        getLastN(5),
        getUpcomingOccurrences(7),
        getPendingAndOverdue(),
      ]);
      setTotal(t);
      setCategories(c);
      setRecent(r);
      setUpcoming(up);
      setAllPendingOverdue(all);
    } catch (err) {
      console.warn('Error loading dashboard data:', err);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

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

  const overdueCount = allPendingOverdue.filter((o) => o.status === 'overdue').length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-900">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        <ThemedText type="title" className="mb-4">Dashboard</ThemedText>

        {/* Saldo total */}
        <View className="bg-blue-600 rounded-2xl p-6 mb-4">
          <Text className="text-blue-100 text-sm mb-1">Saldo Total</Text>
          <Text className="text-white text-3xl font-bold">{fmt(total)}</Text>
        </View>

        {/* Efectivo vs Bancos */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-2xl p-4">
            <Text className="text-emerald-700 dark:text-emerald-300 text-xs mb-1">Efectivo</Text>
            <Text className="text-emerald-800 dark:text-emerald-100 text-lg font-bold">{fmt(categories.efectivo)}</Text>
          </View>
          <View className="flex-1 bg-violet-50 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-700 rounded-2xl p-4">
            <Text className="text-violet-700 dark:text-violet-300 text-xs mb-1">Bancos</Text>
            <Text className="text-violet-800 dark:text-violet-100 text-lg font-bold">{fmt(categories.banco)}</Text>
          </View>
        </View>

        {/* Compromisos próximos */}
        {upcoming.length > 0 && (
          <>
            <View className="flex-row justify-between items-center mb-3">
              <ThemedText type="defaultSemiBold">Próximos vencimientos</ThemedText>
              {overdueCount > 0 && (
                <View className="bg-red-600 px-3 py-1 rounded-full">
                  <Text className="text-white text-xs font-bold">{overdueCount} vencido</Text>
                </View>
              )}
            </View>
            <FlatList
              horizontal
              data={upcoming}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push(`/new-transaction?occurrenceId=${item.id}`)}
                  activeOpacity={0.7}
                  className="bg-white dark:bg-neutral-800 rounded-xl p-4 mr-3 w-56 border-l-4"
                  style={{
                    borderLeftColor: item.type === 'ingreso' ? '#10b981' : '#f59e0b',
                  }}>
                  <Text className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                    {item.title}
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-xs mb-3">
                    {item.entity_name || 'Sin entidad'}
                  </Text>
                  <View className="flex-row justify-between items-end">
                    <Text className="text-gray-600 dark:text-gray-300 text-xs">
                      {formatDateStr(item.due_date)}
                    </Text>
                    {item.amount && (
                      <Text className="font-bold text-lg">
                        {item.type === 'ingreso' ? '+' : '−'} {fmt(item.amount)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              scrollEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 24 }}
            />
          </>
        )}

        {/* Últimos movimientos */}
        <ThemedText type="defaultSemiBold" className="mb-3">Últimos movimientos</ThemedText>
        {recent.length === 0 ? (
          <Text className="text-gray-400 text-center py-6">Sin movimientos aún</Text>
        ) : (
          recent.map((tx) => (
            <TouchableOpacity
              key={tx.id}
              onLongPress={() => confirmDeleteTx(tx)}
              activeOpacity={0.7}
              className="bg-white dark:bg-neutral-800 rounded-xl p-4 mb-2 flex-row justify-between items-center">
              <View className="flex-1 mr-3">
                <Text className="text-black dark:text-white font-medium" numberOfLines={1}>
                  {tx.description || '—'}
                </Text>
                <Text className="text-gray-400 text-xs">{tx.till_name} · {tx.transaction_date}</Text>
              </View>
              <Text
                className={`font-bold ${
                  tx.type === 'ingreso'
                    ? 'text-green-500'
                    : tx.type === 'egreso'
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`}>
                {tx.type === 'ingreso' ? '+' : tx.type === 'egreso' ? '−' : ''}
                {fmt(Math.abs(tx.amount))}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/new-transaction' as any)}
        className="absolute bottom-8 right-6 bg-blue-600 w-16 h-16 rounded-full items-center justify-center"
        style={{ elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } }}>
        <Text className="text-white text-4xl leading-none pb-1">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
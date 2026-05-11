import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useAuth } from '@/context/auth.context';
import { getTransactions } from '@/db/repositories/transaction.repo';
import { ThemedText } from '@/components/themed-text';

export default function SettingsScreen() {
  const { logout } = useAuth();

  const escapeCsvValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const buildCsv = (rows: any[]) => {
    const preferredOrder = [
      'id',
      'till_id',
      'till_name',
      'category_id',
      'amount',
      'type',
      'description',
      'transfer_id',
      'transaction_date',
    ];

    const discoveredKeys: string[] = Array.from(
      rows.reduce<Set<string>>((set, row) => {
        Object.keys(row ?? {}).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );

    const orderedKeys: string[] = [
      ...preferredOrder.filter((k) => discoveredKeys.includes(k)),
      ...discoveredKeys.filter((k) => !preferredOrder.includes(k)),
    ];

    const header = `${orderedKeys.join(',')}\n`;
    const dataRows = rows
      .map((row) => orderedKeys.map((k) => escapeCsvValue(row?.[k])).join(','))
      .join('\n');

    return header + dataRows;
  };

  const exportTransactions = async (format: 'csv' | 'json') => {
    try {
      const txs = await getTransactions({});
      if (!txs || txs.length === 0) {
        Alert.alert('Sin datos', 'No hay movimientos para exportar.');
        return;
      }

      const content = format === 'json' ? JSON.stringify(txs, null, 2) : buildCsv(txs);
      const file = new File(Paths.document, `transactions_${Date.now()}.${format}`);
      await file.write(content);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: format === 'json' ? 'application/json' : 'text/csv',
          dialogTitle: 'Exportar movimientos',
        });
      } else {
        Alert.alert('Exportado', `Archivo guardado en:\n${file.uri}`);
      }
    } catch (error: any) {
      Alert.alert('Error', `No se pudo exportar: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const handleExport = () => {
    Alert.alert('Exportar datos', 'Selecciona el formato', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'CSV', onPress: () => { void exportTransactions('csv'); } },
      { text: 'JSON', onPress: () => { void exportTransactions('json'); } },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-900">
      <View className="px-4 pt-2">
        <ThemedText type="title" className="mb-6">Ajustes</ThemedText>

        <TouchableOpacity
          onPress={handleExport}
          className="bg-white dark:bg-neutral-800 rounded-2xl p-4 flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-black dark:text-white font-semibold">Exportar datos</Text>
            <Text className="text-gray-400 text-xs">Descarga en CSV o JSON</Text>
          </View>
          <Text className="text-2xl">📤</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white dark:bg-neutral-800 rounded-2xl p-4 flex-row justify-between items-center">
          <Text className="text-red-500 font-semibold">Cerrar sesión</Text>
          <Text className="text-2xl">🚪</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

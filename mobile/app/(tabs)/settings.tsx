import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useAuth } from '@/context/auth.context';
import { getTransactions } from '@/db/repositories/transaction.repo';
import { ThemedText } from '@/components/themed-text';

export default function SettingsScreen() {
  const { logout } = useAuth();

  const handleExportCSV = async () => {
    const txs = await getTransactions();
    const header = 'id,till_name,amount,type,description,transfer_id,transaction_date\n';
    const rows = txs
      .map((t: any) =>
        [
          t.id,
          `"${(t.till_name  || '').replace(/"/g, '""')}"`,
          t.amount,
          t.type,
          `"${(t.description || '').replace(/"/g, '""')}"`,
          t.transfer_id || '',
          t.transaction_date,
        ].join(',')
      )
      .join('\n');

    const csv  = header + rows;
    const path = `${FileSystem.documentDirectory}transactions_${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(path, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType:    'text/csv',
        dialogTitle: 'Exportar movimientos',
      });
    } else {
      Alert.alert('Exportado', `Archivo guardado en:\n${path}`);
    }
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
          onPress={handleExportCSV}
          className="bg-white dark:bg-neutral-800 rounded-2xl p-4 flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-black dark:text-white font-semibold">Exportar datos (CSV)</Text>
            <Text className="text-gray-400 text-xs">Comparte el historial por WhatsApp o mail</Text>
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

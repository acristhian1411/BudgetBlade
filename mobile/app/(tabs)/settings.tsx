import { View, Text, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { useAuth } from '@/context/auth.context';
import {
  exportDatabaseBackup,
  getBackupImportPolicy,
  importDatabaseBackup,
} from '@/db/repositories/backup.repo';
import { ThemedText } from '@/components/themed-text';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const importPolicy = getBackupImportPolicy();
  const [showExportPasswordModal, setShowExportPasswordModal] = useState(false);
  const [exportPasswordInput, setExportPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingImportData, setPendingImportData] = useState<{ content: string; formatHint: 'nbb' | 'json' | 'csv' } | null>(null);

  const toSummary = (rowCountByTable: unknown) => {
    const counts = (rowCountByTable ?? {}) as Record<string, number>;
    const labels: Record<string, string> = {
      users: 'usuarios',
      tills: 'cajas',
      categories: 'categorias',
      entities: 'entidades',
      transactions: 'transacciones',
      scheduled_plans: 'planes',
      scheduled_occurrences: 'cuotas',
    };
    return Object.entries(counts)
      .map(([table, count]) => `- ${labels[table] ?? table}: ${count}`)
      .join('\n');
  };

  const exportDatabase = async (format: 'nbb' | 'csv' | 'json', password: string | null = null) => {
    try {
      const backup = await exportDatabaseBackup(format, password);
      const file = new File(Paths.document, `budget_backup_${Date.now()}.${format}`);
      const content = backup.content;
      await file.write(content);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: format === 'nbb' ? 'application/json' : format === 'json' ? 'application/json' : 'text/csv',
          dialogTitle: 'Exportar respaldo completo',
        });
      } else {
        Alert.alert('Exportado', `Archivo guardado en:\n${file.uri}`);
      }
      Alert.alert('Respaldo listo', `Se exporto la base completa.\n\n${toSummary(backup.rowCountByTable)}`);
    } catch (error: any) {
      Alert.alert('Error', `No se pudo exportar: ${error?.message ?? 'Error desconocido'}`);
    }
  };

  const performExportWithPassword = async () => {
    const trimmed = exportPasswordInput.trim();
    if (!trimmed) {
      Alert.alert('Contraseña requerida', 'Ingresa tu contraseña para exportar el respaldo cifrado.');
      return;
    }

    setShowExportPasswordModal(false);
    setExportPasswordInput('');
    await exportDatabase('nbb', trimmed);
  };

  const handleExport = () => {
    Alert.alert(
      'Exportar respaldo',
      'Se exporta toda la base de datos en formato cifrado (.nbb). Necesitarás tu contraseña para proteger la clave maestra del respaldo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Exportar .nbb',
          onPress: () => {
            setShowExportPasswordModal(true);
          },
        },
      ]
    );
  };

  const performImportWithPassword = async () => {
    if (!pendingImportData) return;
    setShowPasswordModal(false);
    try {
      const rowCountByTable = await importDatabaseBackup(
        pendingImportData.content,
        pendingImportData.formatHint,
        passwordInput.trim() === '' ? null : passwordInput
      );
      setPasswordInput('');
      setPendingImportData(null);
      Alert.alert('Importacion completada', `Se restauro la base completa.\n\n${toSummary(rowCountByTable)}`);
    } catch (error: any) {
      const message = String(error?.message ?? 'Error desconocido');
      Alert.alert('Error', `No se pudo importar: ${message}`);
    }
  };

  const runImport = async () => {
    try {
      const selected = await File.pickFileAsync();
      const file = Array.isArray(selected) ? selected[0] : selected;
      if (!file) return;
      const content = await file.text();
      const lowerUri = String(file.uri ?? '').toLowerCase();
      const formatHint: 'nbb' | 'json' | 'csv' = lowerUri.endsWith('.nbb')
        ? 'nbb'
        : lowerUri.endsWith('.json')
          ? 'json'
          : 'csv';
      if (formatHint !== 'nbb' && !importPolicy.allowLegacyImport) {
        Alert.alert('Formato no permitido', importPolicy.legacyBlockedMessage);
        return;
      }
      if (formatHint !== 'nbb' && importPolicy.allowLegacyImport) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Respaldo legacy detectado',
            'El archivo no está cifrado (.json/.csv). Se recomienda migrar a .nbb.\n\n¿Deseas continuar?',
            [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Continuar', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
        if (!proceed) return;
        const rowCountByTable = await importDatabaseBackup(content, formatHint, null);
        Alert.alert('Importacion completada', `Se restauro la base completa.\n\n${toSummary(rowCountByTable)}`);
        return;
      }
      if (formatHint === 'nbb') {
        setPendingImportData({ content, formatHint });
        setShowPasswordModal(true);
      } else {
        const rowCountByTable = await importDatabaseBackup(content, formatHint, null);
        Alert.alert('Importacion completada', `Se restauro la base completa.\n\n${toSummary(rowCountByTable)}`);
      }
    } catch (error: any) {
      const message = String(error?.message ?? 'Error desconocido');
      const wasCancelled = /cancel|canceled|cancelled|abort/i.test(message);
      if (wasCancelled) return;
      Alert.alert('Error', `No se pudo importar: ${message}`);
    }
  };

  const handleImport = () => {
    Alert.alert(
      'Importar respaldo',
      'Esto reemplazara todos los datos actuales del dispositivo con el archivo seleccionado. Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Importar', style: 'destructive', onPress: () => { void runImport(); } },
      ]
    );
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
            <Text className="text-black dark:text-white font-semibold">Exportar respaldo completo</Text>
            <Text className="text-gray-400 text-xs">Incluye toda la base cifrada (.nbb)</Text>
          </View>
          <Text className="text-2xl">📤</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleImport}
          className="bg-white dark:bg-neutral-800 rounded-2xl p-4 flex-row justify-between items-center mb-3">
          <View>
            <Text className="text-black dark:text-white font-semibold">Importar respaldo</Text>
            <Text className="text-gray-400 text-xs">Restaura todo desde archivo</Text>
          </View>
          <Text className="text-2xl">📥</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white dark:bg-neutral-800 rounded-2xl p-4 flex-row justify-between items-center">
          <Text className="text-red-500 font-semibold">Cerrar sesión</Text>
          <Text className="text-2xl">🚪</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={showExportPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowExportPasswordModal(false);
          setExportPasswordInput('');
        }}>
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-sm">
            <ThemedText type="subtitle" className="mb-2">
              Contraseña para exportar
            </ThemedText>
            <Text className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Se usará para envolver la clave maestra del respaldo portátil.
            </Text>
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#999"
              secureTextEntry
              value={exportPasswordInput}
              onChangeText={setExportPasswordInput}
              className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-4 text-black dark:text-white"
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  setShowExportPasswordModal(false);
                  setExportPasswordInput('');
                }}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                <Text className="text-center font-semibold text-gray-700 dark:text-gray-300">
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  void performExportWithPassword();
                }}
                className="flex-1 bg-blue-600 rounded-lg p-3">
                <Text className="text-center font-semibold text-white">Exportar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setPasswordInput('');
        }}>
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white dark:bg-neutral-800 rounded-2xl p-6 w-full max-w-sm">
            <ThemedText type="subtitle" className="mb-2">
              Contraseña del respaldo
            </ThemedText>
            <Text className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Ingresa la contraseña con la que se cifró el archivo:
            </Text>
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#999"
              secureTextEntry
              value={passwordInput}
              onChangeText={setPasswordInput}
              className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-4 text-black dark:text-white"
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                }}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                <Text className="text-center font-semibold text-gray-700 dark:text-gray-300">
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  void performImportWithPassword();
                }}
                className="flex-1 bg-blue-600 rounded-lg p-3">
                <Text className="text-center font-semibold text-white">Importar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

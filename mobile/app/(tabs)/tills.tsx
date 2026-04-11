import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';

import { getTillsWithBalances, createTill, updateTill, deleteTill } from '@/db/repositories/till.repo';
import { ThemedText } from '@/components/themed-text';

const fmt = (val: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

export default function TillsScreen() {
  const router = useRouter();
  const [tills, setTills] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTill, setEditingTill] = useState<any>(null);
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const load = useCallback(async () => {
    const data = await getTillsWithBalances();
    setTills(data);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }
    await createTill(name.trim(), accountNumber.trim());
    closeModal();
    await load();
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }
    await updateTill(editingTill.id, name.trim(), accountNumber.trim());
    closeModal();
    await load();
  };

  const closeModal = () => {
    setName('');
    setAccountNumber('');
    setEditingTill(null);
    setModalVisible(false);
  };

  const openCreate = () => {
    setEditingTill(null);
    setName('');
    setAccountNumber('');
    setModalVisible(true);
  };

  const openEdit = (till: any) => {
    setEditingTill(till);
    setName(till.name ?? '');
    setAccountNumber(till.account_number ?? '');
    setModalVisible(true);
  };

  const confirmDelete = (till: any) => {
    Alert.alert(
      'Eliminar cuenta',
      `¿Eliminar "${till.name}"? Se borrarán todas sus transacciones.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteTill(till.id); await load(); } },
      ]
    );
  };

  const handleLongPress = (till: any) => {
    Alert.alert(till.name, undefined, [
      { text: 'Editar', onPress: () => openEdit(till) },
      { text: 'Eliminar', style: 'destructive', onPress: () => confirmDelete(till) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-900">
      <View className="flex-row justify-between items-center px-4 pt-2 pb-4">
        <ThemedText type="title">Cuentas</ThemedText>
        <TouchableOpacity
          onPress={openCreate}
          className="bg-blue-600 rounded-full w-10 h-10 items-center justify-center">
          <Text className="text-white text-2xl leading-none pb-0.5">+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tills}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text className="text-gray-400 text-center py-10">
            Sin cuentas aún. Agrega una con el botón +
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(tabs)/transactions',
                params: { tillId: item.id, tillName: item.name },
              })
            }
            onLongPress={() => handleLongPress(item)}
            className="bg-white dark:bg-neutral-800 rounded-2xl p-4 mb-3 flex-row justify-between items-center">
            <View>
              <Text className="text-black dark:text-white font-semibold text-base">
                {item.name}
              </Text>
              {item.account_number ? (
                <Text className="text-gray-400 text-xs">{item.account_number}</Text>
              ) : (
                <Text className="text-emerald-500 text-xs">Efectivo</Text>
              )}
            </View>
            <Text
              className={`font-bold text-base ${item.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {fmt(item.balance)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Add Till Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled">
            <View className="bg-white dark:bg-neutral-800 rounded-t-3xl p-6 pb-10">
              <ThemedText type="subtitle" className="mb-4">{editingTill ? 'Editar cuenta' : 'Nueva cuenta'}</ThemedText>
              <TextInput
                placeholder="Nombre (ej. Caja Chica)"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-3 text-black dark:text-white"
              />
              <TextInput
                placeholder="Número de cuenta (opcional — solo si es banco)"
                placeholderTextColor="#9CA3AF"
                value={accountNumber}
                onChangeText={setAccountNumber}
                className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-4 text-black dark:text-white"
              />
              <TouchableOpacity
                onPress={editingTill ? handleUpdate : handleCreate}
                className="bg-blue-600 rounded-xl p-4 mb-3">
                <Text className="text-white text-center font-semibold">Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeModal}>
                <Text className="text-gray-500 text-center">Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

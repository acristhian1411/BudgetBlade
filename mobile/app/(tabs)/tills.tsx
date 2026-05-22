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
import { useFocusEffect, useRouter } from 'expo-router';

import { getTillsWithBalances, createTill, updateTill, deleteTill } from '@/db/repositories/till.repo';
import {
  getAllCreditCards,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
} from '@/db/repositories/credit-card.repo';
import { ThemedText } from '@/components/themed-text';

const fmt = (val: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

export default function TillsScreen() {
  const router = useRouter();
  const [tills, setTills] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [editingTill, setEditingTill] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [cardTillId, setCardTillId] = useState<number | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState('');

  const load = useCallback(async () => {
    const [tillsData, cardsData] = await Promise.all([
      getTillsWithBalances(),
      getAllCreditCards(),
    ]);
    setTills(tillsData);
    setCards(cardsData);
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

  const closeCardModal = () => {
    setCardTillId(null);
    setCardName('');
    setCardLimit('');
    setEditingCard(null);
    setCardModalVisible(false);
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

  const openCreateCard = () => {
    if (tills.length === 0) {
      Alert.alert('Sin cuentas', 'Primero crea una cuenta para asociar la tarjeta.');
      return;
    }
    setEditingCard(null);
    setCardName('');
    setCardLimit('');
    setCardTillId(tills[0]?.id ?? null);
    setCardModalVisible(true);
  };

  const openEditCard = (card: any) => {
    setEditingCard(card);
    setCardTillId(card.till_id);
    setCardName(card.name ?? '');
    setCardLimit(String(card.credit_limit ?? '0'));
    setCardModalVisible(true);
  };

  const handleCreateCard = async () => {
    if (!cardTillId) {
      Alert.alert('Error', 'Selecciona una cuenta.');
      return;
    }
    if (!cardName.trim()) {
      Alert.alert('Error', 'El nombre de la tarjeta es obligatorio.');
      return;
    }
    const numericLimit = Number(cardLimit.replace(',', '.'));
    if (cardLimit.trim() && Number.isNaN(numericLimit)) {
      Alert.alert('Error', 'Ingresa un límite válido.');
      return;
    }

    await createCreditCard({
      tillId: cardTillId,
      name: cardName.trim(),
      creditLimit: cardLimit.trim() ? numericLimit : 0,
    });
    closeCardModal();
    await load();
  };

  const handleUpdateCard = async () => {
    if (!editingCard?.id || !cardTillId) {
      Alert.alert('Error', 'No se pudo editar la tarjeta.');
      return;
    }
    if (!cardName.trim()) {
      Alert.alert('Error', 'El nombre de la tarjeta es obligatorio.');
      return;
    }
    const numericLimit = Number(cardLimit.replace(',', '.'));
    if (cardLimit.trim() && Number.isNaN(numericLimit)) {
      Alert.alert('Error', 'Ingresa un límite válido.');
      return;
    }

    await updateCreditCard(editingCard.id, {
      tillId: cardTillId,
      name: cardName.trim(),
      creditLimit: cardLimit.trim() ? numericLimit : 0,
    });
    closeCardModal();
    await load();
  };

  const confirmDeleteCard = (card: any) => {
    Alert.alert(
      'Eliminar tarjeta',
      `¿Eliminar "${card.name}"? Se quitará la relación con compras anteriores.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteCreditCard(card.id);
            await load();
          },
        },
      ]
    );
  };

  const handleCardLongPress = (card: any) => {
    Alert.alert(card.name, undefined, [
      { text: 'Editar', onPress: () => openEditCard(card) },
      { text: 'Eliminar', style: 'destructive', onPress: () => confirmDeleteCard(card) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
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
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={openCreateCard}
            className="bg-violet-600 rounded-full px-3 h-10 items-center justify-center">
            <Text className="text-white text-xs font-semibold">Tarjeta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openCreate}
            className="bg-blue-600 rounded-full w-10 h-10 items-center justify-center">
            <Text className="text-white text-2xl leading-none pb-0.5">+</Text>
          </TouchableOpacity>
        </View>
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
        ListFooterComponent={
          <View className="pt-3">
            <ThemedText type="defaultSemiBold" className="mb-2">Tarjetas de crédito</ThemedText>
            {cards.length === 0 ? (
              <Text className="text-gray-400 py-3">
                Sin tarjetas. Toca Tarjeta para agregar una.
              </Text>
            ) : (
              cards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  onLongPress={() => handleCardLongPress(card)}
                  activeOpacity={0.8}
                  className="bg-white dark:bg-neutral-800 rounded-2xl p-4 mb-3 border border-violet-100 dark:border-violet-900/40">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-black dark:text-white font-semibold text-base">
                      {card.name}
                    </Text>
                    <Text className="text-violet-600 dark:text-violet-300 font-bold">
                      {fmt(Number(card.pending_debt ?? 0))}
                    </Text>
                  </View>
                  <Text className="text-gray-500 dark:text-gray-300 text-xs mb-1">
                    {card.till_name}
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    Límite: {fmt(Number(card.credit_limit ?? 0))} · Mantener presionado para editar
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        }
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

      <Modal
        visible={cardModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeCardModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/50">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled">
            <View className="bg-white dark:bg-neutral-800 rounded-t-3xl p-6 pb-10">
              <ThemedText type="subtitle" className="mb-4">
                {editingCard ? 'Editar tarjeta' : 'Nueva tarjeta'}
              </ThemedText>

              <ThemedText type="defaultSemiBold" className="mb-2">Cuenta asociada</ThemedText>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {tills.map((till) => (
                  <TouchableOpacity
                    key={till.id}
                    onPress={() => setCardTillId(till.id)}
                    className={`px-3 py-2 rounded-xl border ${
                      cardTillId === till.id
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white dark:bg-neutral-700 border-gray-300 dark:border-neutral-600'
                    }`}>
                    <Text className={cardTillId === till.id ? 'text-white' : 'text-gray-700 dark:text-gray-200'}>
                      {till.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder="Nombre (ej. Visa Itaú)"
                placeholderTextColor="#9CA3AF"
                value={cardName}
                onChangeText={setCardName}
                className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-3 text-black dark:text-white"
              />
              <TextInput
                placeholder="Límite de crédito"
                placeholderTextColor="#9CA3AF"
                value={cardLimit}
                onChangeText={setCardLimit}
                keyboardType="decimal-pad"
                className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-4 text-black dark:text-white"
              />

              <TouchableOpacity
                onPress={editingCard ? handleUpdateCard : handleCreateCard}
                className="bg-violet-600 rounded-xl p-4 mb-3">
                <Text className="text-white text-center font-semibold">Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeCardModal}>
                <Text className="text-gray-500 text-center">Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import {
  getPendingAndOverdue,
  getAllPlans,
  deletePlan,
  createPlanWithInstallments,
  getOccurrencesByPlanId,
} from '@/db/repositories/scheduled.repo';
import {
  getAllEntities,
  createEntity,
  updateEntity,
  deleteEntity,
  getEntitySummary,
} from '@/db/repositories/entity.repo';
import { getAllCategories } from '@/db/repositories/category.repo';
import { getAllTills } from '@/db/repositories/till.repo';

const fmt = (val: number) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(val);

const formatDateStr = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function CompromisosScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'vencimientos' | 'entidades' | 'planes'>(
    'vencimientos'
  );

  // Data states
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tills, setTills] = useState<any[]>([]);

  // Loading and refresh
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showEntityDetailsModal, setShowEntityDetailsModal] = useState(false);

  // Form states
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [entitySummary, setEntitySummary] = useState<any>(null);
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState<'client' | 'provider' | 'both'>('client');
  const [entityContact, setEntityContact] = useState('');

  const [planTitle, setPlanTitle] = useState('');
  const [planType, setPlanType] = useState<'ingreso' | 'egreso'>('egreso');
  const [planCategory, setPlanCategory] = useState<number | null>(null);
  const [planEntity, setPlanEntity] = useState<number | null>(null);
  const [planTill, setPlanTill] = useState<number | null>(null);
  const [planAmount, setPlanAmount] = useState('');
  const [planInstallments, setPlanInstallments] = useState('');
  const [planRecurring, setPlanRecurring] = useState(false);
  const [planStartDate, setPlanStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');

  // Load all data
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [occ, ent, pln, cat, til] = await Promise.all([
        getPendingAndOverdue(),
        getAllEntities(),
        getAllPlans(),
        getAllCategories(),
        getAllTills(),
      ]);
      setOccurrences(occ);
      setEntities(ent);
      setPlans(pln);
      setCategories(cat);
      setTills(til);
    } catch (err) {
      console.warn('Error loading compromises data:', err);
      Alert.alert('Error', 'No se pudo cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Entity management
  const handleCreateEntity = async () => {
    if (!entityName.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la entidad');
      return;
    }
    try {
      await createEntity(entityName, entityType, entityContact);
      setEntityName('');
      setEntityType('client');
      setEntityContact('');
      setShowEntityModal(false);
      await load();
    } catch (err) {
      Alert.alert('Error', 'No se pudo crear la entidad');
    }
  };

  const handleUpdateEntity = async () => {
    if (!entityName.trim() || !selectedEntity) {
      Alert.alert('Error', 'Ingresa un nombre válido');
      return;
    }
    try {
      await updateEntity(selectedEntity.id, entityName, entityType, entityContact);
      setShowEntityModal(false);
      setSelectedEntity(null);
      await load();
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar la entidad');
    }
  };

  const handleDeleteEntity = (entityId: number) => {
    Alert.alert(
      'Eliminar entidad',
      '¿Estás seguro? Se eliminarán todos los planes asociados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntity(entityId);
              await load();
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar la entidad');
            }
          },
        },
      ]
    );
  };

  const showEntityDetailsHandler = async (entity: any) => {
    setSelectedEntity(entity);
    const summary = await getEntitySummary(entity.id);
    setEntitySummary(summary);
    setShowEntityDetailsModal(true);
  };

  // Plan management
  const handleCreatePlan = async () => {
    if (!planTitle.trim() || !planCategory || !planEntity || !planTill) {
      Alert.alert('Error', 'Completa los campos requeridos');
      return;
    }

    if (!planRecurring) {
      if (!planInstallments || isNaN(parseInt(planInstallments, 10)) || parseInt(planInstallments, 10) <= 0) {
        Alert.alert('Error', 'Ingresa una cantidad de cuotas válida');
        return;
      }
    }

    const amount = planAmount ? parseFloat(planAmount.replace(',', '.')) : null;
    if (planAmount && (isNaN(amount!) || amount! <= 0)) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    try {
      await createPlanWithInstallments({
        categoryId: planCategory,
        entityId: planEntity,
        tillId: planTill,
        title: planTitle,
        baseAmount: amount,
        totalInstallments: planRecurring ? null : parseInt(planInstallments, 10),
        startDate: planStartDate.toISOString().split('T')[0],
        type: planType,
      });

      // Reset form
      setPlanTitle('');
      setPlanType('egreso');
      setPlanCategory(null);
      setPlanEntity(null);
      setPlanTill(null);
      setPlanAmount('');
      setPlanInstallments('');
      setPlanRecurring(false);
      setPlanStartDate(new Date());
      setShowPlanModal(false);
      await load();
    } catch (err) {
      console.warn('Error creating plan:', err);
      Alert.alert('Error', 'No se pudo crear el plan');
    }
  };

  const handleDeletePlan = (planId: number) => {
    Alert.alert('Eliminar plan', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePlan(planId);
            await load();
          } catch (err) {
            Alert.alert('Error', 'No se pudo eliminar el plan');
          }
        },
      },
    ]);
  };

  // Render tabs
  const renderVencimientos = () => (
    <FlatList
      data={occurrences}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => {
        const isOverdue = item.status === 'overdue';
        return (
          <TouchableOpacity
            onPress={() => router.push(`/new-transaction?occurrenceId=${item.id}`)}
            activeOpacity={0.7}
            className="bg-white dark:bg-neutral-800 rounded-xl p-4 mb-3 border-l-4"
            style={{
              borderLeftColor: isOverdue ? '#ef4444' : item.type === 'ingreso' ? '#10b981' : '#f59e0b',
            }}>
            <View className="flex-row justify-between mb-2">
              <ThemedText type="defaultSemiBold" className="flex-1 pr-2">
                {item.title}
              </ThemedText>
              {isOverdue && <Text className="text-red-600 font-bold text-xs">VENCIDO</Text>}
            </View>
            <Text className="text-gray-500 dark:text-gray-400 text-sm mb-2">
              {item.entity_name || 'Sin entidad'} • {formatDateStr(item.due_date)}
            </Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600 dark:text-gray-300 text-xs">
                Cuota {item.installment_number}
              </Text>
              {item.amount && (
                <Text className="font-bold text-lg">
                  {item.type === 'ingreso' ? '+' : '−'} {fmt(item.amount)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <Text className="text-gray-400 text-center py-8">Sin vencimientos</Text>
      }
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );

  const renderEntidades = () => (
    <>
      <FlatList
        data={entities}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => {
              Alert.alert('Entidad', item.name, [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Editar',
                  onPress: () => {
                    setSelectedEntity(item);
                    setEntityName(item.name);
                    setEntityType(item.type);
                    setEntityContact(item.contact || '');
                    setShowEntityModal(true);
                  },
                },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: () => handleDeleteEntity(item.id),
                },
              ]);
            }}
            onPress={() => showEntityDetailsHandler(item)}
            className="bg-white dark:bg-neutral-800 rounded-xl p-4 mb-3">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <Text className="text-gray-500 dark:text-gray-400 text-xs capitalize mt-1">
                  {item.type === 'client' ? 'Cliente' : item.type === 'provider' ? 'Proveedor' : 'Ambos'}
                  {item.contact && ` • ${item.contact}`}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text className="text-gray-400 text-center py-8">Sin entidades</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <TouchableOpacity
        onPress={() => {
          setSelectedEntity(null);
          setEntityName('');
          setEntityType('client');
          setEntityContact('');
          setShowEntityModal(true);
        }}
        className="absolute bottom-8 right-6 bg-blue-600 w-16 h-16 rounded-full items-center justify-center"
        style={{
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        }}>
        <Text className="text-white text-4xl leading-none pb-1">+</Text>
      </TouchableOpacity>
    </>
  );

  const renderPlanes = () => (
    <>
      <FlatList
        data={plans}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => handleDeletePlan(item.id)}
            className="bg-white dark:bg-neutral-800 rounded-xl p-4 mb-3">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 pr-2">
                <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                <Text className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  {item.entity_name || 'Sin entidad'}
                </Text>
              </View>
              <View className="items-end">
                {item.total_installments && (
                  <Text className="text-gray-600 dark:text-gray-300 text-xs">
                    {item.processed_count}/{item.total_occurrences}
                  </Text>
                )}
                {!item.total_installments && (
                  <Text className="text-blue-600 dark:text-blue-400 text-xs font-bold">∞</Text>
                )}
              </View>
            </View>

            {item.base_amount && (
              <Text className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                {fmt(item.base_amount)} por cuota
              </Text>
            )}

            <View className="flex-row justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <Text className="text-xs text-gray-500">{formatDateStr(item.start_date)}</Text>
              <Text className="text-xs text-gray-500">{item.category_name}</Text>
            </View>
          </Pressable>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text className="text-gray-400 text-center py-8">Sin planes</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <TouchableOpacity
        onPress={() => {
          setPlanTitle('');
          setPlanType('egreso');
          setPlanCategory(null);
          setPlanEntity(null);
          setPlanTill(null);
          setPlanAmount('');
          setPlanInstallments('');
          setPlanRecurring(false);
          setPlanStartDate(new Date());
          setShowPlanModal(true);
        }}
        className="absolute bottom-8 right-6 bg-blue-600 w-16 h-16 rounded-full items-center justify-center"
        style={{
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
        }}>
        <Text className="text-white text-4xl leading-none pb-1">+</Text>
      </TouchableOpacity>
    </>
  );

  if (loading && occurrences.length === 0 && entities.length === 0 && plans.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-900 items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-neutral-900">
      {/* Segmented control */}
      <View className="flex-row bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
        {(['vencimientos', 'entidades', 'planes'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === tab
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent'
            }`}>
            <Text
              className={`text-sm font-semibold capitalize ${
                activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
              {tab === 'vencimientos' ? 'Vencimientos' : tab === 'entidades' ? 'Entidades' : 'Planes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View className="flex-1 px-4 pt-4">
        {activeTab === 'vencimientos' && renderVencimientos()}
        {activeTab === 'entidades' && renderEntidades()}
        {activeTab === 'planes' && renderPlanes()}
      </View>

      {/* Entity Modal */}
      <Modal visible={showEntityModal} transparent animationType="slide">
        <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View className="flex-row justify-between items-center mb-5">
              <ThemedText type="title">
                {selectedEntity ? 'Editar entidad' : 'Nueva entidad'}
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setShowEntityModal(false);
                  setSelectedEntity(null);
                }}>
                <Text className="text-gray-400 text-xl">✕</Text>
              </TouchableOpacity>
            </View>

            <ThemedText type="defaultSemiBold" className="mb-2">
              Nombre
            </ThemedText>
            <TextInput
              placeholder="Ej. Ande, Supermercado X"
              placeholderTextColor="#9CA3AF"
              value={entityName}
              onChangeText={setEntityName}
              className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-black dark:text-white mb-4"
            />

            <ThemedText type="defaultSemiBold" className="mb-2">
              Tipo
            </ThemedText>
            <View className="flex-row gap-2 mb-4">
              {(['client', 'provider', 'both'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setEntityType(type)}
                  className={`flex-1 py-2 px-3 rounded-lg border ${
                    entityType === type
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                  <Text
                    className={`text-center text-sm capitalize ${
                      entityType === type
                        ? 'text-white font-semibold'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}>
                    {type === 'client' ? 'Cliente' : type === 'provider' ? 'Proveedor' : 'Ambos'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText type="defaultSemiBold" className="mb-2">
              Contacto (opcional)
            </ThemedText>
            <TextInput
              placeholder="Teléfono, email, etc."
              placeholderTextColor="#9CA3AF"
              value={entityContact}
              onChangeText={setEntityContact}
              className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-black dark:text-white mb-6"
            />

            <TouchableOpacity
              onPress={selectedEntity ? handleUpdateEntity : handleCreateEntity}
              className="bg-blue-600 rounded-xl p-4">
              <Text className="text-white text-center font-semibold">
                {selectedEntity ? 'Actualizar' : 'Crear'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Plan Modal */}
      <Modal visible={showPlanModal} transparent animationType="slide">
        <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View className="flex-row justify-between items-center mb-5">
              <ThemedText type="title">Nuevo plan</ThemedText>
              <TouchableOpacity onPress={() => setShowPlanModal(false)}>
                <Text className="text-gray-400 text-xl">✕</Text>
              </TouchableOpacity>
            </View>

            <ThemedText type="defaultSemiBold" className="mb-2">
              Título
            </ThemedText>
            <TextInput
              placeholder="Ej. Cuotas del auto"
              placeholderTextColor="#9CA3AF"
              value={planTitle}
              onChangeText={setPlanTitle}
              className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-black dark:text-white mb-4"
            />

            <ThemedText type="defaultSemiBold" className="mb-2">
              Tipo
            </ThemedText>
            <View className="flex-row gap-2 mb-4">
              {(['ingreso', 'egreso'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setPlanType(type)}
                  className={`flex-1 py-2 px-3 rounded-lg border ${
                    planType === type
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                  <Text
                    className={`text-center text-sm capitalize ${
                      planType === type
                        ? 'text-white font-semibold'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}>
                    {type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText type="defaultSemiBold" className="mb-2">
              Categoría
            </ThemedText>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {categories
                .filter((c) => c.type === (planType === 'ingreso' ? 'income' : 'expense'))
                .map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setPlanCategory(cat.id)}
                    className={`px-3 py-2 rounded-lg border ${
                      planCategory === cat.id
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                    <Text
                      className={`text-xs capitalize ${
                        planCategory === cat.id
                          ? 'text-white font-semibold'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            <ThemedText type="defaultSemiBold" className="mb-2">
              Entidad
            </ThemedText>
            <TouchableOpacity
              onPress={() => { setEntitySearch(''); setShowEntityPicker(true); }}
              className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-4 flex-row justify-between items-center">
              <Text className={planEntity ? 'text-black dark:text-white' : 'text-gray-400'}>
                {planEntity ? (entities.find((e) => e.id === planEntity)?.name ?? 'Seleccionar') : 'Seleccionar entidad'}
              </Text>
              <Text className="text-gray-400 text-xs">▼</Text>
            </TouchableOpacity>

            <ThemedText type="defaultSemiBold" className="mb-2">
              Cuenta
            </ThemedText>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {tills.map((till) => (
                <TouchableOpacity
                  key={till.id}
                  onPress={() => setPlanTill(till.id)}
                  className={`px-3 py-2 rounded-lg border ${
                    planTill === till.id
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                  <Text
                    className={`text-xs ${
                      planTill === till.id
                        ? 'text-white font-semibold'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}>
                    {till.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ThemedText type="defaultSemiBold" className="mb-2">
              Monto por cuota (opcional)
            </ThemedText>
            <TextInput
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              value={planAmount}
              onChangeText={setPlanAmount}
              className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-black dark:text-white mb-4"
            />

            <View className="flex-row items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-neutral-800 rounded-xl">
              <ThemedText type="defaultSemiBold">Recurrente sin fin</ThemedText>
              <Switch value={planRecurring} onValueChange={setPlanRecurring} />
            </View>

            {!planRecurring && (
              <>
                <ThemedText type="defaultSemiBold" className="mb-2">
                  Cantidad de cuotas
                </ThemedText>
                <TextInput
                  placeholder="Ej. 12"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={planInstallments}
                  onChangeText={setPlanInstallments}
                  className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-black dark:text-white mb-4"
                />
              </>
            )}

            <ThemedText type="defaultSemiBold" className="mb-2">
              Fecha de inicio
            </ThemedText>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 mb-4">
              <Text className="text-black dark:text-white">
                {planStartDate.toLocaleDateString('es-PY')}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={planStartDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selected) setPlanStartDate(selected);
                }}
              />
            )}

            <TouchableOpacity onPress={handleCreatePlan} className="bg-blue-600 rounded-xl p-4">
              <Text className="text-white text-center font-semibold">Crear plan</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Entity Picker Modal */}
      <Modal visible={showEntityPicker} transparent animationType="slide">
        <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
            <ThemedText type="subtitle">Seleccionar entidad</ThemedText>
            <TouchableOpacity onPress={() => setShowEntityPicker(false)}>
              <Text className="text-gray-400 text-xl">✕</Text>
            </TouchableOpacity>
          </View>
          <View className="px-4 pb-2">
            <TextInput
              placeholder="Buscar..."
              placeholderTextColor="#9CA3AF"
              value={entitySearch}
              onChangeText={setEntitySearch}
              autoFocus
              className="border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-black dark:text-white"
            />
          </View>
          <FlatList
            data={entities.filter((e) =>
              e.name.toLowerCase().includes(entitySearch.toLowerCase())
            )}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setPlanEntity(item.id);
                  setShowEntityPicker(false);
                }}
                className={`px-4 py-4 border-b border-gray-100 dark:border-neutral-800 flex-row justify-between items-center ${
                  planEntity === item.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}>
                <Text
                  className={`text-base ${
                    planEntity === item.id
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-black dark:text-white'
                  }`}>
                  {item.name}
                </Text>
                {planEntity === item.id && (
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

      {/* Entity Details Modal */}
      <Modal visible={showEntityDetailsModal} transparent animationType="slide">
        <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <View className="flex-row justify-between items-center mb-5">
              <ThemedText type="title">{selectedEntity?.name}</ThemedText>
              <TouchableOpacity onPress={() => setShowEntityDetailsModal(false)}>
                <Text className="text-gray-400 text-xl">✕</Text>
              </TouchableOpacity>
            </View>

            {entitySummary && (
              <>
                <View className="grid gap-3 mb-6">
                  <View className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <Text className="text-red-700 dark:text-red-300 text-xs mb-1">Deuda (Egreso pendiente)</Text>
                    <Text className="text-red-800 dark:text-red-100 text-2xl font-bold">
                      {fmt(entitySummary.pendingEgreso)}
                    </Text>
                  </View>

                  <View className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <Text className="text-green-700 dark:text-green-300 text-xs mb-1">Por cobrar (Ingreso pendiente)</Text>
                    <Text className="text-green-800 dark:text-green-100 text-2xl font-bold">
                      {fmt(entitySummary.pendingIngreso)}
                    </Text>
                  </View>

                  <View className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                    <Text className="text-amber-700 dark:text-amber-300 text-xs mb-1">Pagado (Egreso)</Text>
                    <Text className="text-amber-800 dark:text-amber-100 text-xl font-bold">
                      {fmt(entitySummary.processedEgreso)}
                    </Text>
                  </View>

                  <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <Text className="text-blue-700 dark:text-blue-300 text-xs mb-1">Cobrado (Ingreso)</Text>
                    <Text className="text-blue-800 dark:text-blue-100 text-xl font-bold">
                      {fmt(entitySummary.processedIngreso)}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const Platform = require('react-native').Platform;

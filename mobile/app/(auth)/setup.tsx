import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth.context';
import { ThemedText } from '@/components/themed-text';

export default function SetupScreen() {
  const { register } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (password.length < 4) {
      Alert.alert('Error', 'La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    await register(password);
    // AuthContext redirects to (tabs) after register
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center p-6">
        <Text className="text-5xl text-center mb-2">💰</Text>
        <ThemedText type="title" className="text-center mb-1">
          BudgetBlade
        </ThemedText>
        <ThemedText className="text-center text-gray-500 mb-8">
          Configura tu contraseña para comenzar
        </ThemedText>

        <TextInput
          placeholder="Nueva contraseña"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          className="border border-gray-300 dark:border-gray-600 rounded-xl p-4 mb-3 text-black dark:text-white"
        />
        <TextInput
          placeholder="Confirmar contraseña"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showPassword}
          value={confirm}
          onChangeText={setConfirm}
          onSubmitEditing={handleRegister}
          returnKeyType="done"
          className="border border-gray-300 dark:border-gray-600 rounded-xl p-4 mb-2 text-black dark:text-white"
        />

        <TouchableOpacity
          onPress={() => setShowPassword((v) => !v)}
          className="mb-5 self-end">
          <Text className="text-blue-500 text-sm">
            {showPassword ? 'Ocultar' : 'Mostrar'} contraseña
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRegister}
          className="bg-blue-600 rounded-xl p-4">
          <Text className="text-white text-center font-semibold text-base">
            Crear contraseña
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

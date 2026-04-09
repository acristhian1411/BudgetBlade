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

export default function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    const ok = await login(password);
    if (!ok) Alert.alert('Error', 'Contraseña incorrecta. Intenta de nuevo.');
    // AuthContext redirects to (tabs) on success
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
          Ingresa tu contraseña para continuar
        </ThemedText>

        <View className="relative mb-5">
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
            className="border border-gray-300 dark:border-gray-600 rounded-xl p-4 pr-24 text-black dark:text-white"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-4">
            <Text className="text-blue-500 text-sm">
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleLogin} className="bg-blue-600 rounded-xl p-4">
          <Text className="text-white text-center font-semibold text-base">Ingresar</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

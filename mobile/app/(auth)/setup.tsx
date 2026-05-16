import { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Image,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidPassword = (value: string) => {
    if (value.length < 8) return false;
    const hasLetter = /[A-Za-z]/.test(value);
    const hasNumber = /\d/.test(value);
    return hasLetter && hasNumber;
  };

  const handleRegister = async () => {
    if (isSubmitting) return;

    if (!isValidPassword(password)) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres e incluir letras y números.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(password);
      // AuthContext redirects to (tabs) after register
    } catch (error: any) {
      Alert.alert('Error', `No se pudo crear el usuario: ${String(error?.message ?? 'error desconocido')}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
      <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1 justify-center p-6">
              <Image
                source={require('../../assets/images/budgetblade-logo.jpeg')}
                className="w-36 h-36 self-center mb-4"
                resizeMode="contain"
              />
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
          disabled={isSubmitting}
          className={`rounded-xl p-4 ${isSubmitting ? 'bg-blue-300' : 'bg-blue-600'}`}>
          <Text className="text-white text-center font-semibold text-base">
            {isSubmitting ? 'Generando claves...' : 'Crear contraseña'}
          </Text>
          {isSubmitting && (
            <Text className="text-white text-center text-xs mt-1">
              Preparando seguridad, un momento...
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth.context';
import { ThemedText } from '@/components/themed-text';
import { isQuickUnlockEnabled } from '@/services/biometric.service';

export default function LoginScreen() {
  const { login, getLockStatus, unlockWithBiometrics } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickUnlockAvailable, setQuickUnlockAvailable] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const lockedSeconds = useMemo(() => Math.ceil(remainingMs / 1000), [remainingMs]);
  const isLocked = remainingMs > 0;

  useEffect(() => {
    const loadLockStatus = async () => {
      const status = await getLockStatus();
      setRemainingMs(status.remainingMs);
    };

    void loadLockStatus();
  }, [getLockStatus]);

  useEffect(() => {
    if (remainingMs <= 0) return;

    const timer = setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingMs]);

  const handleBiometricUnlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    try {
      const result = await unlockWithBiometrics();
      if (result.status === 'unavailable') {
        setQuickUnlockAvailable(false);
      }
    } catch {
      setQuickUnlockAvailable(false);
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    (async () => {
      const enabled = await isQuickUnlockEnabled();
      setQuickUnlockAvailable(enabled);
      if (enabled) {
        void handleBiometricUnlock();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    if (isSubmitting) return;

    if (isLocked) {
      Alert.alert('Intenta más tarde', `Demasiados intentos. Espera ${lockedSeconds}s.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(password);
      if (result.ok) return;

      const nextRemainingMs = result.remainingMs ?? 0;
      setRemainingMs(nextRemainingMs);

      if (result.reason === 'key-unlock-failed') {
        Alert.alert('Error de seguridad', 'No se pudo desbloquear la clave de seguridad local.');
        return;
      }

      if (nextRemainingMs > 0) {
        Alert.alert('Bloqueo temporal', `Demasiados intentos fallidos. Espera ${Math.ceil(nextRemainingMs / 1000)}s.`);
        return;
      }

      Alert.alert('Error', 'Contraseña incorrecta. Intenta de nuevo.');
    } catch (error: any) {
      Alert.alert('Error', `No se pudo iniciar sesión: ${String(error?.message ?? 'error desconocido')}`);
    } finally {
      setIsSubmitting(false);
    }
    // AuthContext redirects to (tabs) on success
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
          Ingresa tu contraseña para continuar
        </ThemedText>

        {quickUnlockAvailable ? (
          <TouchableOpacity
            onPress={handleBiometricUnlock}
            disabled={unlocking}
            className="mb-5 rounded-xl p-4 bg-blue-600/10 border border-blue-600">
            <Text className="text-blue-600 text-center font-semibold text-base">
              {unlocking ? 'Desbloqueando...' : 'Desbloquear con huella / PIN'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View className="relative mb-5">
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
            editable={!isLocked}
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

        {isLocked ? (
          <Text className="text-red-500 text-center mb-4">
            Login bloqueado temporalmente. Reintenta en {lockedSeconds}s.
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={handleLogin}
          disabled={isLocked || isSubmitting}
          className={`rounded-xl p-4 ${isLocked || isSubmitting ? 'bg-blue-300' : 'bg-blue-600'}`}>
          <Text className="text-white text-center font-semibold text-base">
            {isSubmitting ? 'Procesando seguridad...' : isLocked ? `Bloqueado ${lockedSeconds}s` : 'Ingresar'}
          </Text>
          {isSubmitting && (
            <Text className="text-white text-center text-xs mt-1">
              Por favor espera, verificando credenciales...
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

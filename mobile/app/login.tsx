import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!pin.trim()) {
      Alert.alert('Error', 'Please enter your PIN');
      return;
    }

    setLoading(true);
    try {
      await login(pin);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.detail || 'Invalid PIN. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Ionicons name="school" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.title}>GATE Tracker</Text>
            <Text style={styles.subtitle}>Your Personal GATE Prep Companion</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Enter your PIN</Text>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="••••••"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              autoFocus
            />

            <Button
              title={loading ? 'Signing in...' : 'Sign In'}
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="large"
            />
          </View>

          {/* Hint */}
          <View style={styles.hintContainer}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.hint}>Default PIN: 123456</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  hintContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
});

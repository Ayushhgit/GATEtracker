import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'large',
  message,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size={size} color={Colors.primary} />
      </View>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );

  if (fullScreen) {
    return (
      <LinearGradient
        colors={Colors.gradientDark as [string, string]}
        style={styles.fullScreenWrapper}
      >
        {content}
      </LinearGradient>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  fullScreenWrapper: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
  },
  spinnerContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  message: {
    marginTop: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});

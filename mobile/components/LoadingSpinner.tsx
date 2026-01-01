import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes } from '@/constants';

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
      <ActivityIndicator size={size} color={Colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreenWrapper}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  fullScreenWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fullScreen: {
    flex: 1,
  },
  message: {
    marginTop: Spacing.lg,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});

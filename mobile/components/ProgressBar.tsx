import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

interface ProgressBarProps {
  progress: number; // 0 to 1
  label?: string;
  showPercentage?: boolean;
  color?: string;
  height?: number;
  useGradient?: boolean;
  gradientColors?: [string, string];
}

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  color = Colors.primary,
  height = 8,
  useGradient = true,
  gradientColors,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const defaultGradient: [string, string] = gradientColors || [color, Colors.accent];

  return (
    <View style={styles.container}>
      {(label || showPercentage) && (
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercentage && (
            <Text style={styles.percentage}>
              {Math.round(clampedProgress * 100)}%
            </Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        {useGradient ? (
          <LinearGradient
            colors={defaultGradient}
            style={[
              styles.fill,
              {
                width: `${clampedProgress * 100}%`,
                height,
              },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        ) : (
          <View
            style={[
              styles.fill,
              {
                width: `${clampedProgress * 100}%`,
                backgroundColor: color,
                height,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  percentage: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  track: {
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: BorderRadius.sm,
  },
});

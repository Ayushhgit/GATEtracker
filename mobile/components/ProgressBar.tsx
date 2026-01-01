import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  height?: number;
  showValue?: boolean;
  total?: number;
  completed?: number;
}

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  color = Colors.primary,
  height = 6,
  showValue = false,
  total,
  completed,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={styles.container}>
      {(label || showPercentage || showValue) && (
        <View style={styles.labelRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          <View style={styles.rightLabel}>
            {showValue && total !== undefined && completed !== undefined && (
              <Text style={styles.valueText}>{completed}/{total}</Text>
            )}
            {showPercentage && (
              <Text style={[styles.percentage, { color }]}>
                {Math.round(clampedProgress * 100)}%
              </Text>
            )}
          </View>
        </View>
      )}
      <View style={[styles.track, { height }]}>
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
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  rightLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  valueText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  percentage: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  track: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: BorderRadius.full,
  },
});

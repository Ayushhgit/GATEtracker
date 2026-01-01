import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  compact?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = Colors.primary,
  trend,
  compact = false,
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    const iconName = trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : 'remove';
    const color = trend === 'up' ? Colors.success : trend === 'down' ? Colors.error : Colors.textTertiary;
    return (
      <View style={[styles.trendBadge, { backgroundColor: color + '15' }]}>
        <Ionicons name={iconName} size={12} color={color} />
      </View>
    );
  };

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={icon} size={compact ? 16 : 18} color={iconColor} />
          </View>
        )}
        {getTrendIcon()}
      </View>
      <Text style={[styles.value, compact && styles.compactValue]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compactContainer: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  compactValue: {
    fontSize: FontSizes.xl,
  },
  title: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});

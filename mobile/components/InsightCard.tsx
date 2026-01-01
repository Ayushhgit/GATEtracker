import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Insight } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
  onDismiss?: () => void;
}

export function InsightCard({ insight, onPress, onDismiss }: InsightCardProps) {
  const getTypeConfig = () => {
    switch (insight.insight_type) {
      case 'weak_subject':
        return { icon: 'alert-circle' as const, color: Colors.error, bg: Colors.errorMuted };
      case 'consistency_drop':
        return { icon: 'trending-down' as const, color: Colors.warning, bg: Colors.warningMuted };
      case 'overload':
        return { icon: 'warning' as const, color: Colors.error, bg: Colors.errorMuted };
      case 'missed_revision':
        return { icon: 'refresh' as const, color: Colors.warning, bg: Colors.warningMuted };
      case 'strength':
        return { icon: 'star' as const, color: Colors.success, bg: Colors.successMuted };
      case 'recommendation':
        return { icon: 'bulb' as const, color: Colors.primary, bg: Colors.primaryMuted };
      default:
        return { icon: 'information-circle' as const, color: Colors.info, bg: Colors.infoMuted };
    }
  };

  const config = getTypeConfig();

  return (
    <TouchableOpacity
      style={[styles.container, insight.priority === 1 && styles.highPriority]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {insight.title}
          </Text>
          {!insight.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {insight.content}
        </Text>
        <Text style={[styles.type, { color: config.color }]}>
          {insight.insight_type.replace(/_/g, ' ')}
        </Text>
      </View>

      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton} hitSlop={8}>
          <Ionicons name="close" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  highPriority: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  type: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dismissButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
    alignSelf: 'flex-start',
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Insight } from '@/types';
import { Colors, Spacing, FontSizes } from '@/constants';

interface InsightCardProps {
  insight: Insight;
  onPress?: () => void;
  onDismiss?: () => void;
}

export function InsightCard({ insight, onPress, onDismiss }: InsightCardProps) {
  const getTypeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (insight.insight_type) {
      case 'weak_subject':
        return 'alert-circle';
      case 'consistency_drop':
        return 'trending-down';
      case 'overload':
        return 'warning';
      case 'missed_revision':
        return 'refresh';
      case 'strength':
        return 'star';
      case 'recommendation':
        return 'bulb';
      default:
        return 'information-circle';
    }
  };

  const getTypeColor = () => {
    switch (insight.insight_type) {
      case 'weak_subject':
      case 'overload':
        return Colors.error;
      case 'consistency_drop':
      case 'missed_revision':
        return Colors.warning;
      case 'strength':
        return Colors.success;
      default:
        return Colors.primary;
    }
  };

  const getPriorityBorder = () => {
    if (insight.priority === 1) {
      return { borderLeftColor: Colors.error, borderLeftWidth: 4 };
    }
    return {};
  };

  return (
    <TouchableOpacity
      style={[styles.container, getPriorityBorder()]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getTypeColor() + '15' }]}>
          <Ionicons name={getTypeIcon()} size={20} color={getTypeColor()} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {insight.title}
          </Text>
          <Text style={styles.type}>
            {insight.insight_type.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.content} numberOfLines={3}>
        {insight.content}
      </Text>
      {!insight.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  type: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dismissButton: {
    padding: Spacing.xs,
  },
  content: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});

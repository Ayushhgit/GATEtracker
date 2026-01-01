import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Insight } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

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

  const getGradientColors = (): [string, string] => {
    const color = getTypeColor();
    return [color + '30', color + '10'];
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Priority indicator */}
      {insight.priority === 1 && (
        <LinearGradient
          colors={[Colors.error, Colors.error + '60']}
          style={styles.priorityBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      )}

      <View style={styles.header}>
        <LinearGradient
          colors={getGradientColors()}
          style={styles.iconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={getTypeIcon()} size={20} color={getTypeColor()} />
        </LinearGradient>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {insight.title}
          </Text>
          <Text style={[styles.type, { color: getTypeColor() }]}>
            {insight.insight_type.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.content} numberOfLines={3}>
        {insight.content}
      </Text>
      {!insight.is_read && (
        <View style={styles.unreadDot}>
          <LinearGradient
            colors={Colors.gradientPrimary as [string, string]}
            style={styles.unreadDotInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  priorityBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
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
    marginTop: 2,
    fontWeight: '600',
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
    width: 10,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  unreadDotInner: {
    flex: 1,
  },
});

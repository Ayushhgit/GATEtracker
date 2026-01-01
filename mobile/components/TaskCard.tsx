import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskStatus } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  showDate?: boolean;
  compact?: boolean;
}

export function TaskCard({ task, onPress, onStatusChange, showDate = false, compact = false }: TaskCardProps) {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={24} color={Colors.completed} />;
      case 'skipped':
        return <Ionicons name="close-circle" size={24} color={Colors.skipped} />;
      case 'in_progress':
        return <Ionicons name="play-circle" size={24} color={Colors.in_progress} />;
      default:
        return <Ionicons name="radio-button-off" size={24} color={Colors.textTertiary} />;
    }
  };

  const handleStatusToggle = () => {
    if (!onStatusChange) return;
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    onStatusChange(nextStatus);
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 1: return Colors.highPriority;
      case 2: return Colors.mediumPriority;
      default: return Colors.lowPriority;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        task.status === 'completed' && styles.completedContainer,
        compact && styles.compactContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Priority indicator */}
      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor() }]} />

      <Pressable onPress={handleStatusToggle} style={styles.statusButton} hitSlop={8}>
        {getStatusIcon()}
      </Pressable>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            task.status === 'completed' && styles.completedTitle,
          ]}
          numberOfLines={compact ? 1 : 2}
        >
          {task.title}
        </Text>

        <View style={styles.metaContainer}>
          {task.subject && (
            <View style={[styles.subjectBadge, { backgroundColor: task.subject.color + '20' }]}>
              <View style={[styles.subjectDot, { backgroundColor: task.subject.color }]} />
              <Text style={[styles.subjectText, { color: task.subject.color }]} numberOfLines={1}>
                {task.subject.short_name || task.subject.name.substring(0, 12)}
              </Text>
            </View>
          )}

          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.timeText}>{task.estimated_minutes}m</Text>
          </View>

          {showDate && (
            <Text style={styles.dateText}>
              {new Date(task.scheduled_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          )}

          {task.is_revision && (
            <View style={styles.revisionBadge}>
              <Ionicons name="refresh" size={10} color={Colors.primary} />
              <Text style={styles.revisionText}>Rev</Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completedContainer: {
    opacity: 0.6,
  },
  compactContainer: {
    padding: Spacing.md,
  },
  priorityIndicator: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 2,
  },
  statusButton: {
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  subjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subjectText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  revisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.primaryMuted,
    gap: 3,
  },
  revisionText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
});

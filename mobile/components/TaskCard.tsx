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
import { Colors, Spacing, FontSizes } from '@/constants';

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  showDate?: boolean;
}

export function TaskCard({ task, onPress, onStatusChange, showDate = false }: TaskCardProps) {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={24} color={Colors.completed} />;
      case 'skipped':
        return <Ionicons name="close-circle" size={24} color={Colors.skipped} />;
      case 'in_progress':
        return <Ionicons name="time" size={24} color={Colors.in_progress} />;
      default:
        return <Ionicons name="ellipse-outline" size={24} color={Colors.pending} />;
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
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Pressable onPress={handleStatusToggle} style={styles.statusButton}>
        {getStatusIcon()}
      </Pressable>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            task.status === 'completed' && styles.completedTitle,
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        <View style={styles.metaRow}>
          {task.subject && (
            <View
              style={[
                styles.subjectBadge,
                { backgroundColor: task.subject.color + '20' },
              ]}
            >
              <Text style={[styles.subjectText, { color: task.subject.color }]}>
                {task.subject.short_name || task.subject.name}
              </Text>
            </View>
          )}

          {task.topic && (
            <Text style={styles.topic} numberOfLines={1}>
              {task.topic}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.timeText}>
              {task.estimated_minutes} min
            </Text>
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
              <Ionicons name="refresh" size={12} color={Colors.primary} />
              <Text style={styles.revisionText}>Revision</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor() }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  completedContainer: {
    opacity: 0.7,
    backgroundColor: Colors.background,
  },
  statusButton: {
    marginRight: Spacing.md,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  subjectBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  subjectText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  topic: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  timeText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginRight: Spacing.md,
  },
  revisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  revisionText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginLeft: 4,
  },
  priorityIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
});

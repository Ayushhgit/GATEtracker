import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '@/services/api';
import { Task, Subject, TaskStatus } from '@/types';
import { Button, LoadingSpinner } from '@/components';
import { Colors, Spacing, FontSizes, StatusLabels, PriorityLabels } from '@/constants';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [estimatedMinutes, setEstimatedMinutes] = useState('60');
  const [priority, setPriority] = useState(2);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [taskData, subjectsData] = await Promise.all([
        api.getTask(Number(id)),
        api.getSubjects(),
      ]);
      setTask(taskData);
      setSubjects(subjectsData);

      // Set initial values
      setTitle(taskData.title);
      setDescription(taskData.description || '');
      setTopic(taskData.topic || '');
      setScheduledDate(new Date(taskData.scheduled_date));
      setEstimatedMinutes(String(taskData.estimated_minutes));
      setPriority(taskData.priority);
      setSubjectId(taskData.subject_id);
      setNotes(taskData.notes || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load task');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      await api.updateTask(Number(id), {
        title: title.trim(),
        description: description.trim() || undefined,
        topic: topic.trim() || undefined,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        estimated_minutes: parseInt(estimatedMinutes) || 60,
        priority,
        subject_id: subjectId || undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert('Success', 'Task updated');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      await api.updateTaskStatus(Number(id), newStatus);
      setTask((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteTask(Number(id));
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading task..." />;
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Text>Task not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Badge */}
      <View style={styles.statusSection}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {(['pending', 'in_progress', 'completed', 'skipped'] as TaskStatus[]).map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  task.status === status && styles.statusButtonActive,
                  task.status === status && {
                    backgroundColor: Colors[status] + '20',
                    borderColor: Colors[status],
                  },
                ]}
                onPress={() => handleStatusChange(status)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    task.status === status && { color: Colors[status] },
                  ]}
                >
                  {StatusLabels[status]}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Task title"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Subject */}
      <View style={styles.field}>
        <Text style={styles.label}>Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.subjectRow}>
            <TouchableOpacity
              style={[
                styles.subjectChip,
                !subjectId && styles.subjectChipActive,
              ]}
              onPress={() => setSubjectId(null)}
            >
              <Text
                style={[
                  styles.subjectChipText,
                  !subjectId && styles.subjectChipTextActive,
                ]}
              >
                None
              </Text>
            </TouchableOpacity>
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                style={[
                  styles.subjectChip,
                  subjectId === subject.id && {
                    backgroundColor: subject.color + '20',
                    borderColor: subject.color,
                  },
                ]}
                onPress={() => setSubjectId(subject.id)}
              >
                <View
                  style={[styles.subjectDot, { backgroundColor: subject.color }]}
                />
                <Text
                  style={[
                    styles.subjectChipText,
                    subjectId === subject.id && { color: subject.color },
                  ]}
                >
                  {subject.short_name || subject.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Topic */}
      <View style={styles.field}>
        <Text style={styles.label}>Topic</Text>
        <TextInput
          style={styles.input}
          value={topic}
          onChangeText={setTopic}
          placeholder="Specific topic"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Add description..."
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Date */}
      <View style={styles.field}>
        <Text style={styles.label}>Scheduled Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color={Colors.primary} />
          <Text style={styles.dateButtonText}>
            {scheduledDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setScheduledDate(date);
            }}
          />
        )}
      </View>

      {/* Estimated Time */}
      <View style={styles.field}>
        <Text style={styles.label}>Estimated Time (minutes)</Text>
        <TextInput
          style={styles.input}
          value={estimatedMinutes}
          onChangeText={setEstimatedMinutes}
          placeholder="60"
          keyboardType="number-pad"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Priority */}
      <View style={styles.field}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {[1, 2, 3].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.priorityButton,
                priority === p && styles.priorityButtonActive,
                priority === p && {
                  backgroundColor:
                    p === 1
                      ? Colors.highPriority + '20'
                      : p === 2
                      ? Colors.mediumPriority + '20'
                      : Colors.lowPriority + '20',
                  borderColor:
                    p === 1
                      ? Colors.highPriority
                      : p === 2
                      ? Colors.mediumPriority
                      : Colors.lowPriority,
                },
              ]}
              onPress={() => setPriority(p)}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  priority === p && {
                    color:
                      p === 1
                        ? Colors.highPriority
                        : p === 2
                        ? Colors.mediumPriority
                        : Colors.lowPriority,
                  },
                ]}
              >
                {PriorityLabels[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.field}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes..."
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Meta Info */}
      <View style={styles.metaSection}>
        <Text style={styles.metaText}>
          Created: {new Date(task.created_at).toLocaleString()}
        </Text>
        <Text style={styles.metaText}>
          Source: {task.source === 'llm' ? 'AI Generated' : 'Manual'}
        </Text>
        {task.is_revision && (
          <Text style={[styles.metaText, { color: Colors.primary }]}>
            Revision Task
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          fullWidth
        />
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash" size={20} color={Colors.error} />
          <Text style={styles.deleteButtonText}>Delete Task</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  statusSection: {
    marginBottom: Spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statusButtonActive: {
    borderWidth: 2,
  },
  statusButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  subjectRow: {
    flexDirection: 'row',
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  subjectChipActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  subjectChipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  subjectChipTextActive: {
    color: Colors.primary,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateButtonText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  priorityRow: {
    flexDirection: 'row',
  },
  priorityButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  priorityButtonActive: {
    borderWidth: 2,
  },
  priorityButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  metaSection: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metaText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  actions: {
    marginTop: Spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  deleteButtonText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    marginLeft: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

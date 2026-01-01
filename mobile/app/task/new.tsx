import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '@/services/api';
import { Subject } from '@/types';
import { Button, LoadingSpinner } from '@/components';
import { Colors, Spacing, FontSizes, PriorityLabels } from '@/constants';

export default function NewTaskScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    date ? new Date(date) : new Date()
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState('60');
  const [priority, setPriority] = useState(2);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [isRevision, setIsRevision] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await api.getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
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
      await api.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        topic: topic.trim() || undefined,
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        estimated_minutes: parseInt(estimatedMinutes) || 60,
        priority,
        subject_id: subjectId || undefined,
        is_revision: isRevision,
        source: 'manual',
      });
      Alert.alert('Success', 'Task created');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="What do you need to study?"
          placeholderTextColor={Colors.textLight}
          autoFocus
        />
      </View>

      {/* Subject */}
      <View style={styles.field}>
        <Text style={styles.label}>Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[
                styles.chip,
                !subjectId && styles.chipActive,
              ]}
              onPress={() => setSubjectId(null)}
            >
              <Text
                style={[
                  styles.chipText,
                  !subjectId && styles.chipTextActive,
                ]}
              >
                None
              </Text>
            </TouchableOpacity>
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                style={[
                  styles.chip,
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
                    styles.chipText,
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
          placeholder="Specific topic (e.g., Binary Trees, Deadlocks)"
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
          placeholder="Add details about what to cover..."
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
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setScheduledDate(date);
            }}
          />
        )}
      </View>

      {/* Estimated Time */}
      <View style={styles.field}>
        <Text style={styles.label}>Estimated Time (minutes)</Text>
        <View style={styles.timeRow}>
          {[30, 60, 90, 120].map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.timeChip,
                estimatedMinutes === String(time) && styles.timeChipActive,
              ]}
              onPress={() => setEstimatedMinutes(String(time))}
            >
              <Text
                style={[
                  styles.timeChipText,
                  estimatedMinutes === String(time) && styles.timeChipTextActive,
                ]}
              >
                {time} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.input, { marginTop: Spacing.sm }]}
          value={estimatedMinutes}
          onChangeText={setEstimatedMinutes}
          placeholder="Or enter custom duration"
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

      {/* Revision Toggle */}
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => setIsRevision(!isRevision)}
      >
        <View style={styles.toggleInfo}>
          <Ionicons
            name="refresh"
            size={20}
            color={isRevision ? Colors.primary : Colors.textSecondary}
          />
          <Text style={styles.toggleLabel}>This is a revision task</Text>
        </View>
        <View
          style={[
            styles.toggle,
            isRevision && styles.toggleActive,
          ]}
        >
          <View
            style={[
              styles.toggleKnob,
              isRevision && styles.toggleKnobActive,
            ]}
          />
        </View>
      </TouchableOpacity>

      {/* Save Button */}
      <View style={styles.actions}>
        <Button
          title="Create Task"
          onPress={handleSave}
          loading={saving}
          fullWidth
          size="large"
        />
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
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
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
  chipActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  chipTextActive: {
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
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  timeChipActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  timeChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
  },
  actions: {
    marginTop: Spacing.md,
  },
});

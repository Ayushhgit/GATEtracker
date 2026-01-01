import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '@/services/api';
import { Button, LoadingSpinner } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants';

const EXAMPLE_PLAN = `GATE CSE 2025 Preparation Plan

Month 1-2: Foundation Phase
- Data Structures: Arrays, Linked Lists, Stacks, Queues
- Programming: C programming basics, pointers
- Mathematics: Discrete Mathematics fundamentals

Month 3-4: Core Subjects
- Operating Systems: Process management, Memory management
- DBMS: SQL, Normalization, Transactions
- Computer Networks: OSI model, TCP/IP

Month 5-6: Advanced Topics
- Theory of Computation: Automata, Regular languages
- Compiler Design: Lexical analysis, Parsing
- Computer Organization: CPU design, Memory hierarchy

Month 7-8: Practice & Revision
- Previous year questions
- Mock tests
- Topic-wise revision`;

export default function PlannerScreen() {
  const router = useRouter();
  const [planText, setPlanText] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() + 1))
  );
  const [loading, setLoading] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleParsePlan = async () => {
    if (!planText.trim()) {
      Alert.alert('Error', 'Please paste your study plan');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await api.createFromPlan(
        planText,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      setResult(data);
      Alert.alert(
        'Success!',
        `Created ${data.tasks_created} tasks from your plan.`,
        [
          { text: 'View Tasks', onPress: () => router.replace('/(tabs)/today') },
          { text: 'Stay Here', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      console.error('Failed to parse plan:', error);
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to parse plan. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setPlanText(EXAMPLE_PLAN);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="sparkles" size={32} color={Colors.primary} />
        <Text style={styles.headerTitle}>AI Plan Generator</Text>
        <Text style={styles.headerSubtitle}>
          Paste your GATE preparation plan and let AI convert it into actionable daily tasks
        </Text>
      </View>

      {/* Date Range */}
      <View style={styles.dateSection}>
        <Text style={styles.sectionTitle}>Study Period</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateLabel}>Start</Text>
            <Text style={styles.dateValue}>
              {startDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          <Ionicons name="arrow-forward" size={20} color={Colors.textSecondary} />
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateLabel}>End</Text>
            <Text style={styles.dateValue}>
              {endDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
        </View>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowStartPicker(Platform.OS === 'ios');
              if (date) setStartDate(date);
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={startDate}
            onChange={(event, date) => {
              setShowEndPicker(Platform.OS === 'ios');
              if (date) setEndDate(date);
            }}
          />
        )}
      </View>

      {/* Plan Input */}
      <View style={styles.inputSection}>
        <View style={styles.inputHeader}>
          <Text style={styles.sectionTitle}>Your Study Plan</Text>
          <TouchableOpacity onPress={loadExample}>
            <Text style={styles.exampleLink}>Load Example</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.planInput}
          value={planText}
          onChangeText={setPlanText}
          placeholder="Paste your GATE preparation plan here...

Example formats:
- Monthly roadmaps
- Subject-wise breakdowns
- Topic lists with timelines
- Yearly preparation schedules

The AI will understand and convert it to daily tasks."
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={15}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {planText.length} characters
        </Text>
      </View>

      {/* Generate Button */}
      <View style={styles.actions}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner message="AI is analyzing your plan and creating tasks..." />
          </View>
        ) : (
          <Button
            title="Generate Tasks with AI"
            onPress={handleParsePlan}
            fullWidth
            size="large"
          />
        )}
      </View>

      {/* Result */}
      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.resultTitle}>Plan Processed!</Text>
          </View>
          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{result.tasks_created}</Text>
              <Text style={styles.resultStatLabel}>Tasks Created</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>
                {result.subjects_identified?.length || 0}
              </Text>
              <Text style={styles.resultStatLabel}>Subjects Found</Text>
            </View>
          </View>
          {result.subjects_identified && result.subjects_identified.length > 0 && (
            <View style={styles.subjectsFound}>
              <Text style={styles.subjectsLabel}>Subjects:</Text>
              <View style={styles.subjectTags}>
                {result.subjects_identified.map((subject: string, index: number) => (
                  <View key={index} style={styles.subjectTag}>
                    <Text style={styles.subjectTagText}>{subject}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Tips for better results:</Text>
        <View style={styles.tip}>
          <Ionicons name="checkmark" size={16} color={Colors.success} />
          <Text style={styles.tipText}>Include specific topics and subjects</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark" size={16} color={Colors.success} />
          <Text style={styles.tipText}>Mention timeframes (monthly, weekly)</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark" size={16} color={Colors.success} />
          <Text style={styles.tipText}>Use clear subject names (OS, DBMS, DSA)</Text>
        </View>
        <View style={styles.tip}>
          <Ionicons name="checkmark" size={16} color={Colors.success} />
          <Text style={styles.tipText}>Include revision periods</Text>
        </View>
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
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  dateSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  dateValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 4,
  },
  inputSection: {
    marginBottom: Spacing.lg,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  exampleLink: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  planInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 250,
  },
  charCount: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  actions: {
    marginBottom: Spacing.lg,
  },
  loadingContainer: {
    padding: Spacing.lg,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.success + '50',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resultTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  resultStats: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  resultStat: {
    flex: 1,
    alignItems: 'center',
  },
  resultStatValue: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.primary,
  },
  resultStatLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  subjectsFound: {
    marginTop: Spacing.sm,
  },
  subjectsLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  subjectTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subjectTag: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  subjectTagText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  tipsSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
  },
  tipsTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  tipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
});

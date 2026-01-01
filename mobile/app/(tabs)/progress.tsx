import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ProgressSummary } from '@/types';
import { LoadingSpinner, ProgressBar, StatCard } from '@/components';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchProgress = async () => {
    try {
      const data = await api.getProgressSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
      Alert.alert('Error', 'Failed to load progress data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProgress();
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading progress..." />;
  }

  if (!summary) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>Failed to load progress</Text>
      </View>
    );
  }

  // Prepare chart data
  const weeklyLabels = summary.weekly_progress.map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
  });

  const weeklyData = summary.weekly_progress.map((d) =>
    Math.round(d.completion_rate * 100)
  );

  // Subject pie chart data
  const subjectPieData = summary.subject_progress
    .filter((s) => s.total_tasks > 0)
    .slice(0, 6)
    .map((s) => ({
      name: s.subject_name.length > 10
        ? s.subject_name.substring(0, 10) + '...'
        : s.subject_name,
      tasks: s.completed_tasks,
      color: s.color,
      legendFontColor: Colors.textSecondary,
      legendFontSize: 11,
    }));

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    labelColor: () => Colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
    barPercentage: 0.6,
  };

  const getConsistencyColor = () => {
    if (summary.consistency_score >= 0.8) return Colors.success;
    if (summary.consistency_score >= 0.6) return Colors.warning;
    return Colors.error;
  };

  const getConsistencyLabel = () => {
    if (summary.consistency_score >= 0.8) return 'Excellent!';
    if (summary.consistency_score >= 0.6) return 'Good';
    return 'Needs Work';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Statistics</Text>
          <Text style={styles.headerSubtitle}>Track your progress</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Stats */}
        <View style={styles.statsRow}>
          <StatCard
            title="Current Streak"
            value={`${summary.current_streak}d`}
            icon="flame"
            iconColor={Colors.warning}
          />
          <StatCard
            title="Longest Streak"
            value={`${summary.longest_streak}d`}
            icon="trophy"
            iconColor={Colors.accent}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Tasks Done"
            value={summary.total_tasks_completed}
            icon="checkmark-done"
            iconColor={Colors.success}
          />
          <StatCard
            title="Hours Studied"
            value={`${Math.round(summary.total_minutes_studied / 60)}h`}
            icon="time"
            iconColor={Colors.primary}
          />
        </View>

        {/* Consistency Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consistency Score</Text>
          <View style={styles.card}>
            <View style={styles.consistencyHeader}>
              <View>
                <Text style={styles.consistencyPercent}>
                  {Math.round(summary.consistency_score * 100)}%
                </Text>
                <Text style={styles.consistencySubtitle}>
                  Based on last 14 days
                </Text>
              </View>
              <View style={[styles.consistencyBadge, { backgroundColor: getConsistencyColor() }]}>
                <Text style={styles.consistencyLabel}>{getConsistencyLabel()}</Text>
              </View>
            </View>
            <ProgressBar
              progress={summary.consistency_score}
              showPercentage={false}
              height={10}
              color={getConsistencyColor()}
            />
          </View>
        </View>

        {/* Weekly Completion Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Completion Rate</Text>
          <View style={styles.chartCard}>
            <BarChart
              data={{
                labels: weeklyLabels,
                datasets: [{ data: weeklyData.map(d => d || 0) }],
              }}
              width={screenWidth - Spacing.lg * 4}
              height={180}
              yAxisSuffix="%"
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
            />
          </View>
        </View>

        {/* Subject Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subject-wise Progress</Text>
          <View style={styles.card}>
            {summary.subject_progress
              .filter((s) => s.total_tasks > 0)
              .map((subject) => (
                <View key={subject.subject_id} style={styles.subjectRow}>
                  <View style={styles.subjectHeader}>
                    <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
                    <Text style={styles.subjectName} numberOfLines={1}>
                      {subject.subject_name}
                    </Text>
                    <Text style={styles.subjectStats}>
                      {subject.completed_tasks}/{subject.total_tasks}
                    </Text>
                  </View>
                  <ProgressBar
                    progress={subject.completion_rate}
                    showPercentage
                    color={subject.color}
                    height={8}
                  />
                </View>
              ))}
            {summary.subject_progress.filter((s) => s.total_tasks > 0).length === 0 && (
              <View style={styles.emptySubjects}>
                <Ionicons name="book-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptySubjectsText}>No subject data yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Time Distribution */}
        {subjectPieData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tasks by Subject</Text>
            <View style={styles.chartCard}>
              <PieChart
                data={subjectPieData}
                width={screenWidth - Spacing.lg * 4}
                height={200}
                chartConfig={chartConfig}
                accessor="tasks"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
              />
            </View>
          </View>
        )}

        {/* Daily Pattern */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Stats</Text>
          <View style={styles.card}>
            {summary.weekly_progress.map((day, index) => (
              <View
                key={index}
                style={[
                  styles.dailyRow,
                  index === summary.weekly_progress.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={styles.dailyDate}>
                  {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <View style={styles.dailyStats}>
                  <Text style={styles.dailyTasks}>
                    {day.tasks_completed}/{day.tasks_planned} tasks
                  </Text>
                  <View style={[
                    styles.dailyRateBadge,
                    {
                      backgroundColor:
                        day.completion_rate >= 0.8
                          ? Colors.successMuted
                          : day.completion_rate >= 0.5
                          ? Colors.warningMuted
                          : Colors.errorMuted,
                    },
                  ]}>
                    <Text
                      style={[
                        styles.dailyRate,
                        {
                          color:
                            day.completion_rate >= 0.8
                              ? Colors.success
                              : day.completion_rate >= 0.5
                              ? Colors.warning
                              : Colors.error,
                        },
                      ]}
                    >
                      {Math.round(day.completion_rate * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chart: {
    borderRadius: BorderRadius.lg,
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  consistencyPercent: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
  },
  consistencySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  consistencyBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  consistencyLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  subjectRow: {
    marginBottom: Spacing.md,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  subjectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  subjectName: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  subjectStats: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  emptySubjects: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptySubjectsText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dailyDate: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  dailyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dailyTasks: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  dailyRateBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  dailyRate: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});

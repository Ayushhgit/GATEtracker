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
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { api } from '@/services/api';
import { ProgressSummary } from '@/types';
import { LoadingSpinner, ProgressBar, StatCard } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      legendFontColor: Colors.text,
      legendFontSize: 12,
    }));

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: () => Colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Overview Stats */}
      <View style={styles.statsRow}>
        <StatCard
          title="Current Streak"
          value={`${summary.current_streak}d`}
          icon="flame"
          iconColor={Colors.warning}
        />
        <View style={{ width: Spacing.sm }} />
        <StatCard
          title="Longest Streak"
          value={`${summary.longest_streak}d`}
          icon="trophy"
          iconColor={Colors.secondary}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title="Tasks Done"
          value={summary.total_tasks_completed}
          icon="checkmark-done"
          iconColor={Colors.success}
        />
        <View style={{ width: Spacing.sm }} />
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
            <View style={styles.consistencyBadge}>
              {summary.consistency_score >= 0.8 ? (
                <Text style={styles.consistencyLabel}>Excellent!</Text>
              ) : summary.consistency_score >= 0.6 ? (
                <Text style={[styles.consistencyLabel, { color: Colors.warning }]}>
                  Good
                </Text>
              ) : (
                <Text style={[styles.consistencyLabel, { color: Colors.error }]}>
                  Needs Work
                </Text>
              )}
            </View>
          </View>
          <ProgressBar
            progress={summary.consistency_score}
            showPercentage={false}
            height={10}
            color={
              summary.consistency_score >= 0.8
                ? Colors.success
                : summary.consistency_score >= 0.6
                ? Colors.warning
                : Colors.error
            }
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
            width={screenWidth - Spacing.md * 4}
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
                  <View
                    style={[styles.subjectDot, { backgroundColor: subject.color }]}
                  />
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
        </View>
      </View>

      {/* Time Distribution */}
      {subjectPieData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks by Subject</Text>
          <View style={styles.chartCard}>
            <PieChart
              data={subjectPieData}
              width={screenWidth - Spacing.md * 4}
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
            <View key={index} style={styles.dailyRow}>
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
          ))}
        </View>
      </View>

      <View style={{ height: Spacing.xl }} />
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
  statsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 12,
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  consistencyPercent: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
  },
  consistencySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  consistencyBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  consistencyLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.success,
  },
  subjectRow: {
    marginBottom: Spacing.md,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
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
  },
  subjectStats: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
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
  },
  dailyTasks: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginRight: Spacing.md,
  },
  dailyRate: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
});

import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import ConditionCard from '../../components/cards/ConditionCard';
import { colors } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { getContentRepository, type CaseBundle } from '../../services/content/repository';
import { calculateCompletion, getProgressRepository } from '../../services/progress/repository';
import type { Condition } from '../../types/condition';

interface ConditionRow {
  condition: Condition;
  progress: number;
  casesCount: number;
}

function getMilestoneKeys(bundle: CaseBundle) {
  const keys = ['overview'];
  if (bundle.details) keys.push('clinical', 'diagnosis', 'treatment');
  for (const section of bundle.sections) {
    const key = `section_${section.type}`;
    if (!keys.includes(key)) keys.push(key);
  }
  if (bundle.mechanisms.length > 0) keys.push('mechanisms');
  if (bundle.resources.length > 0) keys.push('resources');
  if (bundle.quizzes.length > 0) keys.push('quiz');
  return keys;
}

export default function SystemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [title, setTitle] = useState('Study Track');
  const [rows, setRows] = useState<ConditionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const contentRepo = getContentRepository();
    const progressRepo = getProgressRepository();
    const systems = await contentRepo.getSystems();
    const conditions = await contentRepo.getConditionsBySystem(id);
    const snapshot = await progressRepo.getSnapshot();

    const nextRows = await Promise.all(
      conditions.map(async (condition) => {
        const cases = await contentRepo.getCasesByCondition(condition.id);
        const bundles = await Promise.all(cases.map((item) => contentRepo.getCaseBundle(item.id)));
        const completions = bundles.map((bundle) =>
          calculateCompletion(snapshot.cases[bundle.caseItem?.id ?? ''], getMilestoneKeys(bundle)),
        );
        const progress =
          completions.length > 0
            ? Math.round(completions.reduce((sum, value) => sum + value, 0) / completions.length)
            : 0;

        return {
          condition,
          progress,
          casesCount: cases.length,
        };
      }),
    );

    setRows(nextRows);
    setTitle(systems.find((system) => system.id === id)?.name ?? 'Study Track');
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>System Overview</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>
              Choose a condition to move into guided case studies, structured resources, and quiz-based review.
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Published Conditions</Text>
            <Text style={styles.summaryValue}>{rows.length}</Text>
            <Text style={styles.summaryText}>Each condition opens into a longer case-based learning path.</Text>
          </View>
        </View>

        {loading ? <Text style={styles.statusText}>Loading conditions...</Text> : null}

        <View style={styles.list}>
          {rows.map((row) => (
            <ConditionCard
              key={row.condition.id}
              condition={row.condition}
              progress={row.progress}
              meta={`${row.casesCount} case${row.casesCount === 1 ? '' : 's'} · ${row.condition.learningGoals.length} learning goals`}
              onPress={() => router.push(`/condition/${row.condition.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    gap: 14,
    marginBottom: 24,
  },
  heroDesktop: {
    flexDirection: 'row',
  },
  heroCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  title: {
    color: colors.maroonDeep,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  summaryCard: {
    width: 260,
    backgroundColor: colors.cloud,
    borderRadius: 24,
    padding: 22,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryValue: {
    color: colors.maroonDeep,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  list: {
    marginTop: 4,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 14,
    paddingBottom: 16,
  },
});

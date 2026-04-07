import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import CaseCard from '../../components/cards/CaseCard';
import { colors } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { getContentRepository, type AdminCase, type CaseBundle } from '../../services/content/repository';
import { calculateCompletion, getProgressRepository } from '../../services/progress/repository';
import type { Condition } from '../../types/condition';

interface CaseRow {
  caseItem: AdminCase;
  progress: number;
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

export default function ConditionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [condition, setCondition] = useState<Condition>();
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const contentRepo = getContentRepository();
    const progressRepo = getProgressRepository();
    const [nextCondition, cases, snapshot] = await Promise.all([
      contentRepo.getConditionById(id),
      contentRepo.getCasesByCondition(id),
      progressRepo.getSnapshot(),
    ]);

    const bundles = await Promise.all(cases.map((item) => contentRepo.getCaseBundle(item.id)));
    const nextRows = cases.map((caseItem, index) => ({
      caseItem,
      progress: calculateCompletion(snapshot.cases[caseItem.id], getMilestoneKeys(bundles[index])),
    }));

    setCondition(nextCondition);
    setRows(nextRows);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Stack.Screen options={{ title: condition?.name ?? 'Condition' }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
          <View style={[styles.heroCard, isDesktop && styles.heroMain]}>
            <Text style={styles.eyebrow}>Condition Workspace</Text>
            <Text style={styles.title}>{condition?.name ?? 'Loading...'}</Text>
            <Text style={styles.description}>{condition?.summary}</Text>
          </View>
          <View style={styles.learningCard}>
            <Text style={styles.learningTitle}>Learning Goals</Text>
            {condition?.learningGoals.map((goal) => (
              <View key={goal} style={styles.goalRow}>
                <Text style={styles.goalBullet}>•</Text>
                <Text style={styles.goalText}>{goal}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Case Modules</Text>
        {loading ? <Text style={styles.statusText}>Loading cases...</Text> : null}

        <View style={styles.list}>
          {rows.map((row) => (
            <CaseCard
              key={row.caseItem.id}
              caseItem={row.caseItem}
              progress={row.progress}
              onPress={() => router.push(`/case/${row.caseItem.id}`)}
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
    alignItems: 'stretch',
  },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroMain: {
    flex: 1,
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
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  learningCard: {
    width: 320,
    backgroundColor: colors.cloud,
    borderRadius: 24,
    padding: 22,
  },
  learningTitle: {
    color: colors.maroonDeep,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalBullet: {
    color: colors.maroon,
    marginRight: 8,
    marginTop: 1,
  },
  goalText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionTitle: {
    color: colors.maroonDeep,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 14,
    paddingBottom: 12,
  },
  list: {
    marginTop: 4,
  },
});

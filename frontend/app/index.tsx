import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import SystemCard from '../components/cards/SystemCard';
import { colors } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import { getContentRepository, type CaseBundle } from '../services/content/repository';
import { calculateCompletion, getProgressRepository } from '../services/progress/repository';
import type { Condition } from '../types/condition';
import type { System } from '../types/system';
import type { ProgressSnapshot } from '../types/study';

interface DashboardSystem {
  system: System;
  conditions: Condition[];
  progress: number;
  casesCount: number;
}

interface DashboardState {
  systems: DashboardSystem[];
  snapshot: ProgressSnapshot;
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

export default function Index() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [state, setState] = useState<DashboardState>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const contentRepo = getContentRepository();
      const progressRepo = getProgressRepository();
      const systems = await contentRepo.getSystems();
      const snapshot = await progressRepo.getSnapshot();

      const nextSystems = await Promise.all(
        systems.map(async (system) => {
          const conditions = await contentRepo.getConditionsBySystem(system.id);
          const cases = (
            await Promise.all(
              conditions.map((condition) => contentRepo.getCasesByCondition(condition.id)),
            )
          ).flat();

          const bundles = await Promise.all(cases.map((caseItem) => contentRepo.getCaseBundle(caseItem.id)));
          const completions = bundles.map((bundle) =>
            calculateCompletion(snapshot.cases[bundle.caseItem?.id ?? ''], getMilestoneKeys(bundle)),
          );
          const progress =
            completions.length > 0
              ? Math.round(completions.reduce((sum, value) => sum + value, 0) / completions.length)
              : 0;

          return {
            system,
            conditions,
            progress,
            casesCount: cases.length,
          };
        }),
      );

      setState({
        systems: nextSystems,
        snapshot,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load the dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const resumeActivity = state?.snapshot.recentActivity[0];
  const completedCases = useMemo(() => {
    if (!state) return 0;
    return Object.values(state.snapshot.cases).filter(
      (item) => item.completedSections.length > 0 || item.quizAttempts.length > 0,
    ).length;
  }, [state]);

  return (
    <>
      <Stack.Screen options={{ title: 'Medical Study Hub' }} />
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
          <View style={[styles.heroMain, isDesktop && styles.heroMainDesktop]}>
            <Text style={styles.eyebrow}>Desktop-First Study Workspace</Text>
            <Text style={styles.heroTitle}>Long-form case learning for medical students.</Text>
            <Text style={styles.heroText}>
              Study respiratory medicine through case-based reading, active recall checkpoints,
              saved resources, and review-ready quizzes that make it easier to stay engaged longer.
            </Text>

            {resumeActivity ? (
              <View style={styles.resumeCard}>
                <Text style={styles.resumeLabel}>Resume where you left off</Text>
                <Text style={styles.resumeTitle}>{resumeActivity.title}</Text>
                <Text style={styles.resumeText}>{resumeActivity.detail}</Text>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.push(`/case/${resumeActivity.caseId}`)}
                >
                  <Text style={styles.primaryButtonText}>Resume Case</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.resumeCard}>
                <Text style={styles.resumeLabel}>Start with the flagship module</Text>
                <Text style={styles.resumeTitle}>Respiratory: Asthma</Text>
                <Text style={styles.resumeText}>
                  Work through pathophysiology, treatment logic, toxicology, and end-of-case questions.
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.heroRail, isDesktop && styles.heroRailDesktop]}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Current Streak</Text>
              <Text style={styles.statValue}>
                {state?.snapshot.streak.current ?? 0} day{(state?.snapshot.streak.current ?? 0) === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Saved Bookmarks</Text>
              <Text style={styles.statValue}>{state?.snapshot.bookmarks.length ?? 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Cases Started</Text>
              <Text style={styles.statValue}>{completedCases}</Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={() => router.push('/admin')}>
              <Text style={styles.secondaryButtonText}>Open Admin Workspace</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Study Tracks</Text>
          <Text style={styles.sectionSubtitle}>
            Public students only see published content. Admins can create drafts in the workspace.
          </Text>
        </View>

        {loading ? <Text style={styles.statusText}>Loading study tracks...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.systemList}>
          {state?.systems.map((item) => (
            <SystemCard
              key={item.system.id}
              system={item.system}
              progress={item.progress}
              meta={`${item.conditions.length} condition${item.conditions.length === 1 ? '' : 's'} · ${item.casesCount} case${item.casesCount === 1 ? '' : 's'}`}
              onPress={() => router.push(`/system/${item.system.id}`)}
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
  pageContent: {
    padding: 20,
    paddingBottom: 48,
  },
  hero: {
    gap: 16,
    marginBottom: 28,
  },
  heroDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  heroMain: {
    backgroundColor: colors.maroonDeep,
    borderRadius: 30,
    padding: 28,
    flex: 1,
  },
  heroMainDesktop: {
    minHeight: 340,
  },
  eyebrow: {
    color: '#F9D8B0',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    marginBottom: 12,
    maxWidth: 760,
  },
  heroText: {
    color: '#ECDDD6',
    fontSize: 16,
    lineHeight: 28,
    maxWidth: 760,
    marginBottom: 20,
  },
  resumeCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    padding: 20,
    maxWidth: 620,
  },
  resumeLabel: {
    color: '#F9D8B0',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  resumeTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  resumeText: {
    color: '#ECDDD6',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  heroRail: {
    gap: 12,
  },
  heroRailDesktop: {
    width: 280,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statValue: {
    color: colors.maroonDeep,
    fontSize: 28,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: colors.cloud,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBgStrong,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.maroonDeep,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  systemList: {
    marginTop: 8,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 14,
    paddingVertical: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    paddingVertical: 12,
  },
});

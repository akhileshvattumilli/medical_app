import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import InfoCard from '../../components/cards/InfoCard';
import ResourcePanel from '../../components/study/ResourcePanel';
import CaseHeader from '../../components/study/CaseHeader';
import CheckpointCard from '../../components/study/CheckpointCard';
import ProgressRail from '../../components/study/ProgressRail';
import QuizPanel from '../../components/study/QuizPanel';
import SectionBlock from '../../components/study/SectionBlock';
import StudyNav, { type StudyNavItem } from '../../components/study/StudyNav';
import MechanismRenderer from '../../components/sections/MechanismRenderer';
import { colors } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { getContentRepository, type CaseBundle } from '../../services/content/repository';
import { calculateCompletion, getProgressRepository } from '../../services/progress/repository';
import type { QuizQuestion } from '../../types/quiz';
import type { Bookmark, ProgressSnapshot } from '../../types/study';
import type { SectionType } from '../../types/section';

const SECTION_LABELS: Record<string, string> = {
  narrative: 'Narrative',
  histology: 'Histology',
  pathology: 'Pathology',
  physiology: 'Physiology',
  pharmacology: 'Pharmacology',
  mechanism: 'Mechanism',
  treatment: 'Treatment',
  clinicalPearl: 'Clinical Pearl',
};

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

export default function CaseDetailScreen() {
  const { id, preview } = useLocalSearchParams<{ id: string; preview?: string }>();
  const { isDesktop } = useResponsive();
  const includeDrafts = preview === '1';
  const [bundle, setBundle] = useState<CaseBundle>();
  const [snapshot, setSnapshot] = useState<ProgressSnapshot>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState('overview');
  const touchedCaseId = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(undefined);

    try {
      const contentRepo = getContentRepository();
      const progressRepo = getProgressRepository();
      const [nextBundle, nextSnapshot] = await Promise.all([
        contentRepo.getCaseBundle(id, includeDrafts),
        progressRepo.getSnapshot(),
      ]);

      setBundle(nextBundle);
      setSnapshot(nextSnapshot);

      const savedTab = nextSnapshot.cases[id]?.activeTab;
      if (savedTab) {
        setActiveTab(savedTab);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load case.');
    } finally {
      setLoading(false);
    }
  }, [id, includeDrafts]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const caseItem = bundle?.caseItem;
    if (!caseItem || touchedCaseId.current === caseItem.id) return;

    touchedCaseId.current = caseItem.id;
    getProgressRepository()
      .touchCase(caseItem.id, caseItem.title)
      .then((nextSnapshot) => setSnapshot(nextSnapshot));
  }, [bundle?.caseItem]);

  const caseProgress = snapshot && id ? snapshot.cases[id] : undefined;

  const sectionsByType = useMemo(() => {
    const map: Partial<Record<SectionType, NonNullable<CaseBundle['sections']>>> = {};
    for (const section of bundle?.sections ?? []) {
      if (!map[section.type]) map[section.type] = [];
      map[section.type]!.push(section);
    }
    return map;
  }, [bundle?.sections]);

  const milestones = useMemo(() => getMilestoneKeys(bundle ?? {
    sections: [],
    mechanisms: [],
    resources: [],
    quizzes: [],
    checkpoints: [],
  }), [bundle]);

  const completion = calculateCompletion(caseProgress, milestones);
  const completedSet = new Set(caseProgress?.completedSections.map((item) => item.key) ?? []);
  const currentBookmarks = snapshot?.bookmarks.filter((item) => item.caseId === id) ?? [];

  const navItems = useMemo<StudyNavItem[]>(() => {
    const items: StudyNavItem[] = [{ key: 'overview', label: 'Overview', completed: completedSet.has('overview') }];
    if (bundle?.details) {
      items.push(
        { key: 'clinical', label: 'Clinical', completed: completedSet.has('clinical') },
        { key: 'diagnosis', label: 'Diagnosis', completed: completedSet.has('diagnosis') },
        { key: 'treatment', label: 'Treatment', completed: completedSet.has('treatment') },
      );
    }
    for (const type of Object.keys(sectionsByType) as SectionType[]) {
      const key = `section_${type}`;
      items.push({
        key,
        label: SECTION_LABELS[type] ?? type,
        completed: completedSet.has(key),
      });
    }
    if ((bundle?.mechanisms.length ?? 0) > 0) {
      items.push({ key: 'mechanisms', label: 'Mechanisms', completed: completedSet.has('mechanisms') });
    }
    if ((bundle?.resources.length ?? 0) > 0) {
      items.push({ key: 'resources', label: 'Resources', completed: completedSet.has('resources') });
    }
    if ((bundle?.quizzes.length ?? 0) > 0) {
      items.push({
        key: 'quiz',
        label: 'Quiz',
        badge: String(bundle?.quizzes.length ?? 0),
        accent: true,
        completed: completedSet.has('quiz'),
      });
    }
    return items;
  }, [bundle?.details, bundle?.mechanisms.length, bundle?.resources.length, bundle?.quizzes.length, completedSet, sectionsByType]);

  const nextMilestone = navItems.find((item) => !completedSet.has(item.key))?.label;

  const handleTabChange = async (key: string) => {
    if (!id) return;
    setActiveTab(key);
    const nextSnapshot = await getProgressRepository().setActiveTab(id, key);
    setSnapshot(nextSnapshot);
  };

  const markComplete = async (key: string, detail: string) => {
    if (!id || !bundle?.caseItem) return;
    const nextSnapshot = await getProgressRepository().markSectionComplete(
      id,
      key,
      bundle.caseItem.title,
      detail,
    );
    setSnapshot(nextSnapshot);
  };

  const toggleBookmark = async (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    const nextSnapshot = await getProgressRepository().toggleBookmark(bookmark);
    setSnapshot(nextSnapshot);
  };

  const handleQuizAttempt = async (
    question: QuizQuestion,
    selectedIndex: number,
    correct: boolean,
  ) => {
    if (!bundle?.caseItem) return;
    const nextSnapshot = await getProgressRepository().recordQuizAttempt(
      {
        caseId: question.caseId,
        questionId: question.id,
        selectedIndex,
        correct,
      },
      bundle.caseItem.title,
    );
    setSnapshot(nextSnapshot);
  };

  const handleToggleMarkedQuestion = async (questionId: string) => {
    if (!id) return;
    const nextSnapshot = await getProgressRepository().toggleMarkedQuestion(id, questionId);
    setSnapshot(nextSnapshot);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Case' }} />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Loading case workspace...</Text>
        </View>
      </>
    );
  }

  if (error || !bundle?.caseItem) {
    return (
      <>
        <Stack.Screen options={{ title: 'Case' }} />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error ?? 'Case not found.'}</Text>
        </View>
      </>
    );
  }

  const outlineItems = navItems;
  const checkpoints = bundle.checkpoints.filter((item) => item.tabKey === activeTab);
  const markedQuestions = caseProgress?.markedQuestionIds ?? [];
  const relevantRecentActivity =
    snapshot?.recentActivity.filter((item) => item.caseId === bundle.caseItem?.id).slice(0, 4) ?? [];

  return (
    <>
      <Stack.Screen options={{ title: bundle.caseItem.title }} />
      <View style={styles.page}>
        <CaseHeader
          caseItem={bundle.caseItem}
          completion={completion}
          bookmarked={currentBookmarks.some((item) => item.entityType === 'case')}
          onToggleBookmark={() =>
            toggleBookmark({
              caseId: bundle.caseItem!.id,
              entityId: bundle.caseItem!.id,
              entityType: 'case',
              label: bundle.caseItem!.title,
            })
          }
        />

        <StudyNav items={navItems} activeKey={activeTab} onSelect={handleTabChange} />

        <View style={[styles.workspace, isDesktop && styles.workspaceDesktop]}>
          {isDesktop ? (
            <View style={styles.leftRail}>
              <Text style={styles.railTitle}>Case Outline</Text>
              {outlineItems.map((item) => (
                <Pressable
                  key={item.key}
                  style={[styles.outlineItem, item.key === activeTab && styles.outlineItemActive]}
                  onPress={() => handleTabChange(item.key)}
                >
                  <View style={styles.outlineIndicator}>
                    <View
                      style={[
                        styles.outlineDot,
                        completedSet.has(item.key) && styles.outlineDotComplete,
                        item.key === activeTab && styles.outlineDotActive,
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.outlineText,
                      item.key === activeTab && styles.outlineTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <ScrollView style={styles.mainColumn} contentContainerStyle={styles.mainContent}>
            {activeTab === 'overview' ? (
              <OverviewPanel
                caseItem={bundle.caseItem}
                onComplete={() => markComplete('overview', 'Completed the overview panel')}
                completed={completedSet.has('overview')}
              />
            ) : null}

            {activeTab === 'clinical' && bundle.details ? (
              <ClinicalPanel
                details={bundle.details}
                completed={completedSet.has('clinical')}
                onComplete={() => markComplete('clinical', 'Reviewed the clinical narrative')}
              />
            ) : null}

            {activeTab === 'diagnosis' && bundle.details ? (
              <DiagnosisPanel
                details={bundle.details}
                completed={completedSet.has('diagnosis')}
                onComplete={() => markComplete('diagnosis', 'Worked through diagnosis notes')}
              />
            ) : null}

            {activeTab === 'treatment' && bundle.details ? (
              <TreatmentPanel
                details={bundle.details}
                completed={completedSet.has('treatment')}
                onComplete={() => markComplete('treatment', 'Reviewed treatment planning')}
              />
            ) : null}

            {activeTab.startsWith('section_')
              ? (sectionsByType[activeTab.replace('section_', '') as SectionType] ?? []).map((section) => (
                  <SectionBlock
                    key={section.id}
                    section={section}
                    completed={completedSet.has(`section_${section.type}`)}
                    onComplete={() =>
                      markComplete(`section_${section.type}`, `Completed ${SECTION_LABELS[section.type] ?? section.type}`)
                    }
                  />
                ))
              : null}

            {activeTab === 'mechanisms'
              ? bundle.mechanisms.map((mechanism) => (
                  <View key={mechanism.id} style={styles.whitePanel}>
                    <MechanismRenderer mechanism={mechanism} />
                  </View>
                ))
              : null}
            {activeTab === 'mechanisms' ? (
              <CompletionButton
                completed={completedSet.has('mechanisms')}
                onPress={() => markComplete('mechanisms', 'Completed the mechanism walkthroughs')}
                label="Mark Mechanisms Done"
              />
            ) : null}

            {activeTab === 'resources' ? (
              <View>
                <ResourcePanel
                  resources={bundle.resources}
                  bookmarks={currentBookmarks}
                  onToggleBookmark={(resource) =>
                    toggleBookmark({
                      caseId: resource.caseId,
                      entityId: resource.id,
                      entityType: 'resource',
                      label: resource.title,
                    })
                  }
                />
                <CompletionButton
                  completed={completedSet.has('resources')}
                  onPress={() => markComplete('resources', 'Finished the resource review')}
                  label="Mark Resources Done"
                />
              </View>
            ) : null}

            {activeTab === 'quiz' ? (
              <QuizPanel
                questions={bundle.quizzes}
                attempts={caseProgress?.quizAttempts ?? []}
                markedQuestionIds={markedQuestions}
                onAttempt={handleQuizAttempt}
                onToggleMarked={handleToggleMarkedQuestion}
                onCompleteQuiz={() => markComplete('quiz', 'Completed the quiz set')}
              />
            ) : null}

            {checkpoints.map((checkpoint) => (
              <CheckpointCard
                key={checkpoint.id}
                checkpoint={checkpoint}
                completed={completedSet.has(checkpoint.id)}
                onComplete={() => markComplete(checkpoint.id, `Completed checkpoint: ${checkpoint.title}`)}
              />
            ))}
          </ScrollView>

          {isDesktop ? (
            <View style={styles.rightRail}>
              <ProgressRail
                completion={completion}
                completedCount={milestones.filter((item) => completedSet.has(item)).length}
                totalCount={milestones.length}
                bookmarkCount={currentBookmarks.length}
                markedCount={markedQuestions.length}
                streak={snapshot?.streak.current ?? 0}
                nextLabel={nextMilestone}
                recentActivity={relevantRecentActivity}
              />
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
}

function CompletionButton({
  completed,
  onPress,
  label,
}: {
  completed: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable style={[styles.completionButton, completed && styles.completionButtonDone]} onPress={onPress}>
      <Text style={[styles.completionButtonText, completed && styles.completionButtonTextDone]}>
        {completed ? 'Saved as completed' : label}
      </Text>
    </Pressable>
  );
}

function OverviewPanel({
  caseItem,
  completed,
  onComplete,
}: {
  caseItem: NonNullable<CaseBundle['caseItem']>;
  completed: boolean;
  onComplete: () => void;
}) {
  return (
    <View>
      <InfoCard label="Description" value={caseItem.shortDescription} />
      <InfoCard label="Difficulty" value={caseItem.difficulty} />
      <InfoCard label="Why this case matters" value="Use it to connect outpatient control, rescue therapy, adverse effects, and mechanism-level pharmacology." />
      <CompletionButton completed={completed} onPress={onComplete} label="Mark Overview Done" />
    </View>
  );
}

function ClinicalPanel({
  details,
  completed,
  onComplete,
}: {
  details: NonNullable<CaseBundle['details']>;
  completed: boolean;
  onComplete: () => void;
}) {
  const vitalsEntries = Object.entries(details.clinicalNarrative.vitals).filter(
    ([, value]) => value !== undefined,
  );

  return (
    <View>
      <InfoCard label="Presentation" value={details.clinicalNarrative.presentation} />
      <InfoCard label="History" value={details.clinicalNarrative.history} />
      {vitalsEntries.length > 0 ? (
        <View style={styles.whitePanel}>
          <Text style={styles.panelLabel}>Vitals</Text>
          {vitalsEntries.map(([key, value]) => (
            <View key={key} style={styles.kvRow}>
              <Text style={styles.kvKey}>{key}</Text>
              <Text style={styles.kvValue}>{String(value)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <InfoCard label="Examination" value={details.clinicalNarrative.exam} />
      <View style={styles.whitePanel}>
        <Text style={styles.panelLabel}>Discussion Prompts</Text>
        {details.clinicalNarrative.discussionPrompts.map((prompt) => (
          <View key={prompt} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{prompt}</Text>
          </View>
        ))}
      </View>
      <CompletionButton completed={completed} onPress={onComplete} label="Mark Clinical Review Done" />
    </View>
  );
}

function DiagnosisPanel({
  details,
  completed,
  onComplete,
}: {
  details: NonNullable<CaseBundle['details']>;
  completed: boolean;
  onComplete: () => void;
}) {
  return (
    <View>
      <InfoCard label="Diagnosis" value={details.diagnosis.name} />
      <View style={styles.whitePanel}>
        <Text style={styles.panelLabel}>Key Findings</Text>
        {details.diagnosis.keyFindings.map((finding) => (
          <View key={finding} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{finding}</Text>
          </View>
        ))}
      </View>
      {details.diagnosis.tests.map((test) => (
        <View key={test.name} style={styles.whitePanel}>
          <Text style={styles.panelTitle}>{test.name}</Text>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Result</Text>
            <Text style={styles.kvValue}>{test.result}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Interpretation</Text>
            <Text style={styles.kvValue}>{test.interpretation}</Text>
          </View>
        </View>
      ))}
      <CompletionButton completed={completed} onPress={onComplete} label="Mark Diagnosis Done" />
    </View>
  );
}

function TreatmentPanel({
  details,
  completed,
  onComplete,
}: {
  details: NonNullable<CaseBundle['details']>;
  completed: boolean;
  onComplete: () => void;
}) {
  return (
    <View>
      <InfoCard label="Plan" value={details.treatment.plan} />
      <View style={styles.whitePanel}>
        <Text style={styles.panelLabel}>Medications</Text>
        {details.treatment.medications.map((medication) => (
          <View key={medication.name} style={styles.medicationCard}>
            <Text style={styles.panelTitle}>{medication.name}</Text>
            <Text style={styles.medicationClass}>{medication.class}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{medication.role}</Text>
            </View>
          </View>
        ))}
      </View>
      <InfoCard label="Follow-Up" value={details.treatment.followUp} />
      <InfoCard label="Outcome" value={details.treatment.outcome} />
      <CompletionButton completed={completed} onPress={onComplete} label="Mark Treatment Done" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  workspace: {
    flex: 1,
  },
  workspaceDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftRail: {
    width: 220,
    padding: 20,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  rightRail: {
    width: 290,
    padding: 20,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  mainColumn: {
    flex: 1,
  },
  mainContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  railTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  outlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 4,
  },
  outlineItemActive: {
    backgroundColor: colors.white,
  },
  outlineIndicator: {
    width: 20,
    alignItems: 'center',
  },
  outlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardBgStrong,
  },
  outlineDotComplete: {
    backgroundColor: colors.success,
  },
  outlineDotActive: {
    backgroundColor: colors.maroon,
  },
  outlineText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  outlineTextActive: {
    color: colors.maroonDeep,
  },
  whitePanel: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  panelLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  panelTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  kvKey: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },
  kvValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    color: colors.maroon,
    marginRight: 8,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  medicationCard: {
    backgroundColor: colors.cloud,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  medicationClass: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.maroonFaint,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleText: {
    color: colors.maroon,
    fontSize: 11,
    fontWeight: '700',
  },
  completionButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.maroon,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  completionButtonDone: {
    backgroundColor: colors.successBg,
  },
  completionButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  completionButtonTextDone: {
    color: colors.success,
  },
});

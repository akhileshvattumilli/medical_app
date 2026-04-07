import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { QuizQuestion } from '../../types/quiz';
import type { QuizAttempt } from '../../types/study';
import { colors } from '../../constants/theme';

interface QuizPanelProps {
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  markedQuestionIds: string[];
  onAttempt: (question: QuizQuestion, selectedIndex: number, correct: boolean) => Promise<void>;
  onToggleMarked: (questionId: string) => Promise<void>;
  onCompleteQuiz: () => Promise<void>;
}

export default function QuizPanel({
  questions,
  attempts,
  markedQuestionIds,
  onAttempt,
  onToggleMarked,
  onCompleteQuiz,
}: QuizPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const attemptMap = useMemo(
    () => new Map(attempts.map((attempt) => [attempt.questionId, attempt])),
    [attempts],
  );

  if (questions.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No quiz items yet</Text>
        <Text style={styles.emptyText}>
          Add questions in the admin workspace to turn this case into a longer study session.
        </Text>
      </View>
    );
  }

  const question = questions[currentIndex];
  const previousAttempt = attemptMap.get(question.id);
  const effectiveSelectedIndex = submitted ? selectedIndex : previousAttempt?.selectedIndex ?? selectedIndex;
  const isCorrect = effectiveSelectedIndex === question.answerIndex;
  const answeredCount = attemptMap.size;
  const marked = markedQuestionIds.includes(question.id);

  const handleSubmit = async () => {
    if (selectedIndex === null) return;
    const correct = selectedIndex === question.answerIndex;
    setSubmitted(true);
    await onAttempt(question, selectedIndex, correct);

    if (answeredCount + (previousAttempt ? 0 : 1) === questions.length) {
      await onCompleteQuiz();
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedIndex(null);
      setSubmitted(false);
    }
  };

  return (
    <View style={styles.shell}>
      <View style={styles.summary}>
        <Text style={styles.summaryEyebrow}>Knowledge Check</Text>
        <Text style={styles.summaryTitle}>Question {currentIndex + 1} of {questions.length}</Text>
        <Text style={styles.summaryText}>
          {answeredCount} answered so far. Mark high-friction questions to revisit later.
        </Text>
      </View>

      <View style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <Text style={styles.question}>{question.question}</Text>
          <Pressable style={styles.markButton} onPress={() => onToggleMarked(question.id)}>
            <Text style={styles.markText}>{marked ? 'Marked for Review' : 'Mark for Review'}</Text>
          </Pressable>
        </View>

        {question.options.map((option, index) => {
          const selected = effectiveSelectedIndex === index;
          const showCorrect = submitted && index === question.answerIndex;
          const showWrong = submitted && selected && !isCorrect;

          return (
            <Pressable
              key={`${question.id}_${index}`}
              onPress={() => !submitted && setSelectedIndex(index)}
              style={[
                styles.option,
                selected && !submitted && styles.optionSelected,
                showCorrect && styles.optionCorrect,
                showWrong && styles.optionWrong,
              ]}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          );
        })}

        {!submitted ? (
          <Pressable
            style={[styles.primaryButton, selectedIndex === null && styles.primaryButtonDisabled]}
            disabled={selectedIndex === null}
            onPress={handleSubmit}
          >
            <Text style={styles.primaryText}>Submit Answer</Text>
          </Pressable>
        ) : (
          <View style={styles.feedbackBox}>
            <Text style={[styles.feedbackTitle, isCorrect ? styles.correctText : styles.wrongText]}>
              {isCorrect ? 'Correct reasoning' : 'Review this concept'}
            </Text>
            <Text style={styles.feedbackText}>{question.explanation}</Text>
            {currentIndex < questions.length - 1 ? (
              <Pressable style={styles.primaryButton} onPress={handleNext}>
                <Text style={styles.primaryText}>Next Question</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryButton} onPress={onCompleteQuiz}>
                <Text style={styles.primaryText}>Finish Quiz</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: 14,
  },
  summary: {
    backgroundColor: colors.cloud,
    borderRadius: 20,
    padding: 20,
  },
  summaryEyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  summaryTitle: {
    color: colors.maroonDeep,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  questionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  question: {
    flex: 1,
    minWidth: 220,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '700',
  },
  markButton: {
    backgroundColor: colors.goldFaint,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  markText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  option: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
    backgroundColor: colors.offWhite,
  },
  optionSelected: {
    borderColor: colors.maroon,
    backgroundColor: colors.maroonFaint,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  optionWrong: {
    borderColor: colors.error,
    backgroundColor: colors.errorBg,
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.maroon,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  feedbackBox: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  correctText: {
    color: colors.success,
  },
  wrongText: {
    color: colors.error,
  },
  feedbackText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.maroonDeep,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});

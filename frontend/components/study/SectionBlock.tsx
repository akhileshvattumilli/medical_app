import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Section } from '../../types/section';
import { colors } from '../../constants/theme';

interface SectionBlockProps {
  section: Section;
  completed: boolean;
  onComplete: () => void;
}

export default function SectionBlock({ section, completed, onComplete }: SectionBlockProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{section.type}</Text>
          <Text style={styles.title}>{section.title}</Text>
        </View>
        <Pressable
          style={[styles.completeButton, completed && styles.completeButtonDone]}
          onPress={onComplete}
        >
          <Text style={[styles.completeText, completed && styles.completeTextDone]}>
            {completed ? 'Completed' : 'Mark Section Done'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.content}>{section.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
  },
  completeButton: {
    backgroundColor: colors.maroonFaint,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  completeButtonDone: {
    backgroundColor: colors.successBg,
  },
  completeText: {
    color: colors.maroon,
    fontSize: 12,
    fontWeight: '700',
  },
  completeTextDone: {
    color: colors.success,
  },
  content: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 26,
  },
});

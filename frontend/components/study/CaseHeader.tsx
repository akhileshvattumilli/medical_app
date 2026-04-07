import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AdminCase } from '../../services/content/repository';
import { colors } from '../../constants/theme';

interface CaseHeaderProps {
  caseItem: AdminCase;
  completion: number;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}

export default function CaseHeader({
  caseItem,
  completion,
  bookmarked,
  onToggleBookmark,
}: CaseHeaderProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.topRow}>
        <View style={styles.kicker}>
          <Text style={styles.kickerText}>Interactive Case Study</Text>
        </View>
        <Pressable style={styles.bookmarkButton} onPress={onToggleBookmark}>
          <Text style={styles.bookmarkText}>{bookmarked ? 'Bookmarked' : 'Bookmark Case'}</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{caseItem.title}</Text>
      <Text style={styles.description}>{caseItem.shortDescription}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Difficulty</Text>
          <Text style={styles.metaValue}>{caseItem.difficulty}</Text>
        </View>
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>Completion</Text>
          <Text style={styles.metaValue}>{completion}%</Text>
        </View>
        <View style={styles.metaCardWide}>
          <Text style={styles.metaLabel}>Study Tags</Text>
          <View style={styles.tags}>
            {caseItem.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
    flexWrap: 'wrap',
  },
  kicker: {
    backgroundColor: colors.maroonFaint,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  kickerText: {
    color: colors.maroon,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookmarkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.cloud,
    borderWidth: 1,
    borderColor: colors.cardBgStrong,
  },
  bookmarkText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: colors.maroonDeep,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
    maxWidth: 900,
    marginBottom: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaCard: {
    width: 150,
    borderRadius: 16,
    backgroundColor: colors.cloud,
    padding: 14,
  },
  metaCardWide: {
    flex: 1,
    minWidth: 220,
    borderRadius: 16,
    backgroundColor: colors.cloud,
    padding: 14,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: colors.maroon,
    fontSize: 12,
    fontWeight: '600',
  },
});

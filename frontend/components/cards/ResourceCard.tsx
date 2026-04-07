import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Resource } from '../../types/resource';
import { colors } from '../../constants/theme';

interface ResourceCardProps {
  resource: Resource;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
}

export default function ResourceCard({
  resource,
  bookmarked = false,
  onToggleBookmark,
}: ResourceCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{resource.type}</Text>
        </View>
        {onToggleBookmark ? (
          <Pressable style={styles.bookmarkButton} onPress={onToggleBookmark}>
            <Text style={styles.bookmarkText}>
              {bookmarked ? 'Saved' : 'Save Resource'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title}>{resource.title}</Text>
      <Text style={styles.description}>{resource.description}</Text>
      {resource.caption ? (
        <Text style={styles.caption}>{resource.caption}</Text>
      ) : null}
      {resource.sourceReference ? (
        <Text style={styles.source}>
          {resource.sourceReference.fileName}
          {resource.sourceReference.pageNumber
            ? `, p. ${resource.sourceReference.pageNumber}`
            : ''}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.maroonFaint,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.maroon,
    textTransform: 'uppercase',
  },
  bookmarkButton: {
    backgroundColor: colors.cloud,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bookmarkText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
  },
  caption: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 17,
    marginBottom: 4,
  },
  source: {
    fontSize: 11,
    color: colors.textMuted,
  },
});

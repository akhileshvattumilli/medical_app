import { Pressable, Text, View, StyleSheet } from 'react-native';
import { System } from '../../types/system';
import { colors } from '../../constants/theme';

interface SystemCardProps {
  system: System;
  onPress: () => void;
  meta?: string;
  progress?: number;
}

export default function SystemCard({ system, onPress, meta, progress }: SystemCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.name}>{system.name}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {typeof progress === 'number' ? (
          <View style={styles.progressRow}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.chevron}>
        <Text style={styles.chevronText}>Explore</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: colors.cardBg,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.maroon,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 8,
  },
  chevronText: {
    fontSize: 12,
    color: colors.maroon,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

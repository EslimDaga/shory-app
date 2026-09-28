import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { ArrowUpRightIcon, SparkleIcon } from '@/components/Icons';
import { strings } from '@/i18n/es';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type Props = {
  visible: boolean;
  onWithSong: () => void;
  onDirect: () => void;
  onClose: () => void;
};

const text = strings.editor.share;

// How the story goes to Instagram. Only a story started inside Instagram can carry a song, so
// that route comes first; the direct share stays for stories that don't need one.
export function ShareSheet({ visible, onWithSong, onDirect, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} tone="dark">
      <Text style={styles.title}>{text.title}</Text>
      <Text style={styles.subtitle}>{text.subtitle}</Text>

      <View style={styles.options}>
        <Option
          featured
          icon={<SparkleIcon size={20} color={editorColors.onAccent} />}
          title={text.withSong}
          badge={text.withSongBadge}
          body={text.withSongBody}
          onPress={onWithSong}
        />
        <Option
          icon={<ArrowUpRightIcon size={20} color={editorColors.text} />}
          title={text.direct}
          body={text.directBody}
          onPress={onDirect}
        />
      </View>
    </BottomSheet>
  );
}

function Option({
  featured = false,
  icon,
  title,
  badge,
  body,
  onPress,
}: {
  featured?: boolean;
  icon: ReactNode;
  title: string;
  badge?: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      style={({ pressed }) => [styles.option, featured && styles.optionFeatured, pressed && styles.pressed]}
    >
      <View style={[styles.icon, featured && styles.iconFeatured]}>{icon}</View>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text style={styles.optionTitle}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.optionBody}>{body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.sansExtraBold, fontSize: 24, letterSpacing: -0.6, color: editorColors.text },
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    color: editorColors.textMuted,
    marginTop: 4,
  },
  options: { gap: 10, marginTop: 20, marginBottom: 8 },
  option: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: editorColors.surfaceRaised,
  },
  optionFeatured: { borderWidth: 1.5, borderColor: editorColors.accent },
  pressed: { opacity: 0.7 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: editorColors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFeatured: { backgroundColor: editorColors.accent },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  optionTitle: { fontFamily: fonts.sansSemiBold, fontSize: 16, color: editorColors.text },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: editorColors.accent,
  },
  badgeText: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: editorColors.onAccent },
  optionBody: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: editorColors.textMuted,
    marginTop: 4,
  },
});

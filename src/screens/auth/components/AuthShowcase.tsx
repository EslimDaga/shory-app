import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SourceLogo } from '@/components/SourceLogo';
import { riseIn } from '@/components/motion/calmEntrance';
import { strings } from '@/i18n/es';
import { onboardingColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { SUPPORTED_SOURCES } from '@/types/music';
import { PLAYER_SIZE } from '@/widgets/PlayerWidget';
import { PlayerShowcase } from './PlayerShowcase';

type Props = {
  width: number;
  compact: boolean;
  delay: number;
};

const PLAYER_WIDTH_RATIO = 0.84;
const BADGE_SIZE = 30;

export function AuthShowcase({ width, compact, delay }: Props) {
  const playerWidth = width * PLAYER_WIDTH_RATIO;
  const scale = playerWidth / PLAYER_SIZE.width;
  const playerHeight = PLAYER_SIZE.height * scale;

  return (
    <View style={styles.root}>
      {!compact && (
        // Entrance on the wrapper, rotation on the inner view: one view can't own both transforms.
        <Animated.View entering={riseIn(delay)}>
          <View style={[styles.player, { width: playerWidth, height: playerHeight }]}>
            <View
              style={{
                width: PLAYER_SIZE.width,
                height: PLAYER_SIZE.height,
                marginLeft: (playerWidth - PLAYER_SIZE.width) / 2,
                marginTop: (playerHeight - PLAYER_SIZE.height) / 2,
                transform: [{ scale }],
              }}
            >
              <PlayerShowcase active />
            </View>
          </View>
        </Animated.View>
      )}

      <Animated.View entering={FadeIn.delay(delay + 160).duration(500)} style={styles.sources}>
        <Text style={styles.sourcesLabel}>{strings.auth.worksWith}</Text>
        <View style={styles.badges}>
          {SUPPORTED_SOURCES.map((source, index) => (
            <View key={source} style={[styles.badge, index > 0 && styles.badgeOverlap]}>
              <SourceLogo source={source} size={BADGE_SIZE - 8} />
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: 18 },
  player: {
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#0A0A09',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  sources: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sourcesLabel: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: onboardingColors.inkMuted },
  badges: { flexDirection: 'row' },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F6F7F2',
  },
  badgeOverlap: { marginLeft: -6 },
});

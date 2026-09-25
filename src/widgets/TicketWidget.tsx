import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { SourceLogo } from '@/components/SourceLogo';
import { strings } from '@/i18n/es';
import { fonts } from '@/theme/typography';
import { formatDuration } from '@/utils/time';
import { getTonePalette } from './tonePalette';
import type { WidgetProps } from './types';

export const TICKET_SIZE = { width: 352, height: 156 };

const W = 340;
const H = 144;
const R = 16;
const CUT = 116;
const NOTCH = 10;

const TICKET_PATH = [
  `M${R},0`,
  `H${CUT - NOTCH}`,
  `A${NOTCH},${NOTCH} 0 0 0 ${CUT + NOTCH},0`,
  `H${W - R}`,
  `A${R},${R} 0 0 1 ${W},${R}`,
  `V${H - R}`,
  `A${R},${R} 0 0 1 ${W - R},${H}`,
  `H${CUT + NOTCH}`,
  `A${NOTCH},${NOTCH} 0 0 0 ${CUT - NOTCH},${H}`,
  `H${R}`,
  `A${R},${R} 0 0 1 0,${H - R}`,
  `V${R}`,
  `A${R},${R} 0 0 1 ${R},0`,
  'Z',
].join(' ');

const BARCODE_WIDTHS = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2];
const BARCODE_BARS = BARCODE_WIDTHS.map((w, i) => ({
  x: BARCODE_WIDTHS.slice(0, i).reduce((sum, v) => sum + v, 0),
  w,
})).filter((_, i) => i % 2 === 0);
const BARCODE_WIDTH = BARCODE_WIDTHS.reduce((sum, v) => sum + v, 0);

export function TicketWidget({ track, tone }: WidgetProps) {
  const palette = getTonePalette(tone, track.accentColor);

  return (
    <View style={styles.root}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Path d={TICKET_PATH} fill={palette.surface} stroke={palette.hairline} strokeWidth={1} />
        <Line
          x1={CUT}
          y1={NOTCH + 6}
          x2={CUT}
          y2={H - NOTCH - 6}
          stroke={palette.onSurfaceMuted}
          strokeWidth={1.2}
          strokeDasharray="3 4"
        />
      </Svg>

      <View style={styles.stub}>
        <Image source={{ uri: track.coverUrl }} style={styles.cover} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.kicker, { color: palette.onSurfaceMuted }]}>
          {strings.widgets.ticketHeadline}
        </Text>
        <Text style={[styles.title, { color: palette.onSurface }]} numberOfLines={1}>
          {track.title}
        </Text>
        {track.artist ? (
          <Text style={[styles.artist, { color: palette.onSurface }]} numberOfLines={1}>
            {track.artist.toUpperCase()}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Svg width={BARCODE_WIDTH} height={18}>
            {BARCODE_BARS.map((b) => (
              <Rect key={b.x} x={b.x} y={0} width={b.w} height={18} fill={palette.onSurface} />
            ))}
          </Svg>
          <Text style={[styles.meta, { color: palette.onSurfaceMuted }]}>
            {track.durationMs ? formatDuration(track.durationMs) : strings.widgets.ticketFallbackMeta}
          </Text>
          <View style={styles.spacer} />
          <SourceLogo source={track.source} size={18} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: TICKET_SIZE.width,
    height: TICKET_SIZE.height,
    padding: 6,
    backgroundColor: 'transparent',
    flexDirection: 'row',
  },
  stub: { width: CUT, height: H, alignItems: 'center', justifyContent: 'center' },
  cover: { width: 86, height: 86, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.25)' },
  body: { flex: 1, height: H, paddingLeft: 16, paddingRight: 16, paddingVertical: 16 },
  kicker: { fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1.6 },
  title: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.4, marginTop: 4 },
  artist: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.8, marginTop: -2 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 'auto' },
  meta: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 },
  spacer: { flex: 1 },
});

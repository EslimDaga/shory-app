import { StyleSheet, Text, View } from 'react-native';
import { SourceLogo } from '@/components/SourceLogo';
import { strings } from '@/i18n/es';
import { SUPPORTED_SOURCES } from '@/types/music';
import { brand, homeColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

type Props = { total: number };

export function StoriesCounter({ total }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{strings.home.storiesCreated}</Text>
      <Text style={styles.count}>{total}</Text>
      <View style={styles.pill}>
        <View style={styles.logos}>
          {SUPPORTED_SOURCES.map((source, index) => (
            <View
              key={source}
              style={[
                styles.logo,
                { marginLeft: index === 0 ? 0 : -7, zIndex: SUPPORTED_SOURCES.length - index },
              ]}
            >
              <SourceLogo source={source} size={22} />
            </View>
          ))}
        </View>
        <Text style={styles.pillText}>{strings.home.supportedServices}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: 64, marginBottom: 44 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 22, color: brand[900] },
  count: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 128,
    lineHeight: 138,
    color: homeColors.ink,
    letterSpacing: -4,
    marginBottom: 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingLeft: 8,
    paddingRight: 20,
    borderRadius: 25,
    backgroundColor: homeColors.dark,
    borderWidth: 1.5,
    borderColor: homeColors.darkBorder,
  },
  logos: { flexDirection: 'row' },
  logo: {
    borderRadius: 13,
    borderWidth: 2,
    borderColor: brand[950],
    backgroundColor: brand[950],
  },
  pillText: { fontFamily: fonts.sansSemiBold, fontSize: 18, color: brand[100] },
});

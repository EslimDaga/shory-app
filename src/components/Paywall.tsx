import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Bell } from 'phosphor-react-native/src/icons/Bell';
import { Check } from 'phosphor-react-native/src/icons/Check';
import { LockOpen } from 'phosphor-react-native/src/icons/LockOpen';
import { Sparkle } from 'phosphor-react-native/src/icons/Sparkle';
import { X } from 'phosphor-react-native/src/icons/X';
import { ShoryLogo } from '@/components/ShoryLogo';
import { LEGAL_URLS } from '@/constants/legal';
import { strings } from '@/i18n/es';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { WidgetPreview } from '@/screens/editor/components/WidgetPreview';
import type { Plan } from '@/services/purchases/purchases';
import { editorColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import type { TrackMetadata } from '@/types/music';
import { assetUri } from '@/utils/assetUri';
import { hapticSelection, hapticSuccess } from '@/utils/haptics';
import { CREST_KEYS } from '@/widgets/MatchWidget';
import { DEFAULT_WIDGET_CONFIG, findWidget } from '@/widgets/registry';
import type { WidgetConfig } from '@/widgets/types';

const text = strings.paywall;

// A made-up song to show the widgets with, from the app's own onboarding artwork.
const SAMPLE_TRACK: TrackMetadata = {
  source: 'spotify',
  url: 'https://shory.app',
  title: 'Golden Hour',
  artist: 'Shory',
  coverUrl: assetUri(require('../../assets/onboarding/cover-sunset.jpg')),
  accentColor: '#C4532F',
  durationMs: 210000,
};

const SHOWCASE: { widgetId: string; config: WidgetConfig }[] = [
  { widgetId: 'player', config: { ...DEFAULT_WIDGET_CONFIG, tone: 'accent' } },
  {
    widgetId: 'weather',
    config: {
      ...DEFAULT_WIDGET_CONFIG,
      tone: 'dark',
      content: { city: 'Lima', temp: '22', condition: 'night', high: '26', low: '17' },
    },
  },
  {
    widgetId: 'match',
    config: {
      ...DEFAULT_WIDGET_CONFIG,
      tone: 'light',
      content: {
        league: 'LaLiga · Jornada 12',
        home: 'Real Madrid',
        away: 'Barça',
        homeScore: '2',
        awayScore: '1',
        minute: 'Final',
        [CREST_KEYS.home]: 'https://crests.football-data.org/86.png',
        [CREST_KEYS.away]: 'https://crests.football-data.org/81.png',
      },
    },
  },
];

// Scrolling content dissolves into the background this far above the plans, instead of being
// cut by a hard edge.
const FADE_HEIGHT = 48;

const periodLabel = (plan: Plan) => (plan.period === 'annual' ? text.perYear : text.perMonth);

// Shory Pro. Mounted once at the root; any locked feature opens it through useSubscription().
export function Paywall() {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const {
    paywall,
    plans,
    plansStatus,
    plansError,
    reloadPlans,
    busy,
    error,
    available,
    closePaywall,
    buy,
    restorePurchases,
    unlocked,
  } = useSubscription();
  const [picked, setPicked] = useState<Plan['period']>('annual');

  // The annual plan leads (it carries the trial); falls back to whatever the store offers.
  const plan = plans.find((candidate) => candidate.period === picked) ?? plans[0] ?? null;
  const trialDays = plan?.trialDays ?? null;
  const showcaseWidth = window.width - 48;

  const subscribe = async () => {
    if (!plan) return;
    hapticSelection();
    if (await buy(plan)) hapticSuccess();
  };

  const restore = async () => {
    if (await restorePurchases()) hapticSuccess();
  };

  return (
    <Modal
      visible={paywall !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closePaywall}
    >
      {unlocked ? (
        <Welcome action={unlocked} bottomInset={insets.bottom} onDone={closePaywall} />
      ) : (
        <View style={styles.screen}>
          <View style={styles.body}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.topBar}>
                <View style={styles.brand} accessibilityRole="header" accessibilityLabel={text.brand}>
                  <ShoryLogo width={74} color={editorColors.text} trackColor="rgba(255, 255, 255, 0.18)" />
                  <View style={styles.proTag}>
                    <Sparkle size={10} color={editorColors.onAccent} weight="fill" />
                    <Text style={styles.proTagText}>{text.proBadge}</Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={text.close}
                  onPress={closePaywall}
                  hitSlop={10}
                  style={({ pressed }) => [styles.close, pressed && styles.pressed]}
                >
                  <X size={16} color={editorColors.text} weight="bold" />
                </Pressable>
              </View>

              <Text style={styles.hero}>
                {text.heroTop}
                {'\n'}
                <Text style={styles.heroAccent}>{text.heroAccent}</Text>
              </Text>
              <Text style={styles.subtitle}>{text.headlines[paywall ?? 'upgrade']}</Text>

              <Showcase width={showcaseWidth} />

              <View style={styles.benefits}>
                {Object.values(text.benefits).map((label) => (
                  <View key={label} style={styles.benefit}>
                    <Check size={14} color={editorColors.accent} weight="bold" />
                    <Text style={styles.benefitText}>{label}</Text>
                  </View>
                ))}
              </View>

              {trialDays && plan ? (
                <View style={styles.timeline}>
                  <TimelineStep
                    icon={<LockOpen size={16} color={editorColors.onAccent} weight="fill" />}
                    title={text.timeline.todayTitle}
                    body={text.timeline.todayBody}
                    highlighted
                  />
                  <TimelineStep
                    icon={<Sparkle size={16} color={editorColors.text} weight="fill" />}
                    title={text.timeline.trialTitle(trialDays)}
                    body={text.timeline.trialBody}
                  />
                  <TimelineStep
                    icon={<Bell size={16} color={editorColors.text} weight="fill" />}
                    title={text.timeline.chargeTitle(trialDays)}
                    body={text.timeline.chargeBody(`${plan.price} ${periodLabel(plan)}`)}
                    last
                  />
                </View>
              ) : null}

              <Text style={styles.renewal}>{text.renewal}</Text>
            </ScrollView>
            <BottomFade />
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
            <Plans
              plans={plans}
              status={plansStatus}
              errorDetail={plansError}
              available={available}
              selected={plan?.period ?? null}
              onSelect={(period) => {
                hapticSelection();
                setPicked(period);
              }}
              onRetry={reloadPlans}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={subscribe}
              disabled={!plan || busy !== null}
              style={({ pressed }) => [
                styles.cta,
                (!plan || busy !== null) && styles.ctaDisabled,
                pressed && styles.pressed,
              ]}
            >
              {busy === 'purchase' ? (
                <ActivityIndicator color={editorColors.onAccent} />
              ) : (
                <>
                  <Text style={styles.ctaText}>
                    {trialDays ? text.startTrial(trialDays) : text.subscribe}
                  </Text>
                  {plan && (
                    <Text style={styles.ctaDetail}>
                      {trialDays ? text.thenPrice(plan.price, periodLabel(plan)) : text.cancelAnytime}
                    </Text>
                  )}
                </>
              )}
            </Pressable>

            <View style={styles.links}>
              <Pressable
                accessibilityRole="link"
                onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
                hitSlop={8}
              >
                <Text style={styles.link}>{text.privacy}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={restore} disabled={busy !== null} hitSlop={8}>
                {busy === 'restore' ? (
                  <ActivityIndicator size="small" color={editorColors.textMuted} />
                ) : (
                  <Text style={styles.link}>{text.restore}</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() => WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
                hitSlop={8}
              >
                <Text style={styles.link}>{text.terms}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

// Shown in place of the offer once Pro is unlocked, so a purchase always ends in a clear "done".
function Welcome({
  action,
  bottomInset,
  onDone,
}: {
  action: 'purchase' | 'restore';
  bottomInset: number;
  onDone: () => void;
}) {
  const copy = text.welcome;
  return (
    <View style={[styles.screen, styles.welcome, { paddingBottom: bottomInset + 16 }]}>
      <View style={styles.welcomeCenter}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.welcomeMark}>
          <Check size={44} color={editorColors.onAccent} weight="bold" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(420)} style={styles.welcomeBrand}>
          <ShoryLogo width={70} color={editorColors.text} trackColor="rgba(255, 255, 255, 0.18)" />
          <View style={styles.proTag}>
            <Sparkle size={10} color={editorColors.onAccent} weight="fill" />
            <Text style={styles.proTagText}>{text.proBadge}</Text>
          </View>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(180).duration(420)}
          style={styles.welcomeTitle}
          accessibilityRole="header"
        >
          {action === 'purchase' ? copy.purchaseTitle : copy.restoreTitle}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(240).duration(420)} style={styles.welcomeBody}>
          {action === 'purchase' ? copy.purchaseBody : copy.restoreBody}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(420)} style={styles.welcomeList}>
          {Object.values(text.benefits).map((label) => (
            <View key={label} style={styles.welcomeRow}>
              <View style={styles.welcomeCheck}>
                <Check size={12} color={editorColors.onAccent} weight="bold" />
              </View>
              <Text style={styles.welcomeRowText}>{label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(420).duration(300)}>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{copy.cta}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function BottomFade() {
  return (
    <View pointerEvents="none" style={styles.fade}>
      <Svg width="100%" height={FADE_HEIGHT}>
        <Defs>
          <LinearGradient id="paywall-fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={editorColors.background} stopOpacity={0} />
            <Stop offset="1" stopColor={editorColors.background} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={FADE_HEIGHT} fill="url(#paywall-fade)" />
      </Svg>
    </View>
  );
}

function Plans({
  plans,
  status,
  errorDetail,
  available,
  selected,
  onSelect,
  onRetry,
}: {
  plans: Plan[];
  status: 'idle' | 'loading' | 'failed';
  errorDetail: string | null;
  available: boolean;
  selected: Plan['period'] | null;
  onSelect: (period: Plan['period']) => void;
  onRetry: () => void;
}) {
  if (plans.length > 0) {
    return (
      <View style={styles.plans} accessibilityRole="radiogroup">
        {plans.map((plan) => (
          <PlanCard
            key={plan.period}
            plan={plan}
            selected={selected === plan.period}
            onPress={() => onSelect(plan.period)}
          />
        ))}
      </View>
    );
  }
  if (!available) return <Text style={styles.notice}>{text.unavailable}</Text>;
  if (status === 'loading') {
    // Two placeholder cards in the plans' exact size, so nothing jumps when they arrive.
    return (
      <View style={styles.plans}>
        <View style={[styles.plan, styles.planSkeleton]}>
          <ActivityIndicator color={editorColors.textFaint} />
        </View>
        <View style={[styles.plan, styles.planSkeleton]} />
      </View>
    );
  }
  return (
    <View style={styles.failed}>
      <Text style={styles.notice}>{text.plansFailed}</Text>
      {errorDetail ? <Text style={styles.errorDetail}>{errorDetail}</Text> : null}
      <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8}>
        <Text style={styles.retry}>{text.retry}</Text>
      </Pressable>
    </View>
  );
}

function PlanCard({ plan, selected, onPress }: { plan: Plan; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.period === 'annual' ? text.annual : text.monthly}, ${plan.price} ${periodLabel(plan)}`}
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}
    >
      {plan.trialDays ? (
        <View style={styles.trialBadge}>
          <Text style={styles.trialBadgeText}>{text.trialBadge(plan.trialDays)}</Text>
        </View>
      ) : null}
      <View style={styles.planHeader}>
        <Text style={[styles.planTitle, !selected && styles.planMuted]}>
          {plan.period === 'annual' ? text.annual : text.monthly}
        </Text>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <Check size={11} color={editorColors.onAccent} weight="bold" />}
        </View>
      </View>
      <Text style={[styles.planPrice, !selected && styles.planMuted]} numberOfLines={1} adjustsFontSizeToFit>
        {plan.price}
      </Text>
      <Text style={styles.planDetail} numberOfLines={1}>
        {plan.period === 'annual' && plan.pricePerMonth
          ? text.perMonthShort(plan.pricePerMonth)
          : periodLabel(plan)}
      </Text>
    </Pressable>
  );
}

// The three widgets, one per page, at full width: swipe through them.
function Showcase({ width }: { width: number }) {
  const [page, setPage] = useState(0);
  const height = width * (200 / 352);
  return (
    <View style={styles.showcase}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width }}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
      >
        {SHOWCASE.map(({ widgetId, config }) => (
          <WidgetPreview
            key={widgetId}
            widget={findWidget(widgetId)}
            track={SAMPLE_TRACK}
            config={config}
            width={width}
            height={height}
            padding={0}
          />
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SHOWCASE.map(({ widgetId }, index) => (
          <View key={widgetId} style={[styles.dot, index === page && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

function TimelineStep({
  icon,
  title,
  body,
  highlighted = false,
  last = false,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  highlighted?: boolean;
  last?: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        <View style={[styles.stepIcon, highlighted && styles.stepIconHighlighted]}>{icon}</View>
        {!last && <View style={styles.stepLine} />}
      </View>
      <View style={[styles.stepText, !last && styles.stepTextSpaced]}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: editorColors.background },
  body: { flex: 1 },
  welcome: { paddingHorizontal: 24, justifyContent: 'space-between' },
  welcomeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  welcomeMark: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: editorColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
  welcomeTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 36,
    lineHeight: 39,
    letterSpacing: -1.4,
    color: editorColors.text,
    textAlign: 'center',
    marginTop: 16,
  },
  welcomeBody: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 21,
    color: editorColors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  welcomeList: {
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 32,
    padding: 18,
    borderRadius: 20,
    backgroundColor: editorColors.surfaceRaised,
  },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  welcomeCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: editorColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeRowText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: editorColors.text },
  content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: FADE_HEIGHT },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FADE_HEIGHT },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    height: 20,
    borderRadius: 6,
    backgroundColor: editorColors.accent,
  },
  proTagText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: editorColors.onAccent,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: editorColors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  hero: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1.6,
    color: editorColors.text,
    marginTop: 22,
  },
  heroAccent: { color: editorColors.accent },
  subtitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 21,
    color: editorColors.textMuted,
    marginTop: 10,
  },
  showcase: { marginTop: 24, alignItems: 'center', gap: 10 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: editorColors.textFaint },
  dotActive: { width: 18, backgroundColor: editorColors.accent },
  benefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: editorColors.surfaceRaised,
  },
  benefitText: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: editorColors.text },
  timeline: { marginTop: 28 },
  step: { flexDirection: 'row', gap: 14 },
  stepRail: { alignItems: 'center', width: 32 },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: editorColors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconHighlighted: { backgroundColor: editorColors.accent },
  stepLine: { flex: 1, width: 2, borderRadius: 1, backgroundColor: editorColors.hairline, marginVertical: 4 },
  stepText: { flex: 1, paddingTop: 5 },
  stepTextSpaced: { paddingBottom: 18 },
  stepTitle: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: editorColors.text },
  stepBody: { fontFamily: fonts.sansMedium, fontSize: 13, color: editorColors.textMuted, marginTop: 2 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 10,
    backgroundColor: editorColors.background,
  },
  plans: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  plan: {
    flex: 1,
    height: 92,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderRadius: 20,
    backgroundColor: editorColors.surface,
    borderWidth: 1.5,
    borderColor: editorColors.hairline,
    justifyContent: 'space-between',
  },
  planSelected: { borderColor: editorColors.accent, backgroundColor: editorColors.surfaceRaised },
  planSkeleton: {
    borderColor: 'transparent',
    backgroundColor: editorColors.surfaceRaised,
    opacity: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planTitle: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: editorColors.text },
  planMuted: { color: editorColors.textMuted },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: editorColors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: editorColors.accent, borderColor: editorColors.accent },
  planPrice: { fontFamily: fonts.sansExtraBold, fontSize: 20, letterSpacing: -0.5, color: editorColors.text },
  planDetail: { fontFamily: fonts.sansMedium, fontSize: 12, color: editorColors.textMuted },
  trialBadge: {
    position: 'absolute',
    top: -11,
    left: 12,
    paddingHorizontal: 9,
    height: 22,
    borderRadius: 11,
    backgroundColor: editorColors.accent,
    justifyContent: 'center',
  },
  trialBadgeText: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: editorColors.onAccent },
  notice: { fontFamily: fonts.sansMedium, fontSize: 14, color: editorColors.textMuted, textAlign: 'center' },
  failed: { alignItems: 'center', gap: 6, paddingVertical: 12 },
  errorDetail: { fontFamily: fonts.mono, fontSize: 11, color: editorColors.danger, textAlign: 'center' },
  retry: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: editorColors.accent },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: editorColors.danger, textAlign: 'center' },
  cta: {
    height: 56,
    borderRadius: 28,
    backgroundColor: editorColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontFamily: fonts.sansExtraBold, fontSize: 17, color: editorColors.onAccent },
  ctaDetail: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: editorColors.onAccent,
    opacity: 0.75,
    marginTop: 1,
  },
  links: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  link: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: editorColors.textMuted },
  renewal: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 15,
    color: editorColors.textFaint,
    textAlign: 'center',
    marginTop: 28,
  },
});

import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { PillButton } from '@/components/PillButton';
import { LEGAL_URLS } from '@/constants/legal';
import { strings } from '@/i18n/es';
import { useAuth } from '@/providers/AuthProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { manageSubscription } from '@/services/purchases/purchases';
import { brand, homeColors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { getErrorMessage } from '@/utils/errors';
import { userInitial } from './AccountButton';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AccountSheet({ visible, onClose }: Props) {
  const { user, signOut, deleteAccount } = useAuth();
  const { openPaywall } = useSubscription();
  // "Upgrade" closes this sheet first; the paywall opens only once it's fully dismissed.
  const upgradeAfterClose = useRef(false);
  const [busy, setBusy] = useState<'signOut' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const providerName = user ? strings.auth.providerNames[user.provider] : '';

  const handleSignOut = async () => {
    setBusy('signOut');
    await signOut();
    setBusy(null);
  };

  const confirmDelete = () => {
    Alert.alert(strings.account.deleteConfirmTitle, strings.account.deleteConfirmBody, [
      { text: strings.account.cancel, style: 'cancel' },
      {
        text: strings.account.deleteConfirm,
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          setError(null);
          try {
            await deleteAccount();
          } catch (caught) {
            setError(getErrorMessage(caught));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={() => {
        if (!upgradeAfterClose.current) return;
        upgradeAfterClose.current = false;
        openPaywall('upgrade');
      }}
    >
      <View style={styles.profile}>
        <View style={styles.avatar}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.initial}>{userInitial(user)}</Text>
          )}
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {user?.name ?? strings.account.anonymousName}
          </Text>
          {user?.email ? (
            <Text style={styles.detail} numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
          <Text style={styles.detail}>{strings.account.signedInWith(providerName)}</Text>
        </View>
      </View>

      <PlanCard
        onUpgrade={() => {
          upgradeAfterClose.current = true;
          onClose();
        }}
      />

      <View style={styles.actions}>
        <PillButton
          label={strings.account.signOut}
          variant="light"
          loading={busy === 'signOut'}
          disabled={busy !== null}
          onPress={handleSignOut}
        />
        <Pressable
          accessibilityRole="button"
          onPress={confirmDelete}
          disabled={busy !== null}
          style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
        >
          {busy === 'delete' ? (
            <ActivityIndicator color={homeColors.error} />
          ) : (
            <Text style={styles.deleteText}>{strings.account.deleteAccount}</Text>
          )}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.legal}>
        <LegalLink label={strings.account.privacy} url={LEGAL_URLS.privacy} />
        <Text style={styles.legalDot}>·</Text>
        <LegalLink label={strings.account.terms} url={LEGAL_URLS.terms} />
      </View>
    </BottomSheet>
  );
}

function LegalLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={8}
      onPress={() => WebBrowser.openBrowserAsync(url)}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Text style={styles.legalLink}>{label}</Text>
    </Pressable>
  );
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });

// The account's plan, with the one action that fits it: upgrade, or manage in the App Store.
function PlanCard({ onUpgrade }: { onUpgrade: () => void }) {
  const { isPro, serverPlan, available, restorePurchases, busy } = useSubscription();
  const expiresAt = serverPlan?.expiresAt ?? null;
  const detail =
    !isPro || !expiresAt
      ? null
      : serverPlan?.periodType === 'trial'
        ? strings.account.trialUntil(formatDate(expiresAt))
        : serverPlan?.willRenew
          ? strings.account.renewsOn(formatDate(expiresAt))
          : strings.account.endsOn(formatDate(expiresAt));

  return (
    <View style={styles.plan}>
      <View style={styles.planInfo}>
        <Text style={styles.planName}>{isPro ? strings.account.planPro : strings.account.planFree}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {available && (
        <View style={styles.planActions}>
          <PillButton
            label={isPro ? strings.account.manage : strings.account.upgrade}
            variant={isPro ? 'light' : 'dark'}
            onPress={() => {
              if (isPro) {
                manageSubscription();
                return;
              }
              onUpgrade();
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={restorePurchases}
            disabled={busy !== null}
            hitSlop={8}
            style={({ pressed }) => [styles.restore, pressed && styles.pressed]}
          >
            {busy === 'restore' ? (
              <ActivityIndicator color={homeColors.inkMuted} />
            ) : (
              <Text style={styles.legalLink}>{strings.account.restore}</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  initial: { fontFamily: fonts.sansExtraBold, fontSize: 28, color: brand[950] },
  identity: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.sansExtraBold, fontSize: 22, letterSpacing: -0.4, color: homeColors.ink },
  detail: { fontFamily: fonts.sansMedium, fontSize: 14, color: homeColors.inkMuted },
  actions: { gap: 8 },
  plan: {
    borderRadius: 20,
    backgroundColor: homeColors.line,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  planInfo: { gap: 2 },
  planName: { fontFamily: fonts.sansExtraBold, fontSize: 18, color: homeColors.ink },
  planActions: { gap: 6 },
  restore: { height: 32, alignItems: 'center', justifyContent: 'center' },
  delete: { height: 52, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  deleteText: { fontFamily: fonts.sansSemiBold, fontSize: 16, color: homeColors.error },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: homeColors.error, textAlign: 'center' },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  legalLink: { fontFamily: fonts.sansMedium, fontSize: 13, color: homeColors.inkMuted },
  legalDot: { fontFamily: fonts.sansMedium, fontSize: 13, color: homeColors.inkMuted },
});

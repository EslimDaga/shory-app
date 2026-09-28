import * as Haptics from 'expo-haptics';

export const hapticSelection = () => Haptics.selectionAsync().catch(() => {});

export const hapticImpact = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

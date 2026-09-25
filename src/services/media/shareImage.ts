import Share from 'react-native-share';

/** Opens the system share sheet. Resolves to false when the user dismisses it. */
export async function shareImage(fileUri: string): Promise<boolean> {
  const result = await Share.open({ url: fileUri, type: 'image/jpeg', failOnCancel: false });
  return result.success && !result.dismissedAction;
}

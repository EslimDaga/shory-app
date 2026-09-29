import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// VoiceOver ignores live regions, so iOS speaks new messages explicitly. Android and web already
// read the message's aria-live region, and announcing there too would read it twice.
export function useAnnounce(message: string | null | undefined) {
  // Seeded with the first value: a message on screen at mount is left over from the previous step,
  // which clears it as it unmounts, so only messages that appear later are spoken.
  const lastMessage = useRef(message);

  useEffect(() => {
    if (message === lastMessage.current) return;
    lastMessage.current = message;
    if (Platform.OS === 'ios' && message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}

import { Alert } from 'react-native';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
};

// Asks before a destructive action. Resolves true only if the person taps the confirm button.
export function confirmDestructive({ title, message, confirmLabel, cancelLabel }: ConfirmOptions) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      // Android can dismiss the dialog by tapping outside it.
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

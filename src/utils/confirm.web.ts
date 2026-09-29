type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
};

// react-native-web's Alert does nothing, so the browser's own dialog asks instead. It can't
// relabel its buttons, so only the title and message carry over.
export function confirmDestructive({ title, message }: ConfirmOptions) {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}

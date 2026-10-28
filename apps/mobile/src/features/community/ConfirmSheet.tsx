import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/** Asks before something that cannot be undone. A sheet, not an alert, so it looks the same on every platform. */
export function ConfirmSheet({ open, title, body, confirmLabel, busy, problem, onConfirm, onClose }: {
  open: boolean; title: string; body: string; confirmLabel: string; busy?: boolean; problem?: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Sheet open={open} title={title} onClose={onClose} footer={<Button variant="danger" label={busy ? 'Working…' : confirmLabel} disabled={busy} onPress={onConfirm} />}>
      <Text variant="body">{body}</Text>
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}

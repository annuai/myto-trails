import { useEffect, useState } from 'react';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { hasLink } from '@/lib/community';
import { useOnChange } from '@/lib/useOnChange';

/**
 * One text box in a sheet: a reply, a comment edit, a report. The text is cleared each time the sheet opens, and kept if the
 * save fails, so nothing a rider typed is lost to a bad connection.
 */
export function TextSheet({ open, title, label, hint, submitLabel, initial = '', min = 1, max, noLinks = true, busy, problem, onSubmit, onClose }: {
  open: boolean; title: string; label: string; hint?: string; submitLabel: string; initial?: string; min?: number; max: number; noLinks?: boolean;
  busy?: boolean; problem?: string; onSubmit: (text: string) => void; onClose: () => void;
}) {
  const [text, setText] = useState(initial);
  useOnChange(`${open}|${initial}`, () => { if (open) setText(initial); });
  const t = text.trim();
  const linkProblem = noLinks && hasLink(t) ? 'Please leave web addresses out.' : undefined;
  return (
    <Sheet open={open} title={title} onClose={onClose} footer={<Button label={busy ? 'Saving…' : submitLabel} disabled={busy || t.length < min || !!linkProblem} onPress={() => onSubmit(t)} />}>
      <Field label={label} value={text} onChangeText={setText} multiline autoFocus maxLength={max} hint={hint} error={linkProblem} />
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
    </Sheet>
  );
}

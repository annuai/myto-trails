import { useEffect, useState } from 'react';
import { nextUnlocked, noteFieldShown } from '@/lib/typingGate';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { useOnChange } from '@/lib/useOnChange';

/**
 * Write a note. While the vehicle is moving the field is not shown. Whether typing is allowed is decided when the sheet
 * opens: once it is open for typing, nothing that happens to the vehicle closes it or takes the field away. The draft is
 * kept if the sheet is dismissed, and cleared only when it is saved.
 */
export function NoteSheet({ open, canType, onSave, onClose }: { open: boolean; canType: boolean; onSave: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [unlocked, setUnlocked] = useState(() => nextUnlocked(false, { open, canType }));
  useOnChange(`${open}|${canType}`, () => setUnlocked((u) => nextUnlocked(u, { open, canType })));
  return (
    <Sheet open={open} title="Write a note" onClose={onClose}>
      {noteFieldShown({ open, canType, unlocked }) ? (
        <>
          <Field label="Note" value={text} onChangeText={setText} multiline autoFocus />
          <Button label="Save note" disabled={!text.trim()} onPress={() => { onSave(text); setText(''); onClose(); }} />
        </>
      ) : (
        <Text variant="label" tone="muted">Available when you have stopped. Voice notes and photos work while you ride.</Text>
      )}
    </Sheet>
  );
}

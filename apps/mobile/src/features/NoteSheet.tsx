import { useEffect, useState } from 'react';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';

/**
 * Write a note. While the vehicle is moving the field is not shown. If the vehicle starts moving while a note is being
 * typed, what was written is saved as a note and the sheet closes, so nothing is lost and nobody keeps typing.
 */
export function NoteSheet({ open, canType, onSave, onClose }: { open: boolean; canType: boolean; onSave: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (open && !canType && text.trim()) { onSave(text); setText(''); onClose(); }
  }, [open, canType]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setText(''); onClose(); };
  return (
    <Sheet open={open} title="Write a note" onClose={close}>
      {canType ? (
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

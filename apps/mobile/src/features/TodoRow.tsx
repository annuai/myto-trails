import { View } from 'react-native';
import { RotateCcw, Trash2, Wrench } from 'lucide-react-native';
import { Icon } from '@/ui/Icon';
import { dueInfo, type Todo } from '@/lib/todos';
import { Checkbox } from '@/ui/Checkbox';
import { IconButton } from '@/ui/IconButton';
import { Text } from '@/ui/Text';
import { StatusChip } from '@/ui/Chip';

type Props = { todo: Todo; appKm: number; onToggle: () => void; onRemove: () => void; onServiceDone: () => void };

export function TodoRow({ todo, appKm, onToggle, onRemove, onServiceDone }: Props) {
  const due = dueInfo(todo, appKm);
  const service = todo.kind === 'service';
  return (
    <View style={{ minHeight: 72, paddingLeft: 8, paddingRight: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {service ? <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Icon icon={Wrench} size={22} tone="muted" /></View> : <Checkbox checked={todo.done} onChange={onToggle} label={`Mark ${todo.title} done`} />}
      <View style={{ flex: 1, gap: 4, paddingVertical: 4 }}>
        <Text variant="body" tone={todo.done ? 'muted' : 'ink'} style={todo.done ? { textDecorationLine: 'line-through' } : undefined}>{todo.title}</Text>
        {due.state === 'overdue' ? <StatusChip status="stop" label={due.text} />
          : due.state === 'soon' ? <StatusChip status="caution" label={due.text} />
          : <Text variant="label" tone="muted">{due.text}</Text>}
      </View>
      {service ? <IconButton icon={RotateCcw} label={`Mark ${todo.title} done and restart the count`} onPress={onServiceDone} plain /> : null}
      <IconButton icon={Trash2} label={`Remove ${todo.title}`} onPress={onRemove} plain tone="muted" />
    </View>
  );
}

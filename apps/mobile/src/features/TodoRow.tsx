import { View } from 'react-native';
import { RotateCcw, Trash2, Wrench } from 'lucide-react-native';
import { Icon } from '@/ui/Icon';
import { dueInfo, type Todo } from '@/lib/todos';
import { Checkbox } from '@/ui/Checkbox';
import { IconButton } from '@/ui/IconButton';
import { Text } from '@/ui/Text';
import { StatusChip } from '@/ui/Chip';

import { space, size } from '@/theme/tokens';
type Props = { todo: Todo; appKm: number; onToggle: () => void; onRemove: () => void; onServiceDone: () => void };

export function TodoRow({ todo, appKm, onToggle, onRemove, onServiceDone }: Props) {
  const due = dueInfo(todo, appKm);
  const service = todo.kind === 'service';
  return (
    <View style={{ minHeight: size.rowTall, paddingLeft: space[2], paddingRight: space[2], paddingVertical: space[2], flexDirection: 'row', alignItems: 'center', gap: space[1] }}>
      {service ? <View style={{ width: size.target, height: size.target, alignItems: 'center', justifyContent: 'center' }}><Icon icon={Wrench} size={22} tone="muted" /></View> : <Checkbox checked={todo.done} onChange={onToggle} label={`Mark ${todo.title} done`} />}
      <View style={{ flex: 1, gap: space[1], paddingVertical: space[1] }}>
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

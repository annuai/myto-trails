import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import { inColumn, type ColumnItem } from './columnItems';
import { useLayout } from './useLayout';

import { space } from '@/theme/tokens';

type Props = { rightStartsWithSection?: boolean } & ({ left: ReactNode; right: ReactNode; ratio?: number; items?: undefined } | { items: ColumnItem[]; left?: undefined; right?: undefined; ratio?: undefined });

/**
 * One column in portrait, two side by side in landscape.
 * `left`/`right`: portrait stacks left then right; put the most important content on the left.
 * `items`: portrait stacks the list in order (the page keeps its order), landscape puts each block in its own `side`, so the columns can be balanced
 * by what each block weighs (a short column beside a long one looks lopsided) without reordering the page in portrait.
 */
export function Columns({ rightStartsWithSection, ...p }: Props) {
  const { landscape } = useLayout();
  if (p.items) {
    const items = p.items;
    if (!landscape) return <>{items.map((i) => <Fragment key={i.key}>{i.node}</Fragment>)}</>;
    const column = (side: ColumnItem['side']) => inColumn(items, side).map((i) => <Fragment key={i.key}>{i.node}</Fragment>);
    return <Row2 left={column('left')} right={column('right')} rightStartsWithSection={rightStartsWithSection} />;
  }
  if (!landscape) return <>{p.left}{p.right}</>;
  return <Row2 left={p.left} right={p.right} ratio={p.ratio} rightStartsWithSection={rightStartsWithSection} />;
}

function Row2({ left, right, ratio = 1, rightStartsWithSection }: { left: ReactNode; right: ReactNode; ratio?: number; rightStartsWithSection?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: space[6], alignItems: 'flex-start' }}>
      <View style={{ flex: ratio, minWidth: 0 }}>{left}</View>
      <View style={{ flex: 1, minWidth: 0, marginTop: rightStartsWithSection ? -space[8] : 0 }}>{right}</View>
    </View>
  );
}

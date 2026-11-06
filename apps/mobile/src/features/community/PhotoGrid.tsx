import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ClubPhoto } from '@/api/types';
import { fixed, radius, scrim, space } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { loneRatio, photoRows } from '@/lib/photoLayout';
import { photoPost } from './photos.tokens';

/** A post's photos as a tidy grid of previews. Tapping one opens it in the viewer. */
export function PhotoGrid({ photos, onOpen }: { photos: ClubPhoto[]; onOpen: (index: number) => void }) {
  const [width, setWidth] = useState(0);
  const rows = photoRows(photos.length);
  const extra = photos.length - 4;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ gap: space[1] }}>
      {width > 0 ? rows.map((row, r) => {
        const cell = (width - space[1] * (row.length - 1)) / row.length;
        return (
          <View key={r} style={{ flexDirection: 'row', gap: space[1] }}>
            {row.map((i) => {
              const p = photos[i]!;
              const alone = row.length === 1;
              const height = alone ? cell / (photos.length === 1 ? loneRatio(p.width, p.height) : photoPost.wideRatio) : cell;
              const last = i === 3 && extra > 0;
              return (
                <Pressable key={p.id} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 1} of ${photos.length}`} onPress={() => onOpen(i)}
                  style={{ width: cell, height, borderRadius: radius.control, overflow: 'hidden', backgroundColor: p.colour ?? undefined }}>
                  <Image source={{ uri: alone ? p.viewUrl : p.thumbUrl }} style={{ width: cell, height }} resizeMode="cover" />
                  {last ? (
                    <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: scrim.sheet }} />
                  ) : null}
                  {last ? <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }}><Text variant="title" style={{ color: fixed.white }}>{`+${extra}`}</Text></View> : null}
                </Pressable>
              );
            })}
          </View>
        );
      }) : null}
    </View>
  );
}

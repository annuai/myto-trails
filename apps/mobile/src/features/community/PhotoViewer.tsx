import { useRef, useState } from 'react';
import { FlatList, Image, Modal, View, useWindowDimensions } from 'react-native';
import { Download, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ClubPhoto } from '@/api/types';
import { useOnChange } from '@/lib/useOnChange';
import { fixed, space } from '@/theme/tokens';
import { IconButton } from '@/ui/IconButton';
import { Text } from '@/ui/Text';
import { photoPost } from './photos.tokens';

/** Photos full screen: swipe between them, tap Save to keep the 2048-pixel copy in the phone's photo library. */
export function PhotoViewer({ photos, start, onClose, onSave, onSaveAll, note }: {
  photos: ClubPhoto[]; start: number | null; onClose: () => void; onSave: (p: ClubPhoto) => void; onSaveAll?: () => void;
  /** What happened to the last save, shown at the bottom. */
  note?: string;
}) {
  const { width, height } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  const [index, setIndex] = useState(start ?? 0);
  const list = useRef<FlatList<ClubPhoto>>(null);
  useOnChange(start, (s) => { if (s !== null) setIndex(s); });
  const open = start !== null;
  return (
    <Modal visible={open} animationType="fade" onRequestClose={onClose} transparent={false} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: fixed.ink }}>
        {open ? (
          <FlatList ref={list} data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(p) => p.id} initialScrollIndex={start ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height, alignItems: 'center', justifyContent: 'center', backgroundColor: item.colour ?? undefined }}>
                <Image source={{ uri: item.viewUrl }} style={{ width, height }} resizeMode="contain" accessibilityIgnoresInvertColors />
              </View>
            )} />
        ) : null}
        <View style={{ position: 'absolute', top: inset.top, left: 0, right: 0, height: photoPost.viewerBar, paddingHorizontal: space[3], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon={X} label="Close" onPress={onClose} />
          <Text variant="labelMedium" style={{ color: fixed.white }}>{`${index + 1} of ${photos.length}`}</Text>
          <IconButton icon={Download} label="Save this photo" onPress={() => photos[index] && onSave(photos[index]!)} />
        </View>
        <View style={{ position: 'absolute', left: space[5], right: space[5], bottom: inset.bottom + space[4], alignItems: 'center', gap: space[2] }}>
          {note ? <Text variant="label" style={{ color: fixed.white }} accessibilityLiveRegion="polite">{note}</Text> : null}
          {onSaveAll && photos.length > 1 ? <Text variant="labelMedium" accessibilityRole="button" onPress={onSaveAll} style={{ color: fixed.white, paddingVertical: space[3] }}>{`Save all ${photos.length}`}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { Image, Platform, ScrollView, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { DEFAULT_INTENSITY, LOOKS, type FilmLook } from '@/lib/filmLook';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { ChoiceChip } from '@/ui/Chip';
import { FilmImage } from '@/ui/FilmImage';
import { Sheet } from '@/ui/Sheet';
import { Slider } from '@/ui/Slider';
import { Text } from '@/ui/Text';
import { bakeSize, useBake } from './useBake';
import { filmSheet } from './FilmSheet.tokens';

/**
 * The Film step of the journal's photo flow: the photo with a look on it, the six looks, and how strong. Saving bakes the
 * look into a picture (see useBake) and hands it on with the look; the original stays untouched. "None" saves the plain photo.
 */
export function FilmSheet({ open, source, initial, onSave, onClose }: {
  open: boolean; source: string | null; initial?: FilmLook;
  onSave: (look: FilmLook, rendered: string | null) => Promise<void>; onClose: () => void;
}) {
  const { c } = useTheme();
  const [problem, setProblem] = useState<string>();
  const [look, setLook] = useState<FilmLook>(initial ?? { id: 'none', intensity: DEFAULT_INTENSITY });
  const [measured, setMeasured] = useState<{ source: string; width: number; height: number }>();
  const dims = measured && measured.source === source ? measured : undefined;
  // A sheet opened again starts from the photo's own look, not the one left from last time.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setLook(initial ?? { id: 'none', intensity: DEFAULT_INTENSITY }); setProblem(undefined); } }
  const [wide, setWide] = useState(0);
  const [busy, setBusy] = useState(false);
  const { ref, bake, ratio } = useBake(source);

  useEffect(() => {
    if (source) Image.getSize(source, (width, height) => setMeasured({ source, width, height }), () => setProblem('Could not open the photo.'));
  }, [source]);

  const target = dims ? bakeSize(dims.width, dims.height) : undefined;
  const fit = dims && wide ? Math.min(wide / dims.width, filmSheet.previewMaxHeight / dims.height) : 0;
  const previewW = dims ? dims.width * fit : 0;
  const previewH = dims ? dims.height * fit : 0;

  const save = async () => {
    if (!source || !target) return;
    setBusy(true); setProblem(undefined);
    try {
      const plain = look.id === 'none';
      await onSave(look, plain || Platform.OS === 'web' ? null : await bake(target));
    } catch {
      setProblem('Could not apply the look. Try again, or save the photo as it is.');
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} title="Film" onClose={onClose}>
      <View onLayout={(e) => setWide(e.nativeEvent.layout.width)} style={{ alignItems: 'center', gap: space[4] }}>
        {source && dims && target && fit ? (
          <View style={{ width: previewW, height: previewH, borderRadius: radius.control, overflow: 'hidden', backgroundColor: c.raised }}>
            <FilmImage uri={source} pixelWidth={target.width} pixelHeight={target.height} width={previewW} height={previewH} look={look} />
          </View>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
        {LOOKS.map((l) => <ChoiceChip key={l.id} label={l.label} selected={look.id === l.id} onPress={() => setLook({ id: l.id, intensity: look.intensity })} />)}
      </ScrollView>
      {look.id !== 'none' ? (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="label" tone="muted">Strength</Text>
            <Text variant="label" tone="muted">{Math.round(look.intensity * 100)}</Text>
          </View>
          <Slider label="Film strength" value={look.intensity} onChange={(intensity) => setLook({ ...look, intensity })} />
        </View>
      ) : null}
      {problem ? <Text variant="label" tone="stop">{problem}</Text> : null}
      <Button icon={Check} label={busy ? 'Saving' : 'Save photo'} disabled={busy || !target} onPress={() => void save()} />
      <Text variant="caption" tone="muted">Your original is kept on this phone, so you can change or remove the look later.</Text>
      {Platform.OS !== 'web' && source && dims && target && look.id !== 'none' ? (
        <View ref={ref} collapsable={false} pointerEvents="none" style={{ position: 'absolute', left: -target.width, top: 0, width: target.width / ratio, height: target.height / ratio }}>
          <FilmImage uri={source} pixelWidth={target.width} pixelHeight={target.height} width={target.width / ratio} height={target.height / ratio} look={look} />
        </View>
      ) : null}
    </Sheet>
  );
}

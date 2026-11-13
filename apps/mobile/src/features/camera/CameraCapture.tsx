import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, PanResponder, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { Skia, type SkCanvas, type SkImage } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import { SkiaCamera, type SkiaCameraRef } from 'react-native-vision-camera-skia';
import { useCameraDevice, useCameraPermission, usePhotoOutput, type Frame } from 'react-native-vision-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Grid3x3, Image as ImageIcon, RefreshCcw, X, Zap, ZapOff } from 'lucide-react-native';
import { buzz } from '@/lib/haptics';
import { DEFAULT_INTENSITY, LOOKS, lookById, stepLook, swipeStep, type FilmLook, type LookId } from '@/lib/filmLook';
import { uniformMap } from '@/lib/film/filmShader';
import { focusPoint } from '@/lib/film/focusPoint';
import { filmEffect } from '@/lib/film/skiaFilm';
import { useLatest } from '@/lib/useLatest';
import { fixed, radius, space } from '@/theme/tokens';
import { Icon } from '@/ui/Icon';
import { ScalePressable } from '@/ui/motion';
import { Slider } from '@/ui/Slider';
import { Text } from '@/ui/Text';
import { cameraTokens as k } from './CameraCapture.tokens';
import { LookSwatch } from './LookSwatch';
import { GridOverlay } from './GridOverlay';

const FLASH = ['off', 'auto', 'on'] as const;
const FLASH_LABEL = { off: 'Flash off', auto: 'Flash auto', on: 'Flash on' } as const;

/**
 * The journal's camera: a full-screen viewfinder where the film look is drawn by the GPU on every frame (the same shader
 * that bakes the saved photo, lib/film/filmShader), so what you frame is what you keep. Swipe the picture or tap a look
 * to change it; the shutter takes the full-resolution photo and hands it on with the look; the library is one tap away.
 */
export function CameraCapture({ open, onPhoto, onClose }: { open: boolean; onPhoto: (uri: string, look: FilmLook) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const device = useCameraDevice(facing);
  // JPEG, not the camera's default of its native format (HEIC on an iPhone): the rest of the app, Skia included, reads JPEG.
  const photoOutput = usePhotoOutput({ containerFormat: 'jpeg' });
  const cam = useRef<SkiaCameraRef>(null);
  const [flash, setFlash] = useState<(typeof FLASH)[number]>('off');
  const [grid, setGrid] = useState(false);
  const [zoom, setZoom] = useState<number>(k.zooms[0]);
  const [look, setLook] = useState<FilmLook>({ id: 'none', intensity: DEFAULT_INTENSITY });
  const [name, setName] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [shot, setShot] = useState(false);
  const [focusAt, setFocusAt] = useState<{ x: number; y: number }>();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const touch = useRef<{ x: number; y: number }>(undefined);
  const nameTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The look reaches the frame worklet through a shared value, so changing it never rebuilds the camera.
  const uniforms = useSharedValue<Record<string, number[]>>(uniformMap(look, 1, 1));
  useEffect(() => { uniforms.value = uniformMap(look, 1, 1); }, [look, uniforms]);

  // One closure for the camera's whole life: a new one (any re-render of this screen) would make the camera rebuild its frame
  // output while frames are in flight. The per-frame Skia objects are disposed so a long session does not grow without bound.
  const onFrame = useCallback((frame: Frame, render: (draw: (state: { frameTexture: SkImage; canvas: SkCanvas }) => void) => void) => {
    'worklet';
    render(({ frameTexture, canvas }) => {
      'worklet';
      if (!filmEffect) return;
      const landscape = frame.orientation === 'left' || frame.orientation === 'right';
      const w = landscape ? frame.height : frame.width;
      const h = landscape ? frame.width : frame.height;
      const builder = Skia.RuntimeShaderBuilder(filmEffect);
      const u = uniforms.value;
      for (const key in u) builder.setUniform(key, key === 'size' ? [w, h] : u[key]!);
      const filter = Skia.ImageFilter.MakeRuntimeShader(builder, null, null);
      const paint = Skia.Paint();
      paint.setImageFilter(filter);
      canvas.drawImage(frameTexture, 0, 0, paint);
      paint.dispose(); filter.dispose(); builder.dispose();
    });
    frame.dispose();
  }, [uniforms]);

  const choose = (id: LookId) => {
    if (id === look.id) return;
    buzz.tick();
    setLook({ id, intensity: look.intensity });
    setName(lookById(id).label);
    clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => setName(undefined), k.nameHoldMs);
  };
  const swipe = useLatest((dx: number, dy: number) => { const s = swipeStep(dx, dy, k.swipeDistance); if (s) choose(stepLook(look.id, s)); });
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, g) => swipe(g.dx, g.dy),
  }), [swipe]);

  const focus = async (tapX: number, tapY: number) => {
    // Kept inside the picture: a point outside it crashes the app natively (see focusPoint).
    const at = focusPoint(tapX, tapY, box);
    if (!at) return;
    setFocusAt(at);
    setTimeout(() => setFocusAt(undefined), k.focusHoldMs);
    try { await cam.current?.focusTo(at); } catch { /* no frame yet, or this camera cannot focus */ }
  };

  const take = async () => {
    if (busy) return;
    setBusy(true); setProblem(undefined);
    try {
      buzz.settle();
      setShot(true); setTimeout(() => setShot(false), k.flashMs);
      const p = await photoOutput.capturePhotoToFile({ flashMode: device?.hasFlash ? flash : 'off' }, {});
      onPhoto(`file://${p.filePath}`, look);
    } catch {
      setProblem('Could not take the photo. Try again.');
    } finally { setBusy(false); }
  };
  const fromLibrary = async () => {
    setProblem(undefined);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: false });
      if (!r.canceled && r.assets[0]) onPhoto(r.assets[0].uri, look);
    } catch { setProblem('Could not open your photos.'); }
  };

  const round = { width: k.control, height: k.control, borderRadius: radius.chip, alignItems: 'center' as const, justifyContent: 'center' as const };
  const live = open && hasPermission && !!device;
  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: fixed.shadow, paddingTop: insets.top + space[2], paddingBottom: insets.bottom + space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4] }}>
          <ScalePressable accessibilityRole="button" accessibilityLabel="Close camera" onPress={onClose} style={[round, { backgroundColor: k.chrome }]}><Icon icon={X} size={22} color={fixed.white} /></ScalePressable>
          <View style={{ flexDirection: 'row', gap: space[3] }}>
            {device?.hasFlash ? (
              <ScalePressable accessibilityRole="button" accessibilityLabel={FLASH_LABEL[flash]} onPress={() => setFlash(FLASH[(FLASH.indexOf(flash) + 1) % FLASH.length]!)} style={[round, { backgroundColor: flash === 'off' ? k.chrome : k.chromeActive }]}>
                <Icon icon={flash === 'off' ? ZapOff : Zap} size={20} color={fixed.white} />
              </ScalePressable>
            ) : null}
            <ScalePressable accessibilityRole="button" accessibilityState={{ selected: grid }} accessibilityLabel="Grid" onPress={() => setGrid(!grid)} style={[round, { backgroundColor: grid ? k.chromeActive : k.chrome }]}>
              <Icon icon={Grid3x3} size={20} color={fixed.white} />
            </ScalePressable>
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingVertical: space[3] }}>
          {hasPermission && device && filmEffect ? (
            <View
              {...pan.panHandlers}
              onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
              onTouchStart={(e) => { touch.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; }}
              onTouchEnd={(e) => { const t = touch.current; if (t && Math.abs(e.nativeEvent.pageX - t.x) < k.tapSlop && Math.abs(e.nativeEvent.pageY - t.y) < k.tapSlop) void focus(e.nativeEvent.locationX, e.nativeEvent.locationY); }}
              accessibilityHint="Swipe sideways to change the look. Tap to focus."
              style={{ width: '100%', aspectRatio: k.aspect, maxHeight: '100%', alignSelf: 'center', overflow: 'hidden', borderRadius: k.corner, backgroundColor: fixed.shadow }}
            >
              {live ? (
                <SkiaCamera
                  ref={cam}
                  style={StyleSheet.absoluteFill}
                  device={device}
                  isActive={open}
                  zoom={zoom}
                  outputs={[photoOutput]}
                  pixelFormat="yuv"
                  enablePreviewSizedOutputBuffers
                  onFrame={onFrame}
                />
              ) : null}
              {grid ? <GridOverlay /> : null}
              {focusAt ? <View pointerEvents="none" style={{ position: 'absolute', left: focusAt.x - k.focusRing / 2, top: focusAt.y - k.focusRing / 2, width: k.focusRing, height: k.focusRing, borderRadius: k.corner, borderWidth: k.gridLine * 2, borderColor: fixed.white }} /> : null}
              {name ? <View pointerEvents="none" style={{ position: 'absolute', top: space[4], alignSelf: 'center', paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.chip, backgroundColor: k.chrome }}><Text variant="labelMedium" style={{ color: fixed.white }}>{name}</Text></View> : null}
              {device && device.maxZoom >= k.zooms[1] ? (
                <View style={{ position: 'absolute', bottom: space[3], alignSelf: 'center', flexDirection: 'row', gap: space[2] }}>
                  {k.zooms.map((z) => (
                    <Pressable key={z} accessibilityRole="button" accessibilityLabel={`${z} times zoom`} onPress={() => { buzz.tick(); setZoom(z); }} style={{ minWidth: k.control * 0.8, height: k.control * 0.8, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center', backgroundColor: zoom === z ? k.chromeActive : k.chrome }}>
                      <Text variant="caption" style={{ color: fixed.white }}>{z}×</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {shot ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fixed.white, opacity: k.dim }]} /> : null}
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: space[4], paddingHorizontal: space[6] }}>
              <Text variant="title" style={{ color: fixed.white, textAlign: 'center' }}>{hasPermission ? 'No camera found' : 'Camera is off'}</Text>
              <Text style={{ color: fixed.white, opacity: k.dim, textAlign: 'center' }}>{hasPermission ? 'You can still pick a photo from your library.' : canRequestPermission ? 'Allow the camera to take photos with film looks, or pick one from your library.' : 'Allow the camera for Myto Moto in your phone settings, or pick a photo from your library.'}</Text>
              {!hasPermission ? (
                <Pressable accessibilityRole="button" onPress={() => void (canRequestPermission ? requestPermission() : Linking.openSettings())} style={{ paddingHorizontal: space[6], height: k.control, borderRadius: radius.chip, backgroundColor: fixed.white, alignItems: 'center', justifyContent: 'center' }}>
                  <Text variant="labelMedium" style={{ color: fixed.ink }}>{canRequestPermission ? 'Allow camera' : 'Open settings'}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>

        {problem ? <Text variant="label" style={{ color: fixed.white, textAlign: 'center', marginBottom: space[2] }}>{problem}</Text> : null}
        {look.id !== 'none' ? (
          <View style={{ paddingHorizontal: space[8], marginBottom: space[1] }}>
            <Slider label="Film strength" value={look.intensity} onChange={(intensity) => setLook({ ...look, intensity })} />
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space[3], paddingHorizontal: space[4], paddingVertical: space[2] }}>
          {LOOKS.map((l) => {
            const on = l.id === look.id;
            return (
              <Pressable key={l.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={l.label} onPress={() => choose(l.id)} style={{ alignItems: 'center', gap: space[1], opacity: on ? 1 : k.dim }}>
                <View style={{ width: k.swatch, height: k.swatch, borderRadius: radius.chip, overflow: 'hidden', borderWidth: k.swatchRing, borderColor: on ? fixed.white : 'transparent', backgroundColor: k.chrome }}>
                  <LookSwatch id={l.id} size={k.swatch - k.swatchRing * 2} />
                </View>
                <Text variant="caption" style={{ color: fixed.white }}>{l.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[8], marginTop: space[2] }}>
          <ScalePressable accessibilityRole="button" accessibilityLabel="Choose from your photos" onPress={() => void fromLibrary()} style={{ width: k.thumb, height: k.thumb, borderRadius: radius.control, backgroundColor: k.chrome, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={ImageIcon} size={22} color={fixed.white} />
          </ScalePressable>
          <ScalePressable scaleTo={0.92} accessibilityRole="button" accessibilityLabel="Take photo" disabled={!live || busy} onPress={() => void take()} style={{ width: k.shutter, height: k.shutter, borderRadius: radius.chip, borderWidth: k.shutterRing, borderColor: fixed.white, alignItems: 'center', justifyContent: 'center', opacity: live ? 1 : k.dim }}>
            <View style={{ width: k.shutterInner, height: k.shutterInner, borderRadius: radius.chip, backgroundColor: fixed.white }} />
          </ScalePressable>
          <ScalePressable accessibilityRole="button" accessibilityLabel="Flip camera" disabled={!hasPermission} onPress={() => { buzz.tick(); setFacing(facing === 'back' ? 'front' : 'back'); setZoom(k.zooms[0]); }} style={{ width: k.thumb, height: k.thumb, borderRadius: radius.chip, backgroundColor: k.chrome, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={RefreshCcw} size={22} color={fixed.white} />
          </ScalePressable>
        </View>
      </View>
    </Modal>
  );
}

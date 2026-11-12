import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { buildHomeWorld, needsQuickReading } from '@/homeWorld';
import { isoOf } from '@/lib/nudge/time';
import { sunsetClock } from '@/lib/daylight';
import { homeCopy } from '@/lib/homeRoute/copy';
import { decideHomeOffer } from '@/lib/homeRoute/offer';
import type { HomeOffer } from '@/lib/homeRoute/types';
import { useHomeOffer } from '@/store/homeOffer';
import { useLocation } from '@/store/location';
import { usePlaces, type SavedPlace } from '@/store/places';
import { useRecorder } from '@/store/recorder';
import { quickPosition, useQuickPos } from './quickPosition';
import { loadSunset } from './sunsetCache';

/**
 * The "Ride home" offer for the Home screen. It never starts a GPS watch and has no timer: it re-decides when the screen
 * gains focus, when the app returns to the foreground, and when the position, Home or the dismissals change. The position is
 * the recorder's latest point during a ride, else a fresh fix someone else already holds, else one low-accuracy reading
 * (at most every 5 minutes).
 */
export function useHomeOfferNow(): { offer: HomeOffer | null; copy?: { title: string; body: string }; home?: SavedPlace } {
  const home = usePlaces((s) => s.home);
  const dismissals = useHomeOffer((s) => s.dismissals);
  const fixAt = useLocation((s) => s.fixAt);
  const quickAt = useQuickPos((s) => s.at);
  const recStatus = useRecorder((s) => s.status);
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const refresh = useCallback(() => { const now = Date.now(); if (needsQuickReading(now)) void quickPosition(now).then((p) => { if (p) bump(); }); bump(); }, [bump]);
  useFocusEffect(useCallback(() => { if (usePlaces.getState().home) refresh(); }, [refresh]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active' && usePlaces.getState().home) refresh(); });
    return () => sub.remove();
  }, [refresh]);

  const world = useMemo(() => buildHomeWorld(Date.now()), [tick, home, dismissals, fixAt, quickAt, recStatus]); // eslint-disable-line react-hooks/exhaustive-deps
  const { pos, now } = world;
  useEffect(() => {
    if (home && pos) void loadSunset(pos.lat, pos.lng, now).then((fresh) => { if (fresh) bump(); });
  }, [home, pos?.lat, pos?.lng, isoOf(now)]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => {
    const offer = decideHomeOffer(world);
    return offer ? { offer, home, copy: homeCopy(offer, { ...(world.sunsetMs !== undefined ? { sunsetClock: sunsetClock(world.sunsetMs) } : {}) }) } : { offer: null, home };
  }, [world, home]);
}

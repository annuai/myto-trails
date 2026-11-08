import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Accelerometer, Magnetometer } from 'expo-sensors';
import { easeAngle, sensorHeading, type Vec3 } from './compass';

const RATE_MS = 100;
/** How much of each new sensor reading is taken in: low, so the needle is steady on a bumpy bike. */
const SENSOR_EASE = 0.12;
const HEADING_EASE = 0.3;
/** A change smaller than this (in degrees) is not drawn. */
const MIN_STEP = 1.5;

const mix = (old: Vec3 | undefined, next: Vec3): Vec3 => (old ? { x: old.x + (next.x - old.x) * SENSOR_EASE, y: old.y + (next.y - old.y) * SENSOR_EASE, z: old.z + (next.z - old.z) * SENSOR_EASE } : next);

/** Steadies a stream of headings and passes on only the ones that moved. */
function steady(emit: (deg: number) => void): (deg: number) => void {
  let shown: number | undefined;
  return (deg) => {
    shown = shown === undefined ? deg : easeAngle(shown, deg, HEADING_EASE);
    emit(shown);
  };
}

/** Android: the phone's accelerometer and magnetometer, worked into the direction it points (see sensorHeading). */
function startRawSensors(onHeading: (deg: number) => void): () => void {
  let accel: Vec3 | undefined, mag: Vec3 | undefined;
  const out = steady(onHeading);
  Accelerometer.setUpdateInterval(RATE_MS);
  Magnetometer.setUpdateInterval(RATE_MS);
  const a = Accelerometer.addListener((v) => { accel = mix(accel, v); });
  const m = Magnetometer.addListener((v) => {
    mag = mix(mag, v);
    if (!accel) return;
    const deg = sensorHeading(accel, mag);
    if (deg !== undefined) out(deg);
  });
  return () => { a.remove(); m.remove(); };
}

/** iPhone: the system's own compass, which is calibrated and corrects for how the phone is held. It needs location access, which a ride already has. */
function startSystemCompass(onHeading: (deg: number) => void): () => void {
  let sub: { remove: () => void } | undefined;
  let stopped = false;
  const out = steady(onHeading);
  void Location.watchHeadingAsync((h) => out(h.trueHeading >= 0 ? h.trueHeading : h.magHeading))
    .then((s) => { if (stopped) s.remove(); else sub = s; })
    .catch(() => undefined);
  return () => { stopped = true; sub?.remove(); };
}

/**
 * The direction the phone points, in degrees clockwise from north, read from its compass sensor; undefined where there is none (a browser) or
 * the sensor has not answered yet. It listens only while the app is on screen.
 */
export function useSensorHeading(): number | undefined {
  const [heading, setHeading] = useState<number | undefined>(undefined);
  const [onScreen, setOnScreen] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setOnScreen(s === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!onScreen || Platform.OS === 'web') return;
    let last: number | undefined;
    const on = (deg: number) => {
      if (last !== undefined && Math.abs(((deg - last + 540) % 360) - 180) < MIN_STEP) return;
      last = deg;
      setHeading(deg);
    };
    try { return Platform.OS === 'ios' ? startSystemCompass(on) : startRawSensors(on); } catch { return undefined; }
  }, [onScreen]);
  return heading;
}

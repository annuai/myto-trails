// The background recording task must be defined as soon as the JS bundle loads. When the phone wakes a killed app
// for a location update, no screen is rendered, so defining it from a screen file (app/_layout.tsx) would be too late.
import './src/lib/backgroundLocation';
import 'expo-router/entry';

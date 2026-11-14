// Adds a debug id to each bundle so Sentry can turn a release crash's stack back into readable source (docs/todo.md).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);
// Glyph files for the offline map (assets/offline-map/fonts) are bundled as assets.
config.resolver.assetExts.push('pbf');

module.exports = config;

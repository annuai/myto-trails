// Adds a debug id to each bundle so Sentry can turn a release crash's stack back into readable source (docs/todo.md).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);

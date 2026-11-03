// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // dist is the web export; public/vendor holds third-party files copied in by `npm run assets:maplibre` (and git-ignored).
    ignores: ['dist/*', 'public/vendor/**', '.expo/**'],
  },
]);

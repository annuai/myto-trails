import path from 'node:path';
import { Config } from '@remotion/cli/config';
// Remotion's own webpack: a second copy (top-level node_modules/webpack) breaks the build with "parser.getLocation is not a function".
import { webpack } from '@remotion/bundler';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// The video draws the app's real components (apps/mobile/src/ui) through react-native-web, so the screens match the app exactly.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    extensions: ['.web.tsx', '.web.ts', '.web.js', ...(config.resolve?.extensions ?? [])],
    alias: {
      ...(config.resolve?.alias ?? {}),
      'react-native$': 'react-native-web',
      '@': path.resolve('../apps/mobile/src'),
      '@react-native/assets-registry/registry': path.resolve('src/shims/assets-registry.ts'),
      'expo-linear-gradient': path.resolve('src/shims/expo-linear-gradient.tsx'),
      react: path.resolve('node_modules/react'),
      'react-dom': path.resolve('node_modules/react-dom'),
    },
  },
  module: {
    ...config.module,
    // Some app dependencies ship ES modules that import without file extensions.
    rules: [...(config.module?.rules ?? []), { test: /\.m?js$/, resolve: { fullySpecified: false } }],
  },
  plugins: [...(config.plugins ?? []), new webpack.DefinePlugin({ __DEV__: JSON.stringify(false) })],
}));

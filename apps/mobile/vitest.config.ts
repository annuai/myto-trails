// Unit tests of the phone app. `@` points at src, as in the app.

import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
});

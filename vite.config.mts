import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    extensions: [
      '.web.mjs',
      '.mjs',
      '.web.js',
      '.js',
      '.web.tsx',
      '.tsx',
      '.web.ts',
      '.ts',
      '.json',
    ],
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      {
        find: /^react-native-svg$/,
        replacement: fileURLToPath(
          new URL('./src/components/svg.web.tsx', import.meta.url),
        ),
      },
    ],
  },
  define: { __DEV__: false },
  server: { host: '127.0.0.1', port: 5173 },
  build: { outDir: 'web-preview' },
});

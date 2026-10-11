import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Render sets RENDER_GIT_COMMIT during builds; local builds get a timestamp.
const buildId = process.env.RENDER_GIT_COMMIT?.slice(0, 12) ?? `local-${Date.now().toString(36)}`;

export default defineConfig({
  root: 'src/client',
  publicDir: 'public',
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});

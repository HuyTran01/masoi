import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'three',
        'three/addons/environments/RoomEnvironment.js',
        'lucide-react',
        'canvas-confetti',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
      ],
    },
    build: {
      // three.js core alone is ~574 kB minified (~144 kB gzip); all app & firebase chunks stay < 500 kB
      chunkSizeWarningLimit: 600,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'three-vendor', test: /node_modules[\\/]three[\\/]/ },
              { name: 'firebase-firestore', test: /node_modules[\\/]@?firebase[\\/]firestore/ },
              { name: 'firebase-core', test: /node_modules[\\/](?:firebase|@firebase)[\\/]/ },
              { name: 'react-vendor', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/ },
              { name: 'icons-vendor', test: /node_modules[\\/]lucide-react[\\/]/ },
              { name: 'village-3d', test: /src[\\/]components[\\/]WerewolfVillage3D/ },
            ],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

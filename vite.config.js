import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('core_atlas_dataset.json')) {
            return 'core-dataset';
          }
          if (id.includes('historical_bilateral_2022_2026.json')) {
            return 'hist-bilateral-recent';
          }
          if (id.includes('historical_bilateral_2018_2021.json')) {
            return 'hist-bilateral-past';
          }
          if (id.includes('cbs_risk.json')) {
            return 'cbs-risk';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'vendor-echarts';
          }
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1200
  }
});

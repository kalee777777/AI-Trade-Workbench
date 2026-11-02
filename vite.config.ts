import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发模式：API 服务跑在 5189（server/index.js），Vite 代理 /api 过去
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5189' },
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  root: './', // プロジェクトのルート
  server: {
    open: true, // ブラウザで自動オープン
    port: 3000, // 任意のポート番号
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext'
  },
});

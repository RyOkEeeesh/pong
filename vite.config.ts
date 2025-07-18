import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

export default defineConfig({
  base: '/pong/',
  root: './', // プロジェクトのルート
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    open: true, // ブラウザで自動オープン
    port: 3000, // 任意のポート番号
  },
  build: {
    outDir: 'dist', // ビルド出力先
    emptyOutDir: true, // ビルド前にdistをクリーン
    target: 'esnext', // モダンブラウザ向け最適化
    assetsInlineLimit: 0, // すべてのアセットを個別出力（Three.js向け）
    sourcemap: false, // デバッグ不要ならfalse
    minify: 'terser', // 圧縮率が高い minify オプション
    rollupOptions: {
      output: {
        manualChunks: undefined, // 単一バンドル（必要なら分割可）
      },
    },
  },
});

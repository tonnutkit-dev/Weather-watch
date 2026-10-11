import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./exploration', import.meta.url));
export default defineConfig({
    root, base: './', plugins: [react()],
    server: { host: '127.0.0.1', port: 4174 },
    preview: { host: '127.0.0.1', port: 4174 },
    build: { outDir: 'dist', chunkSizeWarningLimit: 1200, rollupOptions: {
            input: { review: `${root}/index.html`, prototype: `${root}/prototype.html` },
        } },
});

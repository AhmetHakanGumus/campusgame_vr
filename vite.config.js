import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    plugins: [basicSsl()],
    build: {
        outDir: 'dist',
        emptyOutDir: true
    },
    server: {
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true
            }
        }
    }
});

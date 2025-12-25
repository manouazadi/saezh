
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        target: 'esnext',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            output: {
                entryFileNames: 'main.js',
                chunkFileNames: '[name].js',
                assetFileNames: (assetInfo) => {
                    // Rename the CSS corresponding to the entry point
                    if (assetInfo.name === 'main.css') {
                        return 'style.css';
                    }
                    return '[name].[ext]';
                }
            }
        }
    }
});

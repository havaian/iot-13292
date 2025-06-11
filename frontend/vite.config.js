import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    plugins: [vue()],

    server: {
        host: '0.0.0.0',
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://backend:8000',
                changeOrigin: true,
                secure: false
            },
            '/socket.io': {
                target: 'http://backend:8000',
                changeOrigin: true,
                ws: true
            }
        }
    },

    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@components': resolve(__dirname, 'src/components'),
            '@views': resolve(__dirname, 'src/views'),
            '@assets': resolve(__dirname, 'src/assets'),
            '@utils': resolve(__dirname, 'src/utils'),
            '@stores': resolve(__dirname, 'src/stores'),
            '@services': resolve(__dirname, 'src/services')
        }
    },

    build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['vue', 'vue-router', 'pinia'],
                    charts: ['chart.js', 'vue-chartjs'],
                    ui: ['@headlessui/vue', '@heroicons/vue']
                }
            }
        }
    },

    define: {
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false
    }
})
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            devOptions: { enabled: true },
            manifest: {
                name: 'SEVA Operations',
                short_name: 'SEVA',
                theme_color: '#00E5A0',
                background_color: '#04080D',
                display: 'standalone',
                icons: [
                    { src: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png', sizes: '192x192', type: 'image/png' },
                    { src: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png', sizes: '512x512', type: 'image/png' }
                ]
            }
        })
    ],
    server: {
        port: 5173,
    },
});

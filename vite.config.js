import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        fuel: resolve(__dirname, 'pages/fuel.html'),
        store: resolve(__dirname, 'pages/store.html'),
        food: resolve(__dirname, 'pages/food.html'),
        location: resolve(__dirname, 'pages/location.html')
      }
    }
  }
});

// @ts-check
import { defineConfig } from 'astro/config';

// Build as static - our custom worker will handle serving
export default defineConfig({
  output: 'static',
  distDir: './dist',
});

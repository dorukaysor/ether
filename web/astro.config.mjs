// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

// https://astro.build/config
// NOTE: Astro 5 removed the `hybrid` output mode.
// `output: 'server'` is the equivalent — all routes are SSR by default.
// Static pages can opt-in with `export const prerender = true`.
export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
});

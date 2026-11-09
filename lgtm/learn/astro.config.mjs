// Astro builds a fully static site. The small Node server in server/ serves it,
// stores progress in SQLite and adds the security headers (see docs/adr/s1-stack.md).
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { BASE_PLACEHOLDER, contentRoot, sampleMode } from './src/lib/build-env.ts';

const isDev = process.argv.includes('dev');
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // The real prefix is only known when the server starts (BASE_PATH), so the build
  // uses a placeholder that server/site.mjs replaces in every text file it serves.
  base: isDev ? '/' : BASE_PLACEHOLDER,
  trailingSlash: 'always',
  outDir: process.env.LGTM_OUT || 'dist',
  output: 'static',
  compressHTML: true,
  build: {
    // Keep styles in files: the content security policy allows no inline styles.
    inlineStylesheets: 'never',
    format: 'directory',
  },
  integrations: [mdx(), react()],
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss(), devApi()],
    define: {
      'import.meta.env.LGTM_SAMPLE': JSON.stringify(sampleMode()),
    },
    build: {
      // No inline data: URLs for scripts; the CSP only allows scripts from the site itself.
      assetsInlineLimit: 0,
    },
    server: {
      fs: { allow: [root, contentRoot()] },
    },
  },
});

// In `astro dev` the progress API runs inside Vite's server, so the sample site
// can be used without the production server. It stores progress in memory.
function devApi() {
  return {
    name: 'lgtm-dev-api',
    async configureServer(server) {
      const { createApi } = await import('./server/api.mjs');
      const { openStore } = await import('./server/store.mjs');
      const api = createApi(openStore(':memory:'));
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0];
        if (path === '/api/state') return api(req, res);
        next();
      });
    },
  };
}

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Lets the built site open by double-clicking index.html. Browsers refuse to load module
 * scripts and stylesheets from file:// pages as separate files, so the build puts the JS and
 * CSS inside index.html. It also drops the dev-only redirect from the root index.html.
 */
function openFromDisk(): Plugin {
  const escapeScript = (code: string) => code.replace(/<\/script/gi, '<\\/script');
  return {
    name: 'open-from-disk',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: (html) => html.replace(/\s*<script id="file-redirect">[\s\S]*?<\/script>/, ''),
    generateBundle(_, bundle) {
      const page = bundle['index.html'];
      if (!page || page.type !== 'asset') return;
      let html = String(page.source);
      for (const [name, file] of Object.entries(bundle)) {
        const tag = new RegExp(`<[^>]+(?:src|href)="\\./${name.replace(/[.]/g, '\\.')}"[^>]*>(?:</script>)?`);
        if (file.type === 'chunk' && file.isEntry) {
          html = html.replace(tag, () => `<script type="module">${escapeScript(file.code)}</script>`);
          delete bundle[name];
        } else if (file.type === 'asset' && name.endsWith('.css')) {
          html = html.replace(tag, () => `<style>${String(file.source)}</style>`);
          delete bundle[name];
        }
      }
      page.source = html;
    },
  };
}

export default defineConfig(({ command }) => ({
  // Relative paths in builds, so the site works under any sub-path (GitHub Pages serves it at
  // /Roots/) and straight from disk.
  base: command === 'build' ? './' : '/',
  plugins: [react(), openFromDisk()],
  server: { port: 5173 },
}));

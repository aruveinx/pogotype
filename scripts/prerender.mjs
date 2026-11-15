import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({
  root: fileURLToPath(new URL('../', import.meta.url)),
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: 'custom'
});

try {
  const { default: i18n } = await server.ssrLoadModule('/src/i18n.jsx');
  await i18n.changeLanguage('en');
  const { default: App } = await server.ssrLoadModule('/src/App.jsx');
  const markup = renderToString(createElement(App));
  const output = new URL('../dist/index.html', import.meta.url);
  const html = await readFile(output, 'utf8');
  const placeholder = '<!--app-html-->';
  if (!html.includes(placeholder)) throw new Error('Missing app prerender placeholder in production HTML');
  await writeFile(output, html.replace(placeholder, markup));
  console.log('Prerendered the English app into dist/index.html');
} finally {
  await server.close();
}

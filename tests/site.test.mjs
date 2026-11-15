import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const dist = new URL('../dist/', import.meta.url);
const read = (path) => readFileSync(new URL(path, dist), 'utf8');
const html = read('index.html');
const base = '/pogotype/';
const site = 'https://aruveinx.github.io/pogotype/';
const meta = (name) => {
  const matches = [...html.matchAll(/<meta\s+([^>]+)>/g)].filter(([, attributes]) =>
    attributes.includes(`name="${name}"`) || attributes.includes(`property="${name}"`));
  assert.equal(matches.length, 1, `Expected one ${name} metadata element`);
  return matches[0][1].match(/content="([^"]*)"/)?.[1];
};

test('production HTML assets resolve inside the GitHub Pages project', () => {
  assert.match(html, /<title>Pokémon GO Type Chart &amp; Counters \| Pogotype<\/title>/);
  assert.ok(!html.includes('%BASE_URL%'));
  assert.ok(!html.includes('/src/'));
  const paths = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(([, path]) => path);
  assert.ok(paths.length >= 4);
  for (const path of paths) {
    if (path === site) continue;
    assert.ok(path.startsWith(base), `Asset outside Pages base: ${path}`);
    assert.ok(existsSync(new URL(path.slice(base.length), dist)), `Missing asset: ${path}`);
  }
});

test('web app manifest and icons resolve relative to the Pages project', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const manifestURL = new URL(`${base}manifest.json`, 'https://aruveinx.github.io');
  assert.equal(new URL(manifest.start_url, manifestURL).pathname, base);
  assert.equal(new URL(manifest.scope, manifestURL).pathname, base);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.description, meta('description'));
  assert.deepEqual(manifest.icons.map(({ sizes }) => sizes), ['192x192', '512x512']);
  for (const icon of manifest.icons) {
    const path = new URL(icon.src, manifestURL).pathname;
    assert.ok(path.startsWith(base));
    assert.ok(existsSync(new URL(path.slice(base.length), dist)));
  }
});

test('all type icons and both background images are deployed with correct URLs', () => {
  const chart = JSON.parse(readFileSync(new URL('../src/typeChart.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(chart).length, 18);
  for (const type of Object.keys(chart)) {
    assert.ok(existsSync(new URL(`assets/icons/${type.toLowerCase()}.svg`, dist)));
  }
  const css = readdirSync(new URL('assets/', dist)).filter((name) => name.endsWith('.css'))
    .map((name) => read(`assets/${name}`)).join('\n');
  const urls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(([, url]) => url);
  assert.equal(urls.length, 2);
  for (const url of urls) {
    assert.ok(url.startsWith(base), `Background outside Pages base: ${url}`);
    assert.ok(existsSync(new URL(url.slice(base.length), dist)));
  }
  assert.match(css, /prefers-color-scheme:\s*dark/);
});

test('canonical, search metadata and social cards describe the deployed application', () => {
  assert.match(html, /<html lang="en">/);
  assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1);
  assert.ok(html.includes(`rel="canonical" href="${site}"`));
  const description = meta('description');
  assert.ok(description.length >= 100 && description.length <= 160);
  assert.equal(meta('robots'), 'index,follow');
  assert.equal(meta('og:description'), description);
  assert.equal(meta('twitter:description'), description);
  assert.equal(meta('og:url'), site);
  assert.equal(meta('og:type'), 'website');
  assert.equal(meta('og:site_name'), 'Pogotype');
  assert.equal(meta('og:locale'), 'en_US');
  assert.equal(meta('og:title'), meta('twitter:title'));
  assert.equal(meta('twitter:card'), 'summary');
  assert.equal(meta('og:image'), `${site}assets/icons/pogotype-logo-512x512.png`);
  assert.equal(meta('twitter:image'), meta('og:image'));
  assert.equal(meta('og:image:alt'), meta('twitter:image:alt'));
  assert.ok(meta('og:image:alt').length > 20);
  const png = readFileSync(new URL('assets/icons/pogotype-logo-512x512.png', dist));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), Number(meta('og:image:width')));
  assert.equal(png.readUInt32BE(20), Number(meta('og:image:height')));
});

test('structured data describes the real website, page and free application without invented ratings', () => {
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  const schema = JSON.parse(scripts[0][1]);
  assert.equal(schema['@context'], 'https://schema.org');
  assert.deepEqual(schema['@graph'].map((entity) => entity['@type']), ['WebSite', 'WebPage', 'WebApplication']);
  for (const entity of schema['@graph']) {
    assert.equal(entity.url, site);
    assert.ok(entity['@id'].startsWith(site));
    assert.equal(entity.aggregateRating, undefined);
  }
  const [website, webpage, app] = schema['@graph'];
  assert.equal(webpage.isPartOf['@id'], website['@id']);
  assert.equal(webpage.mainEntity['@id'], app['@id']);
  assert.equal(webpage.description, meta('description'));
  assert.equal(app.description, meta('description'));
  assert.equal(app.applicationCategory, 'GameApplication');
  assert.equal(app.isAccessibleForFree, true);
  assert.deepEqual(app.inLanguage, ['en', 'fr', 'de', 'it', 'es', 'pt-BR']);
});

test('initial HTML prerenders the actual tools, descriptions and all type choices', () => {
  const en = JSON.parse(readFileSync(new URL('../src/locales/en.json', import.meta.url), 'utf8')).translation;
  const chart = JSON.parse(readFileSync(new URL('../src/typeChart.json', import.meta.url), 'utf8'));
  const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
  assert.ok(!html.includes('<!--app-html-->'));
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.equal([...html.matchAll(/<main\b/g)].length, 1);
  assert.match(html, /<main id="main-content"/);
  for (const key of ['title', 'tool1_title', 'tool1_description', 'tool2_title', 'tool2_description']) {
    assert.ok(html.includes(escape(en[key])), `Missing prerendered content: ${key}`);
  }
  for (const type of Object.keys(chart)) {
    assert.equal([...html.matchAll(new RegExp(`<option value="${type}"`, 'g'))].length, 3);
  }
  assert.match(html, /aria-labelledby="attack-tool-title"/);
  assert.match(html, /aria-labelledby="defense-tool-title"/);
  assert.match(html, /<noscript>[\s\S]*Enable JavaScript/);
  assert.ok(!html.includes('pokemon-go-api.github.io'));
});

test('sitemap contains exactly the canonical page and is discoverable from HTML', () => {
  const sitemap = read('sitemap.xml');
  assert.match(sitemap, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, location]) => location);
  assert.deepEqual(locations, [site]);
  assert.match(html, /rel="sitemap" type="application\/xml" href="\/pogotype\/sitemap.xml"/);
});

# Pokémon GO Type Effectiveness Tool

A React tool for choosing attack and defending types in Pokémon GO.

## Features

- Single- and dual-type attack recommendations, with damage multipliers and types to avoid.
- Defense recommendations against a selected attack type.
- Localized Pokémon search, including mega evolutions and regional forms, with regular and shiny images.
- Localized Pokémon GO search strings and clipboard copying.
- English, French, German, Italian and Spanish language selection, with browser language detection and persistent preferences. Brazilian Portuguese translations are also retained.
- Responsive styling, dark-mode support and a web app manifest.
- Prerendered HTML, search/social metadata, structured data and a sitemap.

## Development

Use Node.js 24 (see `.nvmrc`).

```bash
git clone https://github.com/aruveinx/pogotype.git
cd pogotype
nvm use
npm ci
npm start
```

Open the local URL printed by Vite, under `/pogotype/`.

```bash
npm test           # Application regression tests
npm run build      # Production output and prerendered HTML in dist/
npm run test:site  # Validate SEO, prerendered content, assets and manifest
npm run preview    # Preview the production build
```

Pokémon search retrieves data from the public [Pokémon GO API](https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json) and needs network access. Manual type selection works independently of that API.

### Maintenance improvements

Pokémon search indexes localized names once per dataset/language, derives results without an extra state-update render, and cancels requests when the component unmounts. Selection tracking no longer depends on a timer, and debug logging has been removed. Attack and defense recommendations are memoized independently, with their original multipliers, sorting and search-string order preserved.

Form labels are associated with their controls. Clipboard failures are explicitly logged, including when the Clipboard API is unavailable.

## Search engine optimization

The production build prerenders the real app's initial English UI using React and Vite, so crawlers receive its heading, tool descriptions, type choices and accessible controls without executing JavaScript. React then mounts the interactive app normally, including the user's saved language preference. There is no separate copy of the UI to maintain, and prerendering does not fetch the Pokémon API.

The page includes a canonical URL, Open Graph and Twitter summary cards using the existing logo, and JSON-LD describing the website, page and free application. The document language follows the active translation. Language preferences are not separate URLs, so no misleading `hreflang` links are emitted.

After deployment, submit `https://aruveinx.github.io/pogotype/sitemap.xml` in Google Search Console. GitHub Pages hosts this project under a subpath; a project-local `robots.txt` would not control crawling of the domain. Domain-level crawling rules belong at `https://aruveinx.github.io/robots.txt`.

If the deployment URL changes, update the canonical/social/structured-data URLs in `index.html`, `public/sitemap.xml`, the package homepage and the production SEO tests.

## GitHub Pages

The site is deployed to **https://aruveinx.github.io/pogotype/**.

In the repository's **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.

The [deployment workflow](.github/workflows/deploy.yml) follows the same build/artifact/deploy model as `swordxstaff`:

1. Pushes and pull requests targeting `main` install locked dependencies with `npm ci`, run regression tests, build, and validate production output.
2. Pushes to `main` (or manual runs on `main`) configure Pages and upload `dist/` as a Pages artifact.
3. A separate deployment job publishes the artifact using the `github-pages` environment and GitHub's built-in token.

No `PERSONAL_TOKEN`, external repository, `gh-pages` branch, or local deploy script is needed. Pull requests validate the app without deploying.

Vite's base is `/pogotype/`; HTML and application assets use that base, and manifest paths are relative to it.

The original app, translations, type chart and artwork were migrated from `pogotypeold`. Its directory and Git history were left untouched; this repository keeps its own Git identity.

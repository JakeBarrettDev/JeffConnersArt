# Jeff Conners Art Portfolio

Minimalist, art-first portfolio website built with Astro and deployed on Cloudflare Pages.

## Highlights
- Cyan/orange visual motif with large hero artwork
- Responsive gallery with category filtering and lightbox view
- Static-first architecture for speed and low hosting overhead
- Automated build and deploy via GitHub Actions + Cloudflare Pages

## Tech
- Astro
- TypeScript
- Cloudflare Pages
- GitHub Actions

## Local development
```bash
npm install
npm run art:build
npm run dev
```

## Production deployment
Pushes to `main` trigger the deploy workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Operations
Project runbook is available in [`docs/runbook.md`](docs/runbook.md).

## Maintainer note
Contributor-facing documentation is public. Maintainer-only workflow notes are intentionally kept out of version control.
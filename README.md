# Jeff Conners Art Portfolio

Astro + Cloudflare Pages portfolio site optimized for high-resolution artwork and low ongoing hosting cost.

## Stack
- Astro (static output)
- Cloudflare Pages (deployment)
- GitHub Actions (CI/CD)
- `sharp` (image variant generation)

## Local development
```bash
npm install
npm run art:build
npm run dev
```

## Add Artwork in 5 Minutes
1. Create metadata template and folder:
```bash
npm run art:new -- --title "Sunset Geometry" --slug "sunset-geometry"
```
2. Drop original image into:
```text
art/originals/sunset-geometry/main.jpg
```
3. Generate optimized variants + content index:
```bash
npm run art:build
```
4. Validate and publish:
```bash
npm run build
git add .
git commit -m "Add sunset-geometry artwork"
git push origin main
```

## Artwork metadata schema
Each file in `art/metadata/*.json` should include:
- `title` (string)
- `slug` (kebab-case, unique)
- `year` (4-digit number)
- `medium` (string)
- `dimensions` (string)
- `description` (string)
- `alt` (string)
- `featured` (boolean)
- `categories` (string[])
- `sourceImage` (string, e.g. `main.jpg`)
- `dominantColor` (optional string)

## Commands
- `npm run dev`: start local dev server
- `npm run art:new -- --title "..." --slug "..."`: scaffold artwork metadata
- `npm run art:build`: validate metadata + generate image variants + compile `src/content/artworks.json`
- `npm run build`: run `art:build` then build Astro
- `npm run check`: Astro type checks

## Deploy to Cloudflare Pages
1. Create a Cloudflare Pages project connected to this GitHub repo.
2. Add GitHub secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PAGES_PROJECT`
3. Push to `main` to trigger `.github/workflows/deploy.yml`.
4. In Cloudflare Pages, add custom domain (friend domain), then set canonical redirect (www <-> apex).

## Where to look when something breaks
Use the runbook at `docs/runbook.md`.

## Notes
- `public/art/` is generated output; source of truth is `art/metadata/` + `art/originals/`.
- This project is static-first by design to keep runtime costs near zero for early traffic.


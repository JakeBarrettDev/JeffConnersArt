# Operations Runbook

## Quick triage order
1. Check latest GitHub Actions run (`Deploy to Cloudflare Pages`).
2. If CI failed, fix build issue first.
3. If CI passed but site is down, inspect Cloudflare Pages deployment + domain DNS records.
4. If site loads but images are missing, run `npm run art:build` locally and verify `public/art/*` output.

## Common failures

### `art:build` fails with missing source image
- Cause: `sourceImage` in `art/metadata/<slug>.json` does not match the file in `art/originals/<slug>/`.
- Fix: rename the source file or metadata value so they match exactly.

### `art:build` fails with duplicate slug
- Cause: two metadata files share the same slug.
- Fix: update one slug and re-run `npm run art:build`.

### Build passes locally but fails in CI
- Cause: uncommitted metadata/image changes or case-sensitive filename mismatch.
- Fix: run `npm run art:build`, commit all metadata/source changes, then push.

### Custom domain shows SSL/DNS errors
- Cause: incomplete Cloudflare DNS records or pending certificate issuance.
- Fix: verify apex + www records in Cloudflare DNS and wait for certificate status to become active.

## Monthly maintenance checklist
- Run `npm outdated` and patch dependencies.
- Confirm contact email flow still works.
- Run Lighthouse on home/gallery and compare against prior report.
- Verify Cloudflare Pages deployment health and domain cert status.


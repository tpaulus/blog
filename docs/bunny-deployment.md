# Deploying the Hugo site to Bunny Storage

The production site is stored directly in one Bunny Storage Zone directory and
served through a Bunny Pull Zone. Deployments synchronize the generated site
to that single live location. Hugo is not a single-page application: do **not**
enable Bunny's 404-to-200 SPA fallback.

## Prerequisites

- A Bunny Storage Zone and a Pull Zone that reads it.
- `blog.tompaulus.com` added as a Pull Zone hostname with TLS enabled.
- Node.js 22 or newer, Hugo Extended matching `.hugo-version`, and installed
  npm dependencies.

The script uses Bunny's Storage HTTP API. When cache-purge credentials are
configured, it uses Bunny's Core API only to purge the Pull Zone after a
successful sync; it does not alter the Pull Zone configuration.

## Environment variables

The script does not automatically read `.env` files. Copy `.env.example` into
your secret manager or CI configuration.

| Variable | Required | Purpose |
| --- | --- | --- |
| `BUNNY_STORAGE_ZONE` | Yes | Storage Zone name. |
| `BUNNY_STORAGE_PASSWORD` | Yes | Storage Zone password used as the Storage API `AccessKey`; this is not the account API key. |
| `BUNNY_STORAGE_ENDPOINT` | No | Regional Storage API host, such as `storage.bunnycdn.com`, `ny.storage.bunnycdn.com`, or `la.storage.bunnycdn.com`. Defaults to `storage.bunnycdn.com`. |
| `BUNNY_DEPLOY_PREFIX` | No | Optional nonempty, relative directory inside the Storage Zone. Leave unset to deploy at the zone root. |
| `BUNNY_DEPLOY_CONCURRENCY` | No | Concurrent upload, verification, and recorded-file deletion operations, from 1 to 32. Defaults to 8. |
| `BUNNY_PULL_ZONE_ID` | With `BUNNY_API_KEY` | Numeric Pull Zone ID to purge after a successful deployment. |
| `BUNNY_API_KEY` | With `BUNNY_PULL_ZONE_ID` | Bunny account API key for the Pull Zone cache purge. |

Never expose either Bunny key to the generated site or commit it to Git.

## Build and deploy

```bash
npm ci
npm run deploy
```

The normal command builds Hugo and Pagefind, then:

1. Reads the existing `.deploy-manifest.json` in the configured live prefix.
2. Uploads every current file with a SHA-256 checksum and verifies every
   uploaded byte.
3. Deletes only paths listed by the previous manifest that are absent from the
   current build. It never recursively deletes a directory and never deletes
   unrecorded remote files.
4. Writes and verifies a new manifest containing sorted paths, sizes, and
   hashes.
5. Purges the Pull Zone only after all preceding steps succeed, when both Core
   API credentials are configured.

The manifest is a safety boundary, not an inventory of the Storage Zone.
Deploying at the zone root is allowed because the script never lists or
recursively deletes it.

If a pre-existing manifest is malformed, deployment preserves all files it
cannot trust, uploads and verifies the complete current site, then writes a
valid replacement manifest. A safely structured legacy manifest with a
different file ordering is normalized automatically.

Useful options:

```bash
# Upload an already-built directory.
node scripts/deploy-bunny.mjs --skip-build --source public

# Show the planned uploads and manifest-recorded stale-file deletions.
node scripts/deploy-bunny.mjs --dry-run

# Complete a successful sync without a Pull Zone purge.
node scripts/deploy-bunny.mjs --skip-purge
```

A dry run still needs Storage credentials because it reads the existing
manifest. `--skip-purge` changes only the final purge step.

## GitHub Actions production environment

The workflow checks pull requests and pushes to `main`. Only a successful push
to `main` deploys, using the protected GitHub Actions environment named
`production`; pull requests never deploy.

Create `production` in **Settings → Environments**, configure reviewers and
deployment protection rules, and expose these environment secrets:

| Secret | Required | Purpose |
| --- | --- | --- |
| `BUNNY_STORAGE_ZONE` | Yes | Storage Zone name. |
| `BUNNY_STORAGE_PASSWORD` | Yes | Storage Zone password for the Storage API. |
| `BUNNY_STORAGE_ENDPOINT` | No | Regional Storage API host. |
| `BUNNY_DEPLOY_PREFIX` | No | Optional live directory; leave empty for the zone root. |
| `BUNNY_DEPLOY_CONCURRENCY` | No | Upload concurrency from 1 to 32. |
| `BUNNY_PULL_ZONE_ID` | Yes | Pull Zone to purge after deployment. |
| `BUNNY_API_KEY` | Yes | Bunny Core API authentication for cache purging. |

The workflow downloads the built `public/` artifact and runs:

```text
npm run deploy -- --skip-build --source public
```

## Pull Zone configuration

1. Connect the Pull Zone to the Storage Zone and configure its origin for the
   same directory used by `BUNNY_DEPLOY_PREFIX` (or the Storage Zone root).
2. Add `blog.tompaulus.com` as a custom hostname, point its DNS CNAME to the
   Pull Zone hostname, and enable Bunny-managed TLS.
3. Enforce HTTPS for the custom hostname in Bunny. Hugo serves the feed
   directly at `/rss.xml`; no Edge Rules are required.

Published post paths are served directly by Hugo at their existing
`/<slug>/` URLs. Do not add broad compatibility rules for legacy Ghost image,
author, or search routes.

If a deployment verifies every file but the public hostname still returns
`/assets/built/...` files, the hostname is still routed to the Ghost origin.
Confirm the Pull Zone uses the logged Storage Zone and the same prefix as
`BUNNY_DEPLOY_PREFIX`, then purge the Pull Zone cache.

### Caching

Use short cache lifetimes for mutable documents:

- HTML, XML, and JSON: approximately one hour.
- Fingerprinted CSS and JavaScript: one year.
- Fonts: one year.
- Stable bundle media assets (for example, `/<slug>/media/hero.jpg`): one
  month or longer.

The final Pull Zone purge makes HTML and other mutable output visible promptly.
Fingerprinting gives CSS and JavaScript a new URL whenever their contents
change, so browser caches cannot retain an older site asset.

## Staging and rollback

Before changing DNS, deploy to the intended Storage directory and check the
root and nested pages, Pagefind assets, feeds, sitemap, robots file, 404 page,
representative media, redirects, and cache headers.

To roll back, rebuild or retrieve the previously known-good `public/`
artifact, then re-upload it with the same direct-sync command and allow the
cache purge:

```bash
node scripts/deploy-bunny.mjs --skip-build --source public
```

## References

- [Bunny static frontend hosting](https://bunny.net/docs/storage/static-site-hosting)
- [Bunny Storage HTTP API](https://bunny.net/docs/storage/http)
- [Bunny cache purging](https://bunny.net/docs/cdn/purge-cache)

# Tom's Journal

Hugo source for [blog.tompaulus.com](https://blog.tompaulus.com/).

## Prerequisites

- Hugo Extended `0.166.0` (see `.hugo-version`)
- Node.js 22 or newer

Install JavaScript dependencies:

```bash
npm ci
```

## Local development

```bash
npm run dev
```

Hugo serves drafts and future-dated posts locally and reloads when content,
templates, or assets change. Draft post titles are prefixed with `DRAFT:`,
matching the development site.

## Write a new blog post

Posts are self-contained Hugo leaf bundles. Choose a URL-safe slug, then create
the post file and a directory for its local resources:

```bash
mkdir -p content/posts/my-new-post/media
touch content/posts/my-new-post/index.md
```

Start `index.md` with valid front matter. Choose a `slug` that preserves the
page's public URL; the project-level permalink rules add the trailing slash:

```yaml
---
title: My New Post
slug: my-new-post
date: 2026-09-11T09:00:00+02:00
draft: true
---
```

Do not add `author` or `authors` metadata. Add tags, a description, and other
post-specific metadata only when needed. Non-draft posts must use a valid
`date` (or `publishDate`) that is not in the future; mark scheduled posts as
`draft: true` until their publication timestamp arrives.

Keep every image used by a post inside that post's bundle, normally under
`media/`. Reference it with a bundle-relative path; remote image URLs are not
permitted. Ordinary external links are fine. Use native Markdown footnotes,
not raw HTML footnote markup:

```markdown
![A diagram of the publishing flow](media/publishing-flow.png)

The deploy is checked before upload.[^deploy-check]
See the [Bunny Storage documentation](https://bunny.net/docs/storage/http)
for API details.

[^deploy-check]: The validation step runs before deployment.
```

Use Markdown for images and a Hugo shortcode for embeds; raw HTML in posts is
not permitted. The local-image lint rejects raw HTML outside fenced code
blocks.

To add a local feature image, copy it into the same bundle and point
`feature_image` at it. `feature_image_alt` and `feature_image_caption` are
optional:

```yaml
feature_image: media/hero.jpg
feature_image_alt: A short description of the hero image
feature_image_caption: Optional visible caption
```

For an Unsplash feature image, set `feature_image` to its canonical photo-page
URL. The official Unsplash API supplies the image and photographer attribution;
`npm run dev`, `npm run lint`, and every production build download the image
into the bundle and generate the visible credit. The image and generated
attribution data are gitignored. Set `UNSPLASH_ACCESS_KEY` locally and add the
same value as the repository's `UNSPLASH_ACCESS_KEY` Actions secret:

```yaml
feature_image: https://unsplash.com/photos/a-description-photo-id
```

Generated Unsplash images and attribution are reused locally. GitHub Actions
caches them across runs and calls Unsplash only when a feature image changes
or is missing from the cache.

Preview the draft with `npm run dev`, then visit the local URL printed by
Hugo (normally `/my-new-post/`). Before publishing, run the local-image lint,
production build:

```bash
npm run lint
npm run build
```

`npm test` runs the ongoing site checks, including the production build.

## Build and validate

```bash
npm test
```

This runs the ongoing checks, builds the production Hugo site, and creates the
Pagefind index. The generated site is written to `public/`.

To build without tests:

```bash
npm run build
```

## Deploy to Bunny

Set the variables documented in `.env.example`, then run:

```bash
npm run deploy
```

Deployment builds and validates the site, then directly syncs it to the
configured Storage Zone prefix (or safely to the zone root). It verifies
SHA-256 checksums, removes only stale paths recorded in the previous
`.deploy-manifest.json`, writes a new manifest, and then purges the Pull Zone
when `BUNNY_PULL_ZONE_ID` and `BUNNY_API_KEY` are configured. It never
recursively deletes a Storage directory or changes a Bunny origin. See the
[Bunny deployment guide](docs/bunny-deployment.md) for setup and rollback by
re-uploading a previous `public/` artifact.

## GitHub Actions

`.github/workflows/deploy-bunny.yml` runs local-image linting plus production
and development builds (including Pagefind indexes) for pull requests to `main`
and pushes to `main`. Only a successful push to `main` deploys. It downloads
the validated artifacts and directly syncs them through separate protected
GitHub environments:

- `production` publishes the normal site to `blog.tompaulus.com`.
- `development` publishes a draft-inclusive, noindex site to
  `dev.blog.tompaulus.com`.

Each environment needs its own Storage secrets plus `BUNNY_PULL_ZONE_ID` and
`BUNNY_API_KEY` for the final cache purge. The development environment must use
a separate Bunny Pull Zone and either a separate Storage Zone or a distinct
`BUNNY_DEPLOY_PREFIX`. Configure the matching Bunny hostnames, origins, secrets,
and environment protection rules described in [the deployment guide](docs/bunny-deployment.md).

## Documentation

- [Bunny deployment](docs/bunny-deployment.md)

## License

This repository is licensed under the [MIT License](LICENSE). Ported Alto theme
components retain their original [MIT license notice](licenses/ALTO-LICENSE.txt).

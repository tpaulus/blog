#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const IMAGE_TAG = /<(img|source|video)\b([^>]*)>/gi;
const IMAGE_ATTRIBUTE = /\b(src|srcset|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;

function fail(message) {
  throw new Error(`Local image lint: ${message}`);
}

function allFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? allFiles(file) : [file];
  });
}

function isExternal(value) {
  return /^(?:https?:)?\/\//i.test(value);
}

function isApprovedExternalImage(value) {
  return value === 'https://github.githubassets.com/favicons/favicon.svg'
    || /^https:\/\/opengraph\.githubassets\.com\/[^/]+\/[^/]+\/[^/]+$/.test(value);
}

function localPath(value, baseDirectory, root, location) {
  const source = String(value ?? '').trim();
  if (!source) fail(`${location} has an empty image URL`);
  if (isExternal(source)) fail(`${location} has an external image URL: ${source}`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(source)) fail(`${location} has a non-local image URL: ${source}`);

  const pathname = source.split(/[?#]/, 1)[0];
  if (!pathname || pathname === '/') fail(`${location} has an invalid local image URL: ${source}`);
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    fail(`${location} has an invalid encoded image URL: ${source}`);
  }
  if (decoded.includes('\\')) fail(`${location} has an unsafe local image URL: ${source}`);

  const candidate = pathname.startsWith('/')
    ? path.resolve(root, 'static', `.${decoded}`)
    : path.resolve(baseDirectory, decoded);
  const allowedRoot = pathname.startsWith('/') ? path.resolve(root, 'static') : path.resolve(baseDirectory);
  if (candidate !== allowedRoot && !candidate.startsWith(`${allowedRoot}${path.sep}`)) {
    fail(`${location} escapes its local media directory: ${source}`);
  }
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    fail(`${location} references missing local media: ${source}`);
  }
}

function srcsetSources(value) {
  return value.split(',').map((candidate) => candidate.trim().split(/\s+/, 1)[0]).filter(Boolean);
}

function htmlImageSources(source) {
  const sources = [];
  for (const tag of source.matchAll(IMAGE_TAG)) {
    const tagName = tag[1].toLowerCase();
    for (const attribute of tag[2].matchAll(IMAGE_ATTRIBUTE)) {
      const name = attribute[1].toLowerCase();
      if ((tagName === 'video' && name !== 'poster') || (tagName !== 'video' && name === 'poster')) continue;
      const value = attribute[2] ?? attribute[3] ?? attribute[4] ?? '';
      for (const url of name === 'srcset' ? srcsetSources(value) : [value]) sources.push(url);
    }
  }
  return sources;
}

function markdownImageSources(source) {
  return [...source.matchAll(/!\[[^\]]*]\(\s*(?:<([^>]+)>|([^\s)]+))/g)].map((match) => match[1] ?? match[2]);
}

function rawHtmlLines(source) {
  const lines = [];
  let fence;
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = undefined;
      continue;
    }
    if (!fence && /<\/?[a-z][^>]*>/i.test(line)) lines.push(index + 1);
  }
  return lines;
}

function frontMatter(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) fail(`${file} has no YAML front matter`);
  const parsed = YAML.parse(match[1]);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail(`${file} has invalid YAML front matter`);
  return parsed;
}

function isRenderablePage(metadata) {
  return metadata.build?.render !== 'never';
}

export function lintContent({ root = process.cwd(), contentDirectory = path.join(root, 'content') } = {}) {
  if (fs.existsSync(path.join(contentDirectory, 'site-assets'))) {
    fail(`${path.relative(root, contentDirectory) || 'content'}/site-assets must not exist; global assets belong in static/site-assets`);
  }
  const bundles = allFiles(contentDirectory).filter((file) => path.basename(file) === 'index.md').sort();
  for (const file of bundles) {
    const source = fs.readFileSync(file, 'utf8');
    const metadata = frontMatter(source, file);
    if (isRenderablePage(metadata) && (typeof metadata.url !== 'string' || !metadata.url.trim())) {
      fail(`${file} has no nonempty url front matter`);
    }

    const location = path.relative(root, file);
    const bundle = path.dirname(file);
    const htmlLines = rawHtmlLines(source);
    if (htmlLines.length) {
      fail(`${location} contains raw HTML on line(s) ${htmlLines.join(', ')}; use Markdown or a Hugo shortcode instead`);
    }
    if (metadata.feature_image !== undefined) {
      localPath(metadata.feature_image, bundle, root, `${location} feature_image`);
    }
    for (const image of markdownImageSources(source)) {
      localPath(image, bundle, root, `${location} Markdown image`);
    }
    for (const image of htmlImageSources(source)) {
      localPath(image, bundle, root, `${location} HTML image source`);
    }
  }
  return bundles.length;
}

export function lintPublic({ root = process.cwd(), publicDirectory = path.join(root, 'public') } = {}) {
  if (!fs.existsSync(publicDirectory)) return 0;
  const files = allFiles(publicDirectory);
  const pages = files.filter((file) => file.endsWith('.html')).sort();
  const publicRoot = path.resolve(publicDirectory);
  for (const page of pages) {
    const source = fs.readFileSync(page, 'utf8');
    const location = path.relative(root, page);
    for (const image of htmlImageSources(source)) {
      const url = String(image).trim();
      if (!url) fail(`${location} has an empty image URL`);
      if (isExternal(url)) {
        if (isApprovedExternalImage(url)) continue;
        fail(`${location} has an external image URL: ${url}`);
      }
      if (/^[a-z][a-z0-9+.-]*:/i.test(url)) fail(`${location} has a non-local image URL: ${url}`);
      const pathname = url.split(/[?#]/, 1)[0];
      let decoded;
      try {
        decoded = decodeURIComponent(pathname);
      } catch {
        fail(`${location} has an invalid encoded image URL: ${url}`);
      }
      const candidate = pathname.startsWith('/')
        ? path.resolve(publicRoot, `.${decoded}`)
        : path.resolve(path.dirname(page), decoded);
      if (candidate !== publicRoot && !candidate.startsWith(`${publicRoot}${path.sep}`)) {
        fail(`${location} escapes public output: ${url}`);
      }
      const exists = fs.existsSync(candidate) && fs.statSync(candidate).isFile();
      if (!exists) {
        fail(`${location} references missing local media: ${url}`);
      }
    }
  }
  return pages.length;
}

export function lintLocalImages(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const bundles = lintContent({ root, contentDirectory: options.contentDirectory ?? path.join(root, 'content') });
  const pages = lintPublic({ root, publicDirectory: options.publicDirectory ?? path.join(root, 'public') });
  return { bundles, pages };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = lintLocalImages();
  console.log(`Local image lint passed: ${result.bundles} content bundles, ${result.pages} rendered pages.`);
}

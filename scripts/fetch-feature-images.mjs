#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const UNSPLASH_HOST = 'unsplash.com';
const API_HOST = 'api.unsplash.com';

function allFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? allFiles(file) : [file];
  });
}

function frontMatter(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`Feature image fetch: ${file} has no YAML front matter`);
  const metadata = YAML.parse(match[1]);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error(`Feature image fetch: ${file} has invalid YAML front matter`);
  }
  return metadata;
}

function photoId(source, file) {
  if (typeof source !== 'string' || !source.startsWith('https://')) return;
  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error(`Feature image fetch: ${file} has an invalid feature_image URL`);
  }
  if (url.hostname !== UNSPLASH_HOST || !url.pathname.startsWith('/photos/')) {
    throw new Error(`Feature image fetch: ${file} feature_image must be a canonical Unsplash photo URL`);
  }
  const segment = url.pathname.split('/').filter(Boolean).at(-1);
  const id = segment?.slice(-11);
  if (!/^[A-Za-z0-9_-]{11}$/.test(id) || (segment.length > id.length && segment.at(-12) !== '-')) {
    throw new Error(`Feature image fetch: ${file} feature_image has no valid Unsplash photo ID`);
  }
  return id;
}

async function responseJson(fetchImpl, url, accessKey, file, description) {
  url.searchParams.set('client_id', accessKey);
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json' },
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`Feature image fetch: ${file} returned HTTP ${response.status} while fetching ${description}`);
  return response.json();
}

function imageTarget(file, id) {
  return path.join(path.dirname(file), 'media', 'external', `unsplash-${id}.jpg`);
}

function cachedAttribution(file) {
  if (!fs.existsSync(file)) return {};
  let attribution;
  try {
    attribution = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`Feature image fetch: ${file} contains invalid cached attribution data`);
  }
  if (!attribution || typeof attribution !== 'object' || Array.isArray(attribution)) {
    throw new Error(`Feature image fetch: ${file} contains invalid cached attribution data`);
  }
  return attribution;
}

function isAttribution(value) {
  return value
    && typeof value === 'object'
    && typeof value.name === 'string'
    && typeof value.url === 'string';
}

export async function fetchFeatureImages({ root = process.cwd(), accessKey, fetchImpl = fetch } = {}) {
  root = path.resolve(root);
  const attributionFile = path.join(root, 'data', 'unsplash_attribution.json');
  if (accessKey === undefined) {
    const developmentEnvironment = path.join(root, '.dev.env');
    if (fs.existsSync(developmentEnvironment)) process.loadEnvFile(developmentEnvironment);
    accessKey = process.env.UNSPLASH_ACCESS_KEY;
  }
  const contentDirectory = path.join(root, 'content');
  const bundles = allFiles(contentDirectory).filter((file) => path.basename(file) === 'index.md').sort();
  const unsplashBundles = bundles.map((file) => ({ file, metadata: frontMatter(fs.readFileSync(file, 'utf8'), file) }))
    .map(({ file, metadata }) => ({ file, id: photoId(metadata.feature_image, file), source: metadata.feature_image }))
    .filter(({ id }) => id);
  const cached = cachedAttribution(attributionFile);
  const missingCachedImages = unsplashBundles.filter(({ file, id, source }) => {
    const target = imageTarget(file, id);
    return !fs.existsSync(target) || !isAttribution(cached[source]);
  });
  if (missingCachedImages.length && !accessKey) {
    throw new Error('Feature image fetch: UNSPLASH_ACCESS_KEY is required for Unsplash feature images');
  }

  const attribution = {};
  for (const { file, id, source } of unsplashBundles) {
    const target = imageTarget(file, id);
    if (fs.existsSync(target) && isAttribution(cached[source])) {
      attribution[source] = cached[source];
      continue;
    }

    const apiUrl = new URL(`/photos/${id}`, `https://${API_HOST}`);
    const photo = await responseJson(fetchImpl, apiUrl, accessKey, file, 'Unsplash photo metadata');
    if (!photo.urls?.raw || !photo.user?.name || !photo.user?.links?.html) {
      throw new Error(`Feature image fetch: ${file} received incomplete Unsplash photo metadata`);
    }

    const imageUrl = new URL(photo.urls.raw);
    imageUrl.searchParams.set('fm', 'jpg');
    imageUrl.searchParams.set('q', '80');
    imageUrl.searchParams.set('w', '2000');
    const image = await fetchImpl(imageUrl, { redirect: 'error' });
    if (!image.ok) throw new Error(`Feature image fetch: ${file} returned HTTP ${image.status} while downloading the image`);
    if (!(image.headers.get('content-type') ?? '').startsWith('image/')) {
      throw new Error(`Feature image fetch: ${file} returned non-image content while downloading the image`);
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(await image.arrayBuffer()));
    attribution[source] = { name: photo.user.name, url: photo.user.links.html };
  }

  if (unsplashBundles.length) {
    fs.mkdirSync(path.dirname(attributionFile), { recursive: true });
    fs.writeFileSync(attributionFile, `${JSON.stringify(attribution, null, 2)}\n`);
  } else if (fs.existsSync(attributionFile)) {
    fs.unlinkSync(attributionFile);
  }
  return unsplashBundles.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const downloaded = await fetchFeatureImages();
  console.log(`Fetched ${downloaded} Unsplash feature image${downloaded === 1 ? '' : 's'}.`);
}

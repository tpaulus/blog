import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fetchFeatureImages } from '../scripts/fetch-feature-images.mjs';

function fixtureDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'feature-image-fetch-'));
}

function writeBundle(root, metadata) {
  const bundle = path.join(root, 'content', 'posts', 'example');
  fs.mkdirSync(bundle, { recursive: true });
  fs.writeFileSync(path.join(bundle, 'index.md'), `---\n${metadata}\n---\n`);
  return bundle;
}

test('downloads a canonical Unsplash feature image and writes its attribution', async (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = 'https://unsplash.com/photos/a-photo-AexHn1Bzb3Q';
  const bundle = writeBundle(root, `feature_image: ${source}`);
  const downloaded = await fetchFeatureImages({
    root,
    accessKey: 'test-key',
    fetchImpl: async (url) => {
      if (url.hostname === 'api.unsplash.com' && url.pathname === '/photos/AexHn1Bzb3Q') {
        return Response.json({
          urls: { raw: 'https://images.unsplash.com/photo-example' },
          user: { name: 'Example Photographer', links: { html: 'https://unsplash.com/@example' } },
          links: { download_location: 'https://api.unsplash.com/photos/AexHn1Bzb3Q/download' },
        });
      }
      if (url.hostname === 'api.unsplash.com') return Response.json({ url: 'https://images.unsplash.com/photo-example' });
      return new Response('image data', { headers: { 'content-type': 'image/jpeg' } });
    },
  });

  assert.equal(downloaded, 1);
  assert.equal(fs.readFileSync(path.join(bundle, 'media', 'external', 'unsplash-AexHn1Bzb3Q.jpg'), 'utf8'), 'image data');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'data', 'unsplash_attribution.json'), 'utf8')), {
    [source]: { name: 'Example Photographer', url: 'https://unsplash.com/@example' },
  });
});

test('requires an access key for Unsplash feature images', async (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, 'feature_image: https://unsplash.com/photos/a-photo-AexHn1Bzb3Q');

  await assert.rejects(fetchFeatureImages({ root, accessKey: '' }), /UNSPLASH_ACCESS_KEY/);
});

test('reuses a cached image and attribution without calling Unsplash', async (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = 'https://unsplash.com/photos/a-photo-AexHn1Bzb3Q';
  const bundle = writeBundle(root, `feature_image: ${source}`);
  const image = path.join(bundle, 'media', 'external', 'unsplash-AexHn1Bzb3Q.jpg');
  fs.mkdirSync(path.dirname(image), { recursive: true });
  fs.writeFileSync(image, 'cached image');
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data', 'unsplash_attribution.json'), JSON.stringify({
    [source]: { name: 'Cached Photographer', url: 'https://unsplash.com/@cached' },
  }));

  await assert.doesNotReject(fetchFeatureImages({
    root,
    accessKey: '',
    fetchImpl: async () => { throw new Error('Unsplash should not be called'); },
  }));
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { lintLocalImages } from '../scripts/lint-local-images.mjs';

function fixtureDirectory() {
  const directory = path.join('tests', 'fixtures', `.local-image-lint-${process.pid}-${Date.now()}`);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function writeBundle(root, source, media = true, addDefaultDate = true) {
  const bundle = path.join(root, 'content', 'posts', 'example');
  fs.mkdirSync(bundle, { recursive: true });
  const content = addDefaultDate && !/^(?:date|publishDate):/m.test(source)
    ? source.replace(/^---\n/, '---\ndate: 2020-01-01T00:00:00.000Z\n')
    : source;
  fs.writeFileSync(path.join(bundle, 'index.md'), content);
  if (media) {
    fs.mkdirSync(path.join(bundle, 'media'), { recursive: true });
    fs.writeFileSync(path.join(bundle, 'media', 'image.png'), 'image');
  }
}

test('local image lint accepts bundle media and ordinary external links', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\nfeature_image: media/image.png\n---\n\n![image](media/image.png)\n\n[link](https://example.test)\n');
  assert.deepEqual(lintLocalImages({ root }), { bundles: 1, pages: 0 });
});

test('local image lint requires non-draft posts to have a current publication date', (t) => {
  const root = fixtureDirectory();
  const now = new Date('2026-09-19T19:27:43.503-07:00');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  writeBundle(root, '---\ntitle: Example\n---\n', true, false);
  assert.throws(() => lintLocalImages({ root, now }), /must have a publication date/);

  writeBundle(root, '---\ntitle: Example\ndate: not-a-date\n---\n');
  assert.throws(() => lintLocalImages({ root, now }), /invalid publication date/);

  writeBundle(root, '---\ntitle: Example\npublishDate: 2026-09-21T00:00:00.000Z\n---\n');
  assert.throws(() => lintLocalImages({ root, now }), /future publication date/);
});

test('local image lint permits future publication dates on drafts', (t) => {
  const root = fixtureDirectory();
  const now = new Date('2026-09-19T19:27:43.503-07:00');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\ndate: 2026-09-21T00:00:00.000Z\ndraft: true\n---\n');

  assert.doesNotThrow(() => lintLocalImages({ root, now }));
});

test('local image lint rejects external image URLs in content and front matter', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\nfeature_image: https://images.example.test/hero.png\n---\n\n![image](https://images.example.test/image.png)\n');
  assert.throws(() => lintLocalImages({ root }), /external image URL/);
});

test('local image lint permits canonical Unsplash feature image URLs', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\nurl: /example/\nfeature_image: https://unsplash.com/photos/a-photo-AexHn1Bzb3Q\n---\n');
  assert.deepEqual(lintLocalImages({ root }), { bundles: 1, pages: 0 });
});

test('local image lint rejects raw HTML outside code fences', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\n---\n\n<iframe src="https://example.test"></iframe>\n');
  assert.throws(() => lintLocalImages({ root }), /contains raw HTML/);
  fs.writeFileSync(path.join(root, 'content', 'posts', 'example', 'index.md'), '---\ntitle: Example\ndate: 2020-01-01T00:00:00.000Z\n---\n\n```json\n"<div>not HTML content</div>"\n```\n');
  assert.doesNotThrow(() => lintLocalImages({ root }));
});

test('local image lint allows pages without URLs and rejects missing local media', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\n---\n\n![missing](media/missing.png)\n', false);
  assert.throws(() => lintLocalImages({ root }), /missing local media/);
});

test('local image lint checks generated HTML image paths and rejects remote srcset', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\n---\n');
  const output = path.join(root, 'public', 'example');
  fs.mkdirSync(path.join(output, 'media'), { recursive: true });
  fs.writeFileSync(path.join(output, 'media', 'image.png'), 'image');
  fs.writeFileSync(path.join(output, 'index.html'), '<img src="media/image.png" srcset="https://images.example.test/image.png 2x">');
  assert.throws(() => lintLocalImages({ root }), /external image URL/);
});

test('local image lint permits GitHub shortcode provider images', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\n---\n');
  const output = path.join(root, 'public', 'example');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'index.html'), '<img src="https://github.githubassets.com/favicons/favicon.svg" alt=""><img src="https://opengraph.githubassets.com/1/octocat/Hello-World" alt="">');
  assert.doesNotThrow(() => lintLocalImages({ root }));
});

test('local image lint requires generated relative URLs in the rendered page directory', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\n---\n');
  fs.mkdirSync(path.join(root, 'public', 'example'), { recursive: true });
  fs.mkdirSync(path.join(root, 'public', 'other', 'media'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public', 'example', 'index.html'), '<img src="media/image.png">');
  fs.writeFileSync(path.join(root, 'public', 'other', 'media', 'image.png'), 'image');

  assert.throws(() => lintLocalImages({ root }), /references missing local media/);
});

test('local image lint rejects the former content site-assets bundle', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'content', 'site-assets'), { recursive: true });
  fs.mkdirSync(path.join(root, 'static', 'site-assets'), { recursive: true });
  fs.writeFileSync(path.join(root, 'static', 'site-assets', 'icon.png'), 'icon');
  assert.throws(() => lintLocalImages({ root }), /global assets belong in static\/site-assets/);
});

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

function writeBundle(root, source, media = true) {
  const bundle = path.join(root, 'content', 'posts', 'example');
  fs.mkdirSync(bundle, { recursive: true });
  fs.writeFileSync(path.join(bundle, 'index.md'), source);
  if (media) {
    fs.mkdirSync(path.join(bundle, 'media'), { recursive: true });
    fs.writeFileSync(path.join(bundle, 'media', 'image.png'), 'image');
  }
}

test('local image lint accepts bundle media and ordinary external links', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\nurl: /example/\nfeature_image: media/image.png\n---\n\n![image](media/image.png)\n\n[link](https://example.test)\n');
  assert.deepEqual(lintLocalImages({ root }), { bundles: 1, pages: 0 });
});

test('local image lint rejects external image URLs in content and front matter', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\nurl: /example/\nfeature_image: https://images.example.test/hero.png\n---\n\n![image](https://images.example.test/image.png)\n');
  assert.throws(() => lintLocalImages({ root }), /external image URL/);
});

test('local image lint rejects raw HTML outside code fences', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\nurl: /example/\n---\n\n<iframe src="https://example.test"></iframe>\n');
  assert.throws(() => lintLocalImages({ root }), /contains raw HTML/);
  fs.writeFileSync(path.join(root, 'content', 'posts', 'example', 'index.md'), '---\ntitle: Example\nurl: /example/\n---\n\n```json\n"<div>not HTML content</div>"\n```\n');
  assert.doesNotThrow(() => lintLocalImages({ root }));
});

test('local image lint requires page URLs and existing local media', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\nurl: ""\n---\n\n<img src="media/missing.png">\n', false);
  assert.throws(() => lintLocalImages({ root }), /nonempty url front matter/);
  fs.writeFileSync(path.join(root, 'content', 'posts', 'example', 'index.md'), '---\ntitle: Example\nurl: /example/\n---\n\n![missing](media/missing.png)\n');
  assert.throws(() => lintLocalImages({ root }), /missing local media/);
});

test('local image lint checks generated HTML image paths and rejects remote srcset', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\nurl: /example/\n---\n');
  const output = path.join(root, 'public', 'example');
  fs.mkdirSync(path.join(output, 'media'), { recursive: true });
  fs.writeFileSync(path.join(output, 'media', 'image.png'), 'image');
  fs.writeFileSync(path.join(output, 'index.html'), '<img src="media/image.png" srcset="https://images.example.test/image.png 2x">');
  assert.throws(() => lintLocalImages({ root }), /external image URL/);
});

test('local image lint permits GitHub shortcode provider images', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\nurl: /example/\n---\n');
  const output = path.join(root, 'public', 'example');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'index.html'), '<img src="https://github.githubassets.com/favicons/favicon.svg" alt=""><img src="https://opengraph.githubassets.com/1/octocat/Hello-World" alt="">');
  assert.doesNotThrow(() => lintLocalImages({ root }));
});

test('local image lint requires generated relative URLs in the rendered page directory', (t) => {
  const root = fixtureDirectory();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeBundle(root, '---\ntitle: Example\nurl: /example/\n---\n');
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

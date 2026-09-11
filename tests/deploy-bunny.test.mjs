import assert from 'node:assert/strict';
import test from 'node:test';
import { contentType } from '../scripts/deploy-bunny.mjs';

test('deployment detects extensionless local PNG files by signature', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(contentType('posts/example/media/thumbnail/image', png), 'image/png');
});

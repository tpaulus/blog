import assert from 'node:assert/strict';
import test from 'node:test';
import { contentType, parsePreviousRecords } from '../scripts/deploy-bunny.mjs';

test('deployment detects extensionless local PNG files by signature', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(contentType('posts/example/media/thumbnail/image', png), 'image/png');
});

test('deployment preserves remote files when the previous manifest is invalid', () => {
  const result = parsePreviousRecords(Buffer.from(JSON.stringify({
    version: 1,
    files: [
      { path: 'index.html', size: 1, sha256: 'a'.repeat(64) },
      { path: 'index.html', size: 1, sha256: 'b'.repeat(64) },
    ],
  })));

  assert.deepEqual(result.records, []);
  assert.equal(result.trusted, false);
  assert.match(result.error, /unique and sorted/);
});

#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const DEPLOY_MANIFEST = ".deploy-manifest.json";
const MANIFEST_VERSION = 1;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function parseArgs(argv) {
  const options = {
    source: "public",
    build: true,
    purge: true,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source") {
      const source = argv[++index];
      if (!source) {
        throw new Error("--source requires a directory");
      }
      options.source = source;
    } else if (arg === "--skip-build") {
      options.build = false;
    } else if (arg === "--skip-purge") {
      options.purge = false;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name) {
  return process.env[name]?.trim() || undefined;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) {
    throw new Error(`Unable to run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

async function walkFiles(root, directory = root) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(root, absolute));
    } else if (entry.isFile()) {
      files.push(path.relative(root, absolute).split(path.sep).join("/"));
    } else {
      throw new Error(`Unsupported source entry: ${path.relative(root, absolute)}`);
    }
  }
  return files.sort();
}

function encodeRemotePath(relativePath) {
  return relativePath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

export function contentType(filePath, contents) {
  if (
    contents
    && contents.length >= PNG_SIGNATURE.length
    && PNG_SIGNATURE.every((byte, index) => contents[index] === byte)
  ) {
    return "image/png";
  }

  const types = new Map([
    [".avif", "image/avif"],
    [".css", "text/css; charset=utf-8"],
    [".gif", "image/gif"],
    [".html", "text/html; charset=utf-8"],
    [".ico", "image/x-icon"],
    [".jpeg", "image/jpeg"],
    [".jpg", "image/jpeg"],
    [".js", "text/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".map", "application/json; charset=utf-8"],
    [".mjs", "text/javascript; charset=utf-8"],
    [".mp3", "audio/mpeg"],
    [".mp4", "video/mp4"],
    [".ogg", "audio/ogg"],
    [".pdf", "application/pdf"],
    [".png", "image/png"],
    [".svg", "image/svg+xml"],
    [".txt", "text/plain; charset=utf-8"],
    [".webm", "video/webm"],
    [".webp", "image/webp"],
    [".woff", "font/woff"],
    [".woff2", "font/woff2"],
    [".xml", "application/xml; charset=utf-8"],
  ]);
  return types.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

async function fileRecord(root, relativePath) {
  const absolute = path.join(root, relativePath);
  const [contents, metadata] = await Promise.all([readFile(absolute), stat(absolute)]);
  return {
    path: relativePath,
    size: metadata.size,
    sha256: createHash("sha256").update(contents).digest("hex"),
    contents,
  };
}

async function mapConcurrent(items, concurrency, worker) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      await worker(queue.shift());
    }
  }));
}

function normalizeStorageEndpoint(value) {
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new Error("BUNNY_STORAGE_ENDPOINT must be an HTTPS hostname without credentials or a path");
  }
  return url.host;
}

function normalizePrefix(value) {
  if (!value) {
    return undefined;
  }
  const prefix = value.trim();
  if (prefix !== value || prefix.startsWith("/") || prefix.endsWith("/")) {
    throw new Error("BUNNY_DEPLOY_PREFIX must be a relative path without leading or trailing slashes");
  }
  if (!prefix.split("/").every((segment) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment))) {
    throw new Error("BUNNY_DEPLOY_PREFIX contains an unsafe path segment");
  }
  return prefix;
}

function remoteBase(endpoint, zone, prefix) {
  const root = `https://${endpoint}/${encodeURIComponent(zone)}`;
  return prefix ? `${root}/${encodeRemotePath(prefix)}` : root;
}

async function request(url, options, expectedStatuses) {
  const response = await fetch(url, options);
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${options.method ?? "GET"} request failed with status ${response.status}`);
  }
  return response;
}

async function download(base, storagePassword, relativePath) {
  const response = await request(
    `${base}/${encodeRemotePath(relativePath)}`,
    { headers: { AccessKey: storagePassword } },
    [200, 404],
  );
  return response.status === 404 ? undefined : Buffer.from(await response.arrayBuffer());
}

async function upload(base, storagePassword, record, dryRun) {
  if (dryRun) {
    return;
  }
  await request(
    `${base}/${encodeRemotePath(record.path)}`,
    {
      method: "PUT",
      headers: {
        AccessKey: storagePassword,
        Checksum: record.sha256.toUpperCase(),
        "Content-Type": contentType(record.path, record.contents),
      },
      body: record.contents,
    },
    [201],
  );
}

async function remove(base, storagePassword, filePath, dryRun) {
  if (dryRun) {
    return;
  }
  await request(
    `${base}/${encodeRemotePath(filePath)}`,
    { method: "DELETE", headers: { AccessKey: storagePassword } },
    [200, 204, 404],
  );
}

function validateFilePath(filePath) {
  if (
    typeof filePath !== "string"
    || !filePath
    || filePath === DEPLOY_MANIFEST
    || filePath.startsWith("/")
    || filePath.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Deployment manifest contains an unsafe file path");
  }
}

function compareFilePaths(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || manifest.version !== MANIFEST_VERSION) {
    throw new Error("Deployment manifest has an unsupported format");
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("Deployment manifest has no files");
  }

  const records = [];
  const paths = new Set();
  for (const file of manifest.files) {
    if (
      !file
      || typeof file !== "object"
      || !Number.isSafeInteger(file.size)
      || file.size < 0
      || typeof file.sha256 !== "string"
      || !/^[a-f0-9]{64}$/.test(file.sha256)
    ) {
      throw new Error("Deployment manifest contains an invalid file record");
    }
    validateFilePath(file.path);
    if (paths.has(file.path)) {
      throw new Error("Deployment manifest files must be unique");
    }
    paths.add(file.path);
    records.push({ path: file.path, size: file.size, sha256: file.sha256 });
  }
  return records.sort((left, right) => compareFilePaths(left.path, right.path));
}

export function parsePreviousRecords(contents) {
  if (!contents) {
    return { records: [], trusted: true };
  }
  try {
    return {
      records: validateManifest(JSON.parse(contents.toString("utf8"))),
      trusted: true,
    };
  } catch (error) {
    return { records: [], trusted: false, error: error.message };
  }
}

async function loadPreviousRecords(base, storagePassword) {
  const parsed = parsePreviousRecords(await download(base, storagePassword, DEPLOY_MANIFEST));
  if (!parsed.trusted) {
    console.warn(`Existing deployment manifest is invalid; preserving untracked remote files: ${parsed.error}`);
  }
  return parsed;
}

async function verifyRecords(base, storagePassword, records, concurrency) {
  await mapConcurrent(records, concurrency, async (record) => {
    const contents = await download(base, storagePassword, record.path);
    if (!contents) {
      throw new Error(`Deployment verification could not read ${record.path}`);
    }
    const sha256 = createHash("sha256").update(contents).digest("hex");
    if (contents.length !== record.size || sha256 !== record.sha256) {
      throw new Error(`Deployment verification failed for ${record.path}`);
    }
  });
}

function manifestRecord(records) {
  const manifest = {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    files: records.map(({ path: filePath, size, sha256 }) => ({
      path: filePath,
      size,
      sha256,
    })),
  };
  const contents = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  return {
    path: DEPLOY_MANIFEST,
    size: contents.length,
    sha256: createHash("sha256").update(contents).digest("hex"),
    contents,
  };
}

function cachePurgeConfiguration() {
  const pullZoneId = optionalEnv("BUNNY_PULL_ZONE_ID");
  const apiKey = optionalEnv("BUNNY_API_KEY");
  if (!pullZoneId && !apiKey) {
    return undefined;
  }
  if (!pullZoneId || !apiKey) {
    throw new Error("Cache purge requires BUNNY_PULL_ZONE_ID and BUNNY_API_KEY together");
  }
  if (!/^\d+$/.test(pullZoneId)) {
    throw new Error("BUNNY_PULL_ZONE_ID must be numeric");
  }
  return { pullZoneId, apiKey };
}

async function purgePullZone(pullZoneId, apiKey, dryRun) {
  if (dryRun) {
    return;
  }
  await request(
    `https://api.bunny.net/pullzone/${encodeURIComponent(pullZoneId)}/purgeCache`,
    { method: "POST", headers: { AccessKey: apiKey } },
    [200, 204],
  );
}

async function deploy({
  sourceRoot,
  base,
  storagePassword,
  concurrency,
  dryRun,
}) {
  const source = await stat(sourceRoot);
  if (!source.isDirectory()) {
    throw new Error(`Deployment source is not a directory: ${sourceRoot}`);
  }

  const localPaths = (await walkFiles(sourceRoot)).filter((file) => file !== DEPLOY_MANIFEST);
  if (!localPaths.includes("index.html")) {
    throw new Error(`No index.html found in ${sourceRoot}; refusing to deploy`);
  }

  const records = [];
  await mapConcurrent(localPaths, concurrency, async (relativePath) => {
    validateFilePath(relativePath);
    records.push(await fileRecord(sourceRoot, relativePath));
  });
  records.sort((left, right) => compareFilePaths(left.path, right.path));

  const { records: previousRecords, trusted: previousManifestIsTrusted } = await loadPreviousRecords(base, storagePassword);
  const currentPaths = new Set(records.map((record) => record.path));
  const staleRecords = previousRecords.filter((record) => !currentPaths.has(record.path));
  console.log(
    `${dryRun ? "Planned" : "Uploading"} ${records.length} files`
      + `${staleRecords.length ? ` and removing ${staleRecords.length} stale files` : ""}`,
  );
  if (dryRun) {
    return;
  }

  await mapConcurrent(records, concurrency, (record) => upload(base, storagePassword, record, false));
  await verifyRecords(base, storagePassword, records, concurrency);
  if (previousManifestIsTrusted) {
    await mapConcurrent(staleRecords, concurrency, (record) => remove(base, storagePassword, record.path, false));
  }

  const completionManifest = manifestRecord(records);
  await upload(base, storagePassword, completionManifest, false);
  const uploadedManifest = await download(base, storagePassword, DEPLOY_MANIFEST);
  if (
    !uploadedManifest
    || uploadedManifest.length !== completionManifest.size
    || createHash("sha256").update(uploadedManifest).digest("hex") !== completionManifest.sha256
  ) {
    throw new Error("Deployment manifest verification failed");
  }
  console.log(`Verified ${records.length} deployed files`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const storageZone = requiredEnv("BUNNY_STORAGE_ZONE");
  const storagePassword = requiredEnv("BUNNY_STORAGE_PASSWORD");
  const endpoint = normalizeStorageEndpoint(optionalEnv("BUNNY_STORAGE_ENDPOINT") || "storage.bunnycdn.com");
  const prefix = normalizePrefix(optionalEnv("BUNNY_DEPLOY_PREFIX"));
  const concurrency = Number.parseInt(optionalEnv("BUNNY_DEPLOY_CONCURRENCY") || "8", 10);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) {
    throw new Error("BUNNY_DEPLOY_CONCURRENCY must be an integer from 1 to 32");
  }
  const cachePurge = cachePurgeConfiguration();

  if (options.build) {
    run("npm", ["run", "build"]);
  }

  await deploy({
    sourceRoot: path.resolve(options.source),
    base: remoteBase(endpoint, storageZone, prefix),
    storagePassword,
    concurrency,
    dryRun: options.dryRun,
  });

  if (options.purge && cachePurge) {
    await purgePullZone(cachePurge.pullZoneId, cachePurge.apiKey, options.dryRun);
    console.log(`${options.dryRun ? "Planned" : "Completed"} Pull Zone cache purge`);
  } else if (options.purge) {
    console.log("Deployment complete; cache purge skipped because Bunny Core API credentials are not configured");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

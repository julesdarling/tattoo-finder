import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, '..');
const records = JSON.parse(await readFile(path.join(dbDir, 'records.json'), 'utf8'));
const audit = JSON.parse(await readFile(path.join(dbDir, 'portfolio-audit.json'), 'utf8'));
const rejections = JSON.parse(await readFile(path.join(dbDir, 'portfolio-rejections.json'), 'utf8'));

const requiredFields = [
  'id',
  'source',
  'sourcePageUrl',
  'mediaType',
  'displayMode',
  'title',
  'alt',
  'styleTags',
  'collectedAt',
  'rightsStatus',
  'confidence',
];

const errors = [];
const ids = new Set();
const auditedRecordIds = new Set((audit.records || []).map((entry) => entry.recordId));

if (records.length !== 471) {
  errors.push(`Expected 471 records, found ${records.length}.`);
}

for (const record of records) {
  if (!auditedRecordIds.has(record.id)) errors.push(`Record id is missing from portfolio audit: ${record.id}`);
  if (!Array.isArray(record.portfolioItems)) errors.push(`${record.id} is missing portfolioItems array.`);

  for (const item of record.portfolioItems || []) {
    for (const field of requiredFields) {
      if (!(field in item)) errors.push(`${record.id}/${item.id} missing required portfolio field: ${field}`);
    }
    if (ids.has(item.id)) errors.push(`Duplicate portfolio item id: ${item.id}`);
    ids.add(item.id);
    if (!isHttps(item.sourcePageUrl)) errors.push(`${record.id}/${item.id} sourcePageUrl is not HTTPS: ${item.sourcePageUrl}`);
    if (item.mediaUrl && !isHttps(item.mediaUrl)) errors.push(`${record.id}/${item.id} mediaUrl is not HTTPS: ${item.mediaUrl}`);
    if (item.thumbnailUrl && !isHttps(item.thumbnailUrl)) errors.push(`${record.id}/${item.id} thumbnailUrl is not HTTPS: ${item.thumbnailUrl}`);
    if (containsBlockedMediaHost(item.sourcePageUrl) || containsBlockedMediaHost(item.mediaUrl) || containsBlockedMediaHost(item.thumbnailUrl)) {
      errors.push(`${record.id}/${item.id} stores blocked Instagram/Facebook CDN media.`);
    }
    if (item.source === 'instagram' && !isAllowedInstagramUrl(item.sourcePageUrl)) {
      errors.push(`${record.id}/${item.id} has invalid Instagram source URL: ${item.sourcePageUrl}`);
    }
    if (item.source === 'instagram' && (item.mediaUrl || item.thumbnailUrl)) {
      errors.push(`${record.id}/${item.id} Instagram item must not store media URLs.`);
    }
    if (item.source === 'instagram' && !['officialEmbed', 'externalLink'].includes(item.displayMode)) {
      errors.push(`${record.id}/${item.id} Instagram displayMode must be officialEmbed or externalLink.`);
    }
    if (item.displayMode === 'remoteImage') {
      if (item.source !== 'officialWebsite' || item.mediaType !== 'image' || item.rightsStatus !== 'first_party_remote_reference') {
        errors.push(`${record.id}/${item.id} remoteImage must be an audited first-party website image.`);
      }
      if (!item.mediaUrl || !item.thumbnailUrl) {
        errors.push(`${record.id}/${item.id} remoteImage requires mediaUrl and thumbnailUrl.`);
      }
    }
    if (item.source === 'officialWebsite' && item.mediaUrl) {
      const auditRecord = audit.records.find((entry) => entry.recordId === record.id);
      const fetched = auditRecord?.pagesFetched?.some((page) => sameCanonical(page.url, item.sourcePageUrl));
      if (!fetched) errors.push(`${record.id}/${item.id} media item lacks fetched source page audit: ${item.sourcePageUrl}`);
    }
    if (!Array.isArray(item.styleTags)) errors.push(`${record.id}/${item.id} styleTags must be an array.`);
    if (typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) {
      errors.push(`${record.id}/${item.id} confidence must be a number from 0 to 1.`);
    }
  }
}

const localMediaFiles = await findLocalMediaFiles(dbDir);
if (localMediaFiles.length) {
  errors.push(`Local cached portfolio media files are not allowed: ${localMediaFiles.join(', ')}`);
}

if (!audit.metrics || audit.metrics.totalRecords !== records.length) {
  errors.push('portfolio-audit.json missing matching metrics.');
}

if (!Array.isArray(rejections.rejections)) {
  errors.push('portfolio-rejections.json missing rejections array.');
}

const summary = summarize(records, audit, rejections);
if (errors.length) {
  console.error(JSON.stringify({ status: 'failed', errors, summary }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: 'ok', summary }, null, 2));

function isHttps(rawUrl) {
  try {
    return new URL(rawUrl).protocol === 'https:';
  } catch {
    return false;
  }
}

function containsBlockedMediaHost(rawUrl) {
  if (!rawUrl) return false;
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
    return ['cdninstagram.com', 'fbcdn.net'].some((blocked) => host.includes(blocked));
  } catch {
    return false;
  }
}

function isAllowedInstagramUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    if (host !== 'instagram.com') return false;
    if (parts.length === 1) return !['p', 'reel', 'tv', 'stories', 'explore', 'accounts'].includes(parts[0].toLowerCase());
    return parts.length >= 2 && ['p', 'reel', 'tv'].includes(parts[0]);
  } catch {
    return false;
  }
}

function sameCanonical(left, right) {
  try {
    const a = new URL(left);
    const b = new URL(right);
    a.hash = '';
    b.hash = '';
    return a.toString().replace(/\/$/, '') === b.toString().replace(/\/$/, '');
  } catch {
    return false;
  }
}

async function findLocalMediaFiles(root) {
  const found = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (['.http-cache', 'original-src'].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      if (entry.isFile() && /\.(avif|gif|jpe?g|png|webp)$/i.test(entry.name)) {
        found.push(path.relative(root, fullPath));
      }
    }
  }
  await walk(root);
  return found;
}

function summarize(records, auditPayload, rejectionPayload) {
  const totals = {
    records: records.length,
    recordsWithPortfolioItems: records.filter((record) => (record.portfolioItems || []).length > 0).length,
    portfolioItems: records.reduce((sum, record) => sum + (record.portfolioItems || []).length, 0),
    directWebsiteImages: records.reduce((sum, record) => sum + (record.portfolioItems || []).filter((item) => item.source === 'officialWebsite' && item.mediaUrl).length, 0),
    instagramItems: records.reduce((sum, record) => sum + (record.portfolioItems || []).filter((item) => item.source === 'instagram').length, 0),
    blockedSources: rejectionPayload.rejections.filter((item) => ['robots-disallowed', 'social-crawl-skipped'].includes(item.reason)).length,
    rejectedUrls: rejectionPayload.rejections.length,
    auditRecords: auditPayload.records.length,
  };
  return totals;
}

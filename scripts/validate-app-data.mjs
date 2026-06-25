import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const records = JSON.parse(await readFile('scraped-database/records.json', 'utf8'));
const scrapedRaw = await readFile('scraped-database/records.json', 'utf8');
const appRaw = await readFile('src/data/records.json', 'utf8');
const sourceIds = new Set(records.map((record) => record.id));
const errors = [];
const warnings = [];

if (hash(scrapedRaw) !== hash(appRaw)) {
  errors.push('src/data/records.json must hash-match scraped-database/records.json. Run npm run sync:data.');
}

if (records.length < 471) errors.push(`Expected at least 471 records, found ${records.length}.`);
if (sourceIds.size !== records.length) errors.push('Record IDs must be unique.');

for (const record of records) {
  if (!/^[a-z0-9-]+$/.test(record.id)) errors.push(`${record.id}: invalid id format.`);
  if (!['artist', 'studio'].includes(record.kind)) errors.push(`${record.id}: invalid kind.`);
  if (typeof record.lat !== 'number' || record.lat < 36.8 || record.lat > 39.2) errors.push(`${record.id}: latitude outside Bay Area bounds.`);
  if (typeof record.lng !== 'number' || record.lng < -123.4 || record.lng > -120.8) errors.push(`${record.id}: longitude outside Bay Area bounds.`);
  if (!Array.isArray(record.sourceRefs) || record.sourceRefs.length === 0) errors.push(`${record.id}: missing sourceRefs.`);
  if (!Array.isArray(record.portfolioItems)) errors.push(`${record.id}: missing portfolioItems array.`);

  for (const item of record.portfolioItems || []) {
    if (!item.sourcePageUrl?.startsWith('https://')) errors.push(`${record.id}/${item.id}: sourcePageUrl must be HTTPS.`);
    for (const url of [item.sourcePageUrl, item.mediaUrl, item.thumbnailUrl].filter(Boolean)) {
      if (/cdninstagram\.com|fbcdn\.net/i.test(url)) errors.push(`${record.id}/${item.id}: blocked copied social media URL.`);
    }
    if (item.source === 'instagram' && !/^https:\/\/www\.instagram\.com\/([A-Za-z0-9._]+\/?|(?:p|reel|tv)\/[^/]+\/?)/.test(item.sourcePageUrl)) {
      errors.push(`${record.id}/${item.id}: invalid Instagram URL.`);
    }
    if (item.source === 'instagram' && (item.mediaUrl || item.thumbnailUrl)) {
      errors.push(`${record.id}/${item.id}: Instagram items must not store media URLs.`);
    }
    if (item.source === 'instagram' && !['officialEmbed', 'externalLink'].includes(item.displayMode)) {
      errors.push(`${record.id}/${item.id}: Instagram displayMode must be officialEmbed or externalLink.`);
    }
    if (item.displayMode === 'remoteImage') {
      if (item.source !== 'officialWebsite' || item.mediaType !== 'image' || item.rightsStatus !== 'first_party_remote_reference') {
        errors.push(`${record.id}/${item.id}: remoteImage must be an audited first-party website image.`);
      }
      if (!item.mediaUrl || !item.thumbnailUrl) {
        errors.push(`${record.id}/${item.id}: remoteImage requires mediaUrl and thumbnailUrl.`);
      }
    }
    if (/logo|headshot|merch|supplies|banner|screenshot|fortune|piercing/i.test(`${item.title} ${item.alt} ${item.mediaUrl || ''}`)) {
      warnings.push(`${record.id}/${item.id}: portfolio relevance review recommended.`);
    }
  }
}

if (errors.length) {
  console.error(JSON.stringify({ status: 'failed', errors: errors.slice(0, 60), count: errors.length }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'ok',
  totalRecords: records.length,
  recordsWithPortfolioItems: records.filter((record) => record.portfolioItems.length > 0).length,
  portfolioItems: records.reduce((sum, record) => sum + record.portfolioItems.length, 0),
  warnings: warnings.slice(0, 20),
  warningCount: warnings.length,
}, null, 2));

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

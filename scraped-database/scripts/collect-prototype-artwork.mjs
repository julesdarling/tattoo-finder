import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(dbDir, '..');
const cacheDir = path.join(dbDir, '.http-cache');
const recordsPath = path.join(dbDir, 'records.json');
const outputPath = path.join(rootDir, 'public', 'prototype-artwork.json');

const COLLECTED_AT = new Date().toISOString().slice(0, 10);
const USER_AGENT = 'TattooFinderPrototype/1.0 (+https://github.com/julesdarling/tattoo-finder)';
const MAX_IMAGES_PER_RECORD = Number(process.env.PROTOTYPE_MAX_IMAGES_PER_RECORD || 12);
const MIN_IMAGES_PER_RECORD = Number(process.env.PROTOTYPE_MIN_IMAGES_PER_RECORD || 6);
const MAX_PAGES_PER_RECORD = Number(process.env.PROTOTYPE_MAX_PAGES_PER_RECORD || 10);
const REQUEST_DELAY_MS = Number(process.env.PROTOTYPE_REQUEST_DELAY_MS || 750);
const FETCH_TIMEOUT_MS = Number(process.env.PROTOTYPE_FETCH_TIMEOUT_MS || 12000);

const discoveryHosts = new Set(['openstreetmap.org', 'www.openstreetmap.org', 'data.sccgov.org']);
const socialHosts = new Set(['instagram.com', 'www.instagram.com', 'facebook.com', 'www.facebook.com', 'm.facebook.com']);
const blockedMediaHosts = ['instagram.com', 'cdninstagram.com', 'fbcdn.net'];
const imageExtensions = /\.(avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i;
const sourcePageMarkers = ['artist', 'artists', 'blackwork', 'flash', 'gallery', 'portfolio', 'tattoo', 'tattoos', 'work', 'works'];
const weakPrototypeRecordIds = new Set([
  'osm-node-4077146724-art-of-the-heart-tattoo',
  'osm-node-343610950-ritual-tattoo',
  'osm-node-8922987573-royal-peacock-tattoo-parlor',
  'osm-node-13480944124-temple-tattoo-13',
]);
const rejectMarkers = [
  'avatar',
  'badge',
  'brand',
  'captcha',
  'favicon',
  'faqimage',
  'footer',
  'golden',
  'headshot',
  'header',
  'hero',
  'halloween',
  'icon',
  'interior',
  'left-artists',
  'logo',
  'map',
  'mask-group',
  'media.jpg',
  'merch',
  'member',
  'overlay',
  'piercing',
  'placeholder',
  'poster',
  'profile',
  'removebg',
  'right-artists',
  'sale',
  'screen shot',
  'screen+shot',
  'screen_shot',
  'screenshot',
  'shop',
  'snakeimg',
  'spacer',
  'sport',
  'sprite',
  'supplies',
  'summer',
  'transparent',
  'woman-boxer',
];

const lastRequestByHost = new Map();
const robotsByOrigin = new Map();

await mkdir(cacheDir, { recursive: true });
const records = JSON.parse(await readFile(recordsPath, 'utf8'));
const output = {};
const summary = {
  recordsScanned: 0,
  recordsWithPrototypeArtwork: 0,
  images: 0,
  skippedWithoutEnoughImages: 0,
  skippedWeakPrototype: 0,
};

for (const record of records) {
  const startUrl = normalizedStartUrl(record.website);
  if (!startUrl) continue;
  summary.recordsScanned += 1;
  if (weakPrototypeRecordIds.has(record.id)) {
    summary.skippedWeakPrototype += 1;
    continue;
  }

  const items = await collectRecordArtwork(record, startUrl);
  if (items.length < MIN_IMAGES_PER_RECORD) {
    summary.skippedWithoutEnoughImages += 1;
    continue;
  }

  output[record.id] = items.slice(0, MAX_IMAGES_PER_RECORD);
  summary.recordsWithPrototypeArtwork += 1;
  summary.images += output[record.id].length;
}

await writeJson(outputPath, {
  generatedAt: COLLECTED_AT,
  mode: 'local-prototype',
  note: 'Local prototype artwork. Remote first-party URLs only; permission required before public publishing.',
  summary,
  records: output,
});

console.log(JSON.stringify(summary, null, 2));

async function collectRecordArtwork(record, startUrl) {
  const items = [];
  const seen = new Set();

  for (const item of record.portfolioItems || []) {
    if (item.displayMode === 'remoteImage' && item.mediaUrl && !rejectImage(item.mediaUrl, `${item.title} ${item.alt}`)) {
      addItem(items, seen, record, item.sourcePageUrl, item.mediaUrl, item.title, item.alt);
    }
  }

  const queue = [{ url: startUrl, depth: 0 }];
  const queued = new Set([canonicalUrl(startUrl)]);
  const visited = new Set();

  while (queue.length && visited.size < MAX_PAGES_PER_RECORD && items.length < MAX_IMAGES_PER_RECORD) {
    const page = queue.shift();
    const key = canonicalUrl(page.url);
    if (visited.has(key)) continue;
    visited.add(key);

    const allowed = await robotsAllowed(page.url);
    if (!allowed) continue;
    const response = await fetchText(page.url);
    if (!response || !isHtml(response.contentType)) continue;

    const title = extractTitle(response.body) || record.name;
    const candidates = extractImageCandidates(response.body, response.finalUrl || page.url, record, title);
    for (const candidate of rankImages(candidates, response.finalUrl || page.url)) {
      if (items.length >= MAX_IMAGES_PER_RECORD) break;
      addItem(items, seen, record, response.finalUrl || page.url, candidate.url, candidate.title, candidate.alt);
    }

    if (page.depth >= 2) continue;
    for (const link of rankLinks(extractLinks(response.body, response.finalUrl || page.url))) {
      if (queue.length + visited.size >= MAX_PAGES_PER_RECORD) break;
      if (!isSameSite(startUrl, link.url)) continue;
      const linkKey = canonicalUrl(link.url);
      if (queued.has(linkKey) || visited.has(linkKey)) continue;
      queued.add(linkKey);
      queue.push({ url: link.url, depth: page.depth + 1 });
    }
  }

  return items;
}

function addItem(items, seen, record, sourcePageUrl, imageUrl, title, alt) {
  const imageKey = canonicalUrl(imageUrl);
  if (seen.has(imageKey) || rejectImage(imageUrl, `${title} ${alt}`)) return;
  seen.add(imageKey);
  items.push({
    id: stableId(`${record.id}|${sourcePageUrl}|${imageUrl}`),
    recordId: record.id,
    imageUrl,
    sourcePageUrl: canonicalUrl(sourcePageUrl),
    title: cleanText(title || `${record.name} artwork`).slice(0, 120),
    alt: cleanText(alt || `${record.name} tattoo artwork`).slice(0, 160),
    permissionStatus: 'needs_permission',
    collectedAt: COLLECTED_AT,
  });
}

function normalizedStartUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol === 'http:') url.protocol = 'https:';
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || discoveryHosts.has(host) || socialHosts.has(host)) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

async function robotsAllowed(targetUrl) {
  const url = new URL(targetUrl);
  if (!robotsByOrigin.has(url.origin)) {
    const response = await fetchText(`${url.origin}/robots.txt`, true);
    robotsByOrigin.set(url.origin, parseRobots(response?.body || '', response?.status || 0));
  }
  return robotsByOrigin.get(url.origin)(url.pathname || '/');
}

function parseRobots(body, status) {
  if (!body || status >= 400) return () => true;
  const rules = [];
  let applies = false;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (!key) continue;
    if (key.toLowerCase() === 'user-agent') applies = value === '*' || USER_AGENT.toLowerCase().startsWith(value.toLowerCase());
    if (applies && ['allow', 'disallow'].includes(key.toLowerCase())) rules.push({ type: key.toLowerCase(), path: value });
  }
  return (pathname) => {
    const matches = rules.filter((rule) => rule.path && pathname.startsWith(rule.path.replace(/\*.*$/, '')));
    if (!matches.length) return true;
    matches.sort((a, b) => b.path.length - a.path.length);
    return matches[0].type === 'allow';
  };
}

async function fetchText(url, robots = false) {
  const cachePath = path.join(cacheDir, `${stableId(url)}.json`);
  if (existsSync(cachePath)) {
    try {
      return JSON.parse(await readFile(cachePath, 'utf8'));
    } catch {
      // Refresh broken cache entries.
    }
  }

  await waitForHost(url);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: robots ? 'text/plain,*/*;q=0.8' : 'text/html,*/*;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const payload = {
      url,
      finalUrl: response.url,
      status: response.status,
      contentType: response.headers.get('content-type') || '',
      body: await response.text(),
    };
    await writeJson(cachePath, payload);
    return payload;
  } catch {
    return null;
  }
}

async function waitForHost(rawUrl) {
  const host = new URL(rawUrl).hostname;
  const last = lastRequestByHost.get(host) || 0;
  const elapsed = Date.now() - last;
  if (elapsed < REQUEST_DELAY_MS) await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
  lastRequestByHost.set(host, Date.now());
}

function extractLinks(html, pageUrl) {
  const links = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = parseAttrs(match[1]);
    const url = absoluteUrl(attrs.href, pageUrl);
    if (!url || isAssetUrl(url)) continue;
    const text = cleanText(match[2]);
    const signal = signalText(`${text} ${url}`);
    if (sourcePageMarkers.some((marker) => signal.includes(marker))) links.push({ url, text, signal });
  }
  return links;
}

function rankLinks(links) {
  return links
    .map((link) => ({
      ...link,
      score: sourcePageMarkers.reduce((sum, marker) => sum + (link.signal.includes(marker) ? 2 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
}

function extractImageCandidates(html, pageUrl, record, pageTitle) {
  const candidates = [];
  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = parseAttrs(match[1]);
    const urls = [attrs.src, attrs['data-src'], attrs['data-original'], firstSrcset(attrs.srcset || attrs['data-srcset'])].filter(Boolean);
    for (const rawUrl of urls) pushImageCandidate(candidates, rawUrl, pageUrl, record, pageTitle, `${attrs.alt || ''} ${attrs.title || ''} ${attrs.class || ''} ${attrs.id || ''}`, attrs);
  }
  for (const match of html.matchAll(/url\((['"]?)([^'")]+)\1\)/gi)) {
    pushImageCandidate(candidates, match[2], pageUrl, record, pageTitle, `${record.name} artwork`, {});
  }
  for (const match of html.matchAll(/"image"\s*:\s*"([^"]+)"/gi)) {
    pushImageCandidate(candidates, match[1].replace(/\\\//g, '/'), pageUrl, record, pageTitle, `${record.name} artwork`, {});
  }
  return candidates;
}

function pushImageCandidate(candidates, rawUrl, pageUrl, record, pageTitle, text, attrs) {
  const url = absoluteUrl(rawUrl, pageUrl);
  if (!url || rejectImage(url, text)) return;
  candidates.push({
    url,
    title: cleanText(text || pageTitle || `${record.name} artwork`),
    alt: cleanText(text || `${record.name} tattoo artwork`),
    signal: signalText(`${text} ${url} ${pageTitle}`),
    width: Number(attrs.width || 0),
    height: Number(attrs.height || 0),
  });
}

function rankImages(images, pageUrl) {
  return images
    .map((image) => {
      const signal = `${image.signal} ${signalText(pageUrl)}`;
      let score = 0;
      if (imageExtensions.test(image.url)) score += 3;
      if (/uploads|images|gallery|portfolio|artist|tattoo|work|wp-content|cdn/i.test(image.url)) score += 3;
      if (sourcePageMarkers.some((marker) => signal.includes(marker))) score += 4;
      if (image.width >= 250 || image.height >= 250) score += 2;
      if ((image.width > 0 && image.width < 160) || (image.height > 0 && image.height < 160)) score -= 6;
      return { ...image, score };
    })
    .filter((image) => image.score >= 4)
    .sort((a, b) => b.score - a.score);
}

function rejectImage(rawUrl, text = '') {
  if (!rawUrl || !imageExtensions.test(rawUrl)) return true;
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (blockedMediaHosts.some((blocked) => host.includes(blocked))) return true;
    const decodedPath = decodeURIComponent(url.pathname);
    const signal = signalText(`${text} ${url.pathname} ${decodedPath}`);
    return rejectMarkers.some((marker) => signal.includes(marker));
  } catch {
    return true;
  }
}

function absoluteUrl(rawUrl, pageUrl) {
  if (!rawUrl) return null;
  const cleaned = decodeEntities(rawUrl.trim());
  if (!cleaned || cleaned.startsWith('data:') || cleaned.startsWith('blob:') || cleaned.startsWith('mailto:') || cleaned.startsWith('tel:')) return null;
  try {
    const url = new URL(cleaned, pageUrl);
    if (url.protocol === 'http:') url.protocol = 'https:';
    if (url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function parseAttrs(rawAttrs) {
  const attrs = {};
  for (const match of rawAttrs.matchAll(/([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] || match[3] || match[4] || '');
  }
  return attrs;
}

function firstSrcset(srcset) {
  if (!srcset) return '';
  return srcset.split(',')[0]?.trim().split(/\s+/)[0] || '';
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(match[1]) : '';
}

function isSameSite(left, right) {
  return stripWww(new URL(left).hostname) === stripWww(new URL(right).hostname);
}

function canonicalUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString().replace(/\/$/, '/');
}

function isAssetUrl(rawUrl) {
  return /\.(css|js|json|pdf|zip|mp4|mov|webm|svg|ico)(?:[?#].*)?$/i.test(rawUrl);
}

function isHtml(contentType) {
  return !contentType || contentType.includes('text/html') || contentType.includes('application/xhtml');
}

function cleanText(value) {
  return decodeEntities(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function signalText(value) {
  return cleanText(value).toLowerCase();
}

function stripWww(hostname) {
  return hostname.replace(/^www\./, '').toLowerCase();
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stableId(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

async function writeJson(filePath, payload) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

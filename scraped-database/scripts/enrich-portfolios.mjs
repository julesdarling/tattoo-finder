import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, '..');
const recordsPath = path.join(dbDir, 'records.json');
const metadataPath = path.join(dbDir, 'data-metadata.json');
const auditPath = path.join(dbDir, 'portfolio-audit.json');
const rejectionsPath = path.join(dbDir, 'portfolio-rejections.json');
const cacheDir = path.join(dbDir, '.http-cache');

const COLLECTED_AT = new Date().toISOString().slice(0, 10);
const USER_AGENT = 'TattooFinderBot/1.0 (+https://github.com/julesdarling/tattoo-finder)';
const MAX_ITEMS_PER_RECORD = Number(process.env.PORTFOLIO_ITEMS_PER_RECORD || 6);
const MIN_REQUEST_INTERVAL_MS = Number(process.env.PORTFOLIO_REQUEST_DELAY_MS || 900);
const MAX_PAGES_PER_RECORD = Number(process.env.PORTFOLIO_MAX_PAGES_PER_RECORD || 12);
const FETCH_TIMEOUT_MS = Number(process.env.PORTFOLIO_FETCH_TIMEOUT_MS || 12000);

const discoveryHosts = new Set(['openstreetmap.org', 'www.openstreetmap.org', 'data.sccgov.org']);
const socialHosts = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'instagram.com',
  'www.instagram.com',
]);
const blockedMediaHosts = ['instagram.com', 'cdninstagram.com', 'fbcdn.net'];
const imageExtensions = /\.(avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i;
const skipImageMarkers = [
  'avatar',
  'badge',
  'brand',
  'captcha',
  'favicon',
  'footer',
  'header',
  'icon',
  'logo',
  'map',
  'placeholder',
  'profile',
  'spacer',
  'sprite',
  'transparent',
];
const portfolioMarkers = [
  'artist',
  'artists',
  'blackwork',
  'book',
  'booking',
  'flash',
  'gallery',
  'portfolio',
  'portfolios',
  'tattoo',
  'tattoos',
  'work',
  'works',
];
const styleMarkers = [
  'blackwork',
  'color',
  'custom',
  'fine line',
  'flash',
  'geometric',
  'illustrative',
  'japanese',
  'lettering',
  'linework',
  'neo traditional',
  'realism',
  'traditional',
];

const lastRequestByHost = new Map();
const robotsByOrigin = new Map();
let duplicateRemovals = 0;

async function main() {
  await mkdir(cacheDir, { recursive: true });
  const records = JSON.parse(await readFile(recordsPath, 'utf8'));
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  const audit = [];
  const rejections = [];

  const enrichedRecords = [];
  for (const record of records) {
    const working = { ...record };
    const recordAudit = {
      recordId: record.id,
      name: record.name,
      website: record.website,
      candidateUrls: [],
      pagesFetched: [],
      itemsAccepted: 0,
      decisions: [],
    };

    try {
      const result = await enrichRecord(working, recordAudit, rejections);
      working.portfolioItems = result.items;
      if (result.instagram && !working.instagram) {
        working.instagram = result.instagram;
      }
      recordAudit.itemsAccepted = result.items.length;
    } catch (error) {
      working.portfolioItems = [];
      reject(rejections, record, record.website, 'record-enrichment-error', error.message);
      recordAudit.decisions.push(`failed: ${error.message}`);
    }

    audit.push(recordAudit);
    enrichedRecords.push(working);
  }

  const metrics = summarize(enrichedRecords, audit, rejections);
  const nextMetadata = {
    ...metadata,
    portfolioEnrichedAt: COLLECTED_AT,
    portfolioEnrichment: metrics,
  };

  await writeJson(recordsPath, enrichedRecords);
  await writeJson(metadataPath, nextMetadata);
  await writeJson(auditPath, { generatedAt: COLLECTED_AT, metrics, records: audit });
  await writeJson(rejectionsPath, { generatedAt: COLLECTED_AT, count: rejections.length, rejections });

  console.log(JSON.stringify(metrics, null, 2));
}

async function enrichRecord(record, recordAudit, rejections) {
  const items = [];
  const seenItemUrls = new Set();
  let discoveredInstagram = normalizeInstagramProfile(record.instagram);

  const startUrl = normalizedStartUrl(record.website);
  if (!startUrl) {
    recordAudit.decisions.push('no crawlable official website');
    return { items, instagram: discoveredInstagram };
  }

  if (isInstagramUrl(startUrl)) {
    const normalized = normalizeInstagramProfile(startUrl);
    if (normalized) {
      discoveredInstagram = normalized;
      addItem(items, seenItemUrls, instagramProfileItem(record, normalized));
      recordAudit.decisions.push('stored official Instagram profile link without crawling Instagram');
    } else {
      reject(rejections, record, startUrl, 'instagram-url-not-profile-or-post', 'Only public profile/post/reel/tv URLs are stored.');
    }
    return { items, instagram: discoveredInstagram };
  }

  if (isSocialUrl(startUrl)) {
    reject(rejections, record, startUrl, 'social-crawl-skipped', 'Social pages are not fetched by the portfolio enrichment crawler.');
    recordAudit.decisions.push('skipped social-only website');
    return { items, instagram: discoveredInstagram };
  }

  const crawlQueue = [{ url: startUrl, depth: 0, reason: 'official website' }];
  const queued = new Set([canonicalPageUrl(startUrl)]);
  const visited = new Set();

  while (crawlQueue.length > 0 && visited.size < MAX_PAGES_PER_RECORD && items.length < MAX_ITEMS_PER_RECORD) {
    const current = crawlQueue.shift();
    const normalizedCurrent = canonicalPageUrl(current.url);
    if (visited.has(normalizedCurrent)) continue;
    visited.add(normalizedCurrent);

    recordAudit.candidateUrls.push({ url: current.url, depth: current.depth, reason: current.reason });

    const allowed = await robotsAllowed(current.url, record, rejections);
    if (!allowed.allowed) {
      reject(rejections, record, current.url, 'robots-disallowed', allowed.reason);
      recordAudit.decisions.push(`robots blocked ${current.url}`);
      continue;
    }

    const response = await fetchText(current.url, record, rejections);
    if (!response || !isHtml(response.contentType)) continue;
    recordAudit.pagesFetched.push({
      url: response.finalUrl || current.url,
      status: response.status,
      bytes: response.body.length,
      cache: response.cache,
    });

    const pageUrl = response.finalUrl || current.url;
    const pageTitle = extractTitle(response.body) || record.name;
    const pageSignals = signalText(`${pageTitle} ${pageUrl}`);

    for (const instagramUrl of extractInstagramUrls(response.body, pageUrl)) {
      if (isOfficialInstagramPostUrl(instagramUrl)) {
        addItem(items, seenItemUrls, instagramPostItem(record, instagramUrl));
      } else {
        const normalized = normalizeInstagramProfile(instagramUrl);
        if (normalized) {
          discoveredInstagram ||= normalized;
          addItem(items, seenItemUrls, instagramProfileItem(record, normalized));
        } else {
          reject(rejections, record, instagramUrl, 'invalid-instagram-url', 'Instagram URL was neither a profile nor public post/reel/tv URL.');
        }
      }
    }

    const images = extractImageCandidates(response.body, pageUrl, record, pageTitle);
    for (const image of rankImages(images, pageSignals)) {
      if (items.length >= MAX_ITEMS_PER_RECORD) break;
      const item = websiteImageItem(record, pageUrl, image, pageSignals);
      if (!item) {
        reject(rejections, record, image.url, 'invalid-website-image', 'Image candidate failed first-party media URL checks.');
        continue;
      }
      addItem(items, seenItemUrls, item);
    }

    if (current.depth < 2) {
      for (const link of rankLinks(extractLinks(response.body, pageUrl), record, pageSignals)) {
        if (crawlQueue.length + visited.size >= MAX_PAGES_PER_RECORD) break;
        if (!isSameSite(pageUrl, link.url)) continue;
        if (!isHttps(link.url)) continue;
        const key = canonicalPageUrl(link.url);
        if (queued.has(key) || visited.has(key)) continue;
        queued.add(key);
        crawlQueue.push({ url: link.url, depth: current.depth + 1, reason: link.reason });
      }
    }
  }

  if (items.length === 0 && discoveredInstagram) {
    addItem(items, seenItemUrls, instagramProfileItem(record, discoveredInstagram));
  }

  return { items: items.slice(0, MAX_ITEMS_PER_RECORD), instagram: discoveredInstagram };
}

function normalizedStartUrl(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (discoveryHosts.has(url.hostname.toLowerCase())) return null;
  if (url.protocol === 'http:') url.protocol = 'https:';
  if (url.protocol !== 'https:') return null;
  url.hash = '';
  return url.toString();
}

async function robotsAllowed(targetUrl, record, rejections) {
  const url = new URL(targetUrl);
  const origin = url.origin;
  if (!robotsByOrigin.has(origin)) {
    const robotsUrl = `${origin}/robots.txt`;
    const response = await fetchText(robotsUrl, record, rejections, { robots: true });
    robotsByOrigin.set(origin, parseRobots(response?.body || '', response?.status || 0));
  }
  const robots = robotsByOrigin.get(origin);
  return robots.canFetch(url.pathname || '/');
}

function parseRobots(body, status) {
  if (!body || status >= 400) {
    return { canFetch: () => ({ allowed: true, reason: status ? `robots status ${status}` : 'robots unavailable' }) };
  }

  const groups = [];
  let currentAgents = [];
  let currentRules = [];
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();

    if (key === 'user-agent') {
      if (currentAgents.length && currentRules.length) groups.push({ agents: currentAgents, rules: currentRules });
      if (currentRules.length) currentRules = [];
      currentAgents = [value.toLowerCase()];
    } else if ((key === 'allow' || key === 'disallow') && currentAgents.length) {
      currentRules.push({ type: key, path: value });
    }
  }
  if (currentAgents.length && currentRules.length) groups.push({ agents: currentAgents, rules: currentRules });

  return {
    canFetch(pathname) {
      const matchingGroups = groups.filter((group) => {
        return group.agents.some((agent) => agent === '*' || USER_AGENT.toLowerCase().startsWith(agent));
      });
      const rules = matchingGroups.flatMap((group) => group.rules).filter((rule) => rule.path !== '');
      let winner = null;
      for (const rule of rules) {
        const rulePath = rule.path.replace(/\*.*$/, '');
        if (pathname.startsWith(rulePath) && (!winner || rule.path.length > winner.path.length)) {
          winner = rule;
        }
      }
      if (!winner) return { allowed: true, reason: 'no matching robots rule' };
      return { allowed: winner.type === 'allow', reason: `${winner.type}: ${winner.path}` };
    },
  };
}

async function fetchText(url, record, rejections, options = {}) {
  const key = cacheKey(url);
  const cachePath = path.join(cacheDir, `${key}.json`);
  if (existsSync(cachePath)) {
    try {
      return { ...JSON.parse(await readFile(cachePath, 'utf8')), cache: 'hit' };
    } catch {
      // Fall through and refresh broken cache entries.
    }
  }

  await waitForHost(url);
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: options.robots ? 'text/plain,*/*;q=0.8' : 'text/html,*/*;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();
    const payload = {
      url,
      finalUrl: response.url,
      status: response.status,
      contentType,
      fetchedAt: new Date().toISOString(),
      body,
    };
    await writeJson(cachePath, payload);
    if (!response.ok && !options.robots) {
      reject(rejections, record, url, 'fetch-status', `HTTP ${response.status}`);
    }
    return { ...payload, cache: 'miss' };
  } catch (error) {
    reject(rejections, record, url, 'fetch-error', error.message);
    return null;
  }
}

async function waitForHost(rawUrl) {
  const host = new URL(rawUrl).hostname;
  const last = lastRequestByHost.get(host) || 0;
  const elapsed = Date.now() - last;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestByHost.set(host, Date.now());
}

function extractLinks(html, pageUrl) {
  const links = [];
  const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html))) {
    const attrs = parseAttrs(match[1]);
    const href = attrs.href;
    if (!href) continue;
    const url = absoluteUrl(href, pageUrl);
    if (!url || isAssetUrl(url)) continue;
    const text = cleanText(match[2]);
    const signal = signalText(`${text} ${url}`);
    const hasPortfolioMarker = portfolioMarkers.some((marker) => signal.includes(marker));
    if (!hasPortfolioMarker) continue;
    links.push({ url, text, reason: text || 'portfolio-like URL' });
  }
  return links;
}

function rankLinks(links, record, pageSignals) {
  return links
    .map((link) => {
      const signal = signalText(`${link.text} ${link.url}`);
      let score = 0;
      for (const marker of portfolioMarkers) if (signal.includes(marker)) score += 3;
      if (signal.includes('artist')) score += 2;
      if (signal.includes('portfolio') || signal.includes('gallery')) score += 3;
      if (signal.includes(signalText(record.name))) score += 1;
      if (pageSignals.includes('tattoo')) score += 1;
      return { ...link, score };
    })
    .sort((a, b) => b.score - a.score);
}

function extractImageCandidates(html, pageUrl, record, pageTitle) {
  const images = [];
  const imageRegex = /<img\b([^>]*)>/gi;
  let match;
  while ((match = imageRegex.exec(html))) {
    const attrs = parseAttrs(match[1]);
    const rawSrc = attrs.src || attrs['data-src'] || attrs['data-original'] || firstSrcset(attrs.srcset || attrs['data-srcset']);
    const url = absoluteUrl(rawSrc, pageUrl);
    if (!url) continue;
    const alt = cleanText(attrs.alt || attrs.title || `${record.name} portfolio work`);
    const classSignal = signalText(`${attrs.class || ''} ${attrs.id || ''} ${attrs.loading || ''}`);
    const urlSignal = signalText(url);
    images.push({
      url,
      alt,
      title: alt || pageTitle || record.name,
      signal: signalText(`${alt} ${urlSignal} ${classSignal} ${pageTitle}`),
      width: Number(attrs.width || 0),
      height: Number(attrs.height || 0),
    });
  }
  return images;
}

function rankImages(images, pageSignals) {
  return images
    .map((image) => {
      let score = 0;
      const signal = `${image.signal} ${pageSignals}`;
      if (imageExtensions.test(image.url)) score += 2;
      for (const marker of portfolioMarkers) if (signal.includes(marker)) score += 2;
      for (const marker of styleMarkers) if (signal.includes(marker)) score += 1;
      if (image.width >= 250 || image.height >= 250) score += 1;
      if (image.width > 0 && image.width < 120) score -= 4;
      if (image.height > 0 && image.height < 120) score -= 4;
      if (skipImageMarkers.some((marker) => signal.includes(marker))) score -= 6;
      if (/(\b\d{3,5}x\d{3,5}\b|uploads|images|portfolio|gallery|artists|tattoo)/i.test(image.url)) score += 2;
      return { ...image, score };
    })
    .filter((image) => image.score >= 3)
    .sort((a, b) => b.score - a.score);
}

function websiteImageItem(record, pageUrl, image, pageSignals) {
  if (!isHttps(pageUrl) || !isHttps(image.url)) return null;
  if (isBlockedMediaHost(image.url)) return null;
  if (!isProbablyImageUrl(image.url)) return null;

  const title = image.title || `${record.name} portfolio work`;
  const styleTags = inferStyleTags(`${title} ${image.url} ${pageSignals}`, record.styles);
  return {
    id: stableId(`${record.id}|${pageUrl}|${image.url}`),
    source: 'officialWebsite',
    sourcePageUrl: canonicalPageUrl(pageUrl),
    mediaType: 'image',
    displayMode: 'remoteImage',
    title: title.slice(0, 120),
    alt: (image.alt || `${record.name} tattoo portfolio image`).slice(0, 160),
    styleTags,
    collectedAt: COLLECTED_AT,
    rightsStatus: 'first_party_remote_reference',
    confidence: confidenceForWebsiteImage(pageUrl, image, pageSignals),
    mediaUrl: image.url,
    thumbnailUrl: image.url,
  };
}

function instagramPostItem(record, instagramUrl) {
  return {
    id: stableId(`${record.id}|${instagramUrl}`),
    source: 'instagram',
    sourcePageUrl: canonicalPageUrl(instagramUrl),
    mediaType: 'instagramPost',
    displayMode: 'officialEmbed',
    title: `${record.name} Instagram portfolio post`,
    alt: `${record.name} tattoo work on Instagram`,
    styleTags: inferStyleTags(record.styles.join(' '), record.styles),
    collectedAt: COLLECTED_AT,
    rightsStatus: 'official_embed_link_only',
    confidence: 0.78,
  };
}

function instagramProfileItem(record, instagramUrl) {
  return {
    id: stableId(`${record.id}|${instagramUrl}`),
    source: 'instagram',
    sourcePageUrl: canonicalPageUrl(instagramUrl),
    mediaType: 'instagramProfile',
    displayMode: 'externalLink',
    title: `${record.name} Instagram portfolio`,
    alt: `${record.name} official Instagram portfolio profile`,
    styleTags: inferStyleTags(record.styles.join(' '), record.styles),
    collectedAt: COLLECTED_AT,
    rightsStatus: 'official_profile_link_only',
    confidence: 0.58,
  };
}

function addItem(items, seenItemUrls, item) {
  if (!item) return false;
  const key = item.mediaUrl ? `${item.source}|${canonicalPageUrl(item.mediaUrl)}` : `${item.source}|${canonicalPageUrl(item.sourcePageUrl)}`;
  if (seenItemUrls.has(key)) {
    duplicateRemovals += 1;
    return false;
  }
  seenItemUrls.add(key);
  items.push(item);
  return true;
}

function extractInstagramUrls(html, pageUrl) {
  const urls = new Set();
  const hrefRegex = /href\s*=\s*["']([^"']*instagram\.com[^"']*)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html))) {
    const url = absoluteUrl(match[1], pageUrl);
    if (url && isInstagramUrl(url)) urls.add(canonicalPageUrl(url));
  }
  return [...urls];
}

function parseAttrs(rawAttrs) {
  const attrs = {};
  const attrRegex = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = attrRegex.exec(rawAttrs))) {
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

function absoluteUrl(rawUrl, pageUrl) {
  if (!rawUrl) return null;
  const cleaned = decodeEntities(rawUrl.trim());
  if (!cleaned || cleaned.startsWith('data:') || cleaned.startsWith('blob:') || cleaned.startsWith('mailto:') || cleaned.startsWith('tel:')) {
    return null;
  }
  try {
    const url = new URL(cleaned, pageUrl);
    url.hash = '';
    if (url.protocol === 'http:') url.protocol = 'https:';
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function canonicalPageUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString().replace(/\/$/, '/');
}

function normalizeInstagramProfile(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  const reserved = new Set(['p', 'reel', 'tv', 'stories', 'explore', 'accounts']);
  if (host !== 'instagram.com' || parts.length !== 1 || reserved.has(parts[0].toLowerCase())) return null;
  return `https://www.instagram.com/${parts[0]}/`;
}

function isOfficialInstagramPostUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    return host === 'instagram.com' && parts.length >= 2 && ['p', 'reel', 'tv'].includes(parts[0]);
  } catch {
    return false;
  }
}

function isInstagramUrl(rawUrl) {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase() === 'instagram.com';
  } catch {
    return false;
  }
}

function isSocialUrl(rawUrl) {
  try {
    return socialHosts.has(new URL(rawUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isSameSite(left, right) {
  const a = new URL(left);
  const b = new URL(right);
  return stripWww(a.hostname) === stripWww(b.hostname);
}

function isHtml(contentType) {
  return !contentType || contentType.includes('text/html') || contentType.includes('application/xhtml');
}

function isHttps(rawUrl) {
  try {
    return new URL(rawUrl).protocol === 'https:';
  } catch {
    return false;
  }
}

function isAssetUrl(rawUrl) {
  return /\.(css|js|json|pdf|zip|mp4|mov|mp3|xml)(?:[?#].*)?$/i.test(rawUrl);
}

function isBlockedMediaHost(rawUrl) {
  const host = new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
  return blockedMediaHosts.some((blocked) => host.includes(blocked));
}

function isProbablyImageUrl(rawUrl) {
  if (imageExtensions.test(rawUrl)) return true;
  const url = new URL(rawUrl);
  return /image|img|photo|upload|cdn|media|portfolio|gallery|tattoo/i.test(`${url.hostname}${url.pathname}`);
}

function confidenceForWebsiteImage(pageUrl, image, pageSignals) {
  let confidence = 0.56;
  const signal = `${pageSignals} ${image.signal}`;
  if (signal.includes('portfolio') || signal.includes('gallery')) confidence += 0.12;
  if (signal.includes('tattoo')) confidence += 0.08;
  if (signal.includes('artist')) confidence += 0.05;
  if (image.alt && !/portfolio work$/i.test(image.alt)) confidence += 0.04;
  return Number(Math.min(confidence, 0.86).toFixed(2));
}

function inferStyleTags(text, recordStyles = []) {
  const signal = signalText(Array.isArray(text) ? text.join(' ') : text);
  const tags = [];
  for (const marker of styleMarkers) {
    if (signal.includes(marker)) tags.push(toTitle(marker));
  }
  for (const style of recordStyles) {
    if (tags.length >= 4) break;
    if (!/studio|custom tattooing/i.test(style) && !tags.some((tag) => tag.toLowerCase() === style.toLowerCase())) {
      tags.push(style);
    }
  }
  return tags.slice(0, 4);
}

function signalText(value) {
  return decodeEntities(String(value || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function cleanText(value) {
  return decodeEntities(String(value || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stableId(value) {
  return createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function cacheKey(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stripWww(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function toTitle(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reject(rejections, record, url, reason, details) {
  rejections.push({
    recordId: record?.id || null,
    name: record?.name || null,
    url,
    reason,
    details,
  });
}

function summarize(records, audit, rejections) {
  const metrics = {
    totalRecords: records.length,
    recordsWithPortfolioItems: 0,
    totalPortfolioItems: 0,
    directWebsiteImages: 0,
    instagramProfileLinks: 0,
    instagramPostLinks: 0,
    enrichedOfficialCandidates: 0,
    recordsStillNeedingManualVerification: 0,
    blockedSources: rejections.filter((item) => ['robots-disallowed', 'social-crawl-skipped'].includes(item.reason)).length,
    duplicateRemovals,
    brokenOrRejectedUrls: rejections.length,
    bySource: {},
  };

  for (const record of records) {
    const items = record.portfolioItems || [];
    if (items.length) metrics.recordsWithPortfolioItems += 1;
    metrics.totalPortfolioItems += items.length;
    if (items.length === 0) metrics.recordsStillNeedingManualVerification += 1;
    for (const item of items) {
      metrics.bySource[item.source] = (metrics.bySource[item.source] || 0) + 1;
      if (item.source === 'officialWebsite' && item.mediaType === 'image') metrics.directWebsiteImages += 1;
      if (item.mediaType === 'instagramProfile') metrics.instagramProfileLinks += 1;
      if (item.mediaType === 'instagramPost') metrics.instagramPostLinks += 1;
    }
  }
  metrics.enrichedOfficialCandidates = audit.filter((item) => item.itemsAccepted > 0).length;
  return metrics;
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { z } from 'zod';

export const BayRegionSchema = z.enum(['SF', 'East Bay', 'North Bay', 'Peninsula', 'South Bay']);
export const BookingStatusSchema = z.enum(['open', 'waitlist', 'closed', 'unknown']);

const InstagramProfileUrlSchema = z.string().url().refine((value) => isInstagramProfileUrl(value), {
  message: 'Instagram profile must be a public profile URL.',
});

const InstagramPostUrlSchema = z.string().url().refine((value) => isOfficialInstagramPostUrl(value), {
  message: 'Instagram posts must use public post, reel, or tv URLs.',
});

export const SourceRefSchema = z.object({
  label: z.string().min(2),
  url: z.string().url(),
  type: z.enum(['official', 'website', 'directory', 'osm', 'permit', 'manual']),
});

export const PortfolioImageSchema = z.object({
  id: z.string().min(2),
  alt: z.string().min(8),
  tone: z.enum(['linework', 'flash', 'studio', 'lettering', 'color', 'blackwork']),
  url: z.string().url().optional(),
});

export const PortfolioItemSchema = z
  .object({
    id: z.string().min(2),
    source: z.enum(['officialWebsite', 'instagram']),
    sourcePageUrl: z.string().url(),
    mediaType: z.enum(['image', 'instagramProfile', 'instagramPost']),
    displayMode: z.enum(['remoteImage', 'officialEmbed', 'externalLink']),
    title: z.string().min(2),
    alt: z.string().min(2),
    styleTags: z.array(z.string()).default([]),
    collectedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    rightsStatus: z.string().min(2),
    confidence: z.number().min(0).max(1),
    mediaUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
  })
  .superRefine((item, context) => {
    for (const field of ['sourcePageUrl', 'mediaUrl', 'thumbnailUrl'] as const) {
      const value = item[field];
      if (!value) continue;
      const host = new URL(value).hostname.replace(/^www\./, '').toLowerCase();
      if (host.includes('cdninstagram.com') || host.includes('fbcdn.net')) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Portfolio items must not store copied Instagram/Facebook CDN media.',
          path: [field],
        });
      }
    }
    if (item.source === 'instagram' && !isInstagramProfileUrl(item.sourcePageUrl) && !isOfficialInstagramPostUrl(item.sourcePageUrl)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Instagram portfolio items must be public profile/post/reel/tv URLs.',
        path: ['sourcePageUrl'],
      });
    }
    if (item.source === 'instagram') {
      if (item.mediaUrl || item.thumbnailUrl) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Instagram portfolio items must stay link/embed only, without stored media URLs.',
          path: ['mediaUrl'],
        });
      }
      if (!['officialEmbed', 'externalLink'].includes(item.displayMode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Instagram portfolio items must render through official embeds or external links.',
          path: ['displayMode'],
        });
      }
    }
    if (item.displayMode === 'remoteImage') {
      if (item.source !== 'officialWebsite' || item.mediaType !== 'image' || item.rightsStatus !== 'first_party_remote_reference') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Remote images must be audited first-party website image references.',
          path: ['displayMode'],
        });
      }
      if (!item.mediaUrl || !item.thumbnailUrl) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Remote image items require mediaUrl and thumbnailUrl.',
          path: ['mediaUrl'],
        });
      }
    }
  });

export const TattooRecordSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.enum(['artist', 'studio']),
  name: z.string().min(2),
  studioName: z.string().min(2),
  city: z.string().min(2),
  region: BayRegionSchema,
  address: z.string().min(2),
  lat: z.number().min(36.8).max(39.2),
  lng: z.number().min(-123.4).max(-120.8),
  styles: z.array(z.string().min(2)).min(1),
  bookingStatus: BookingStatusSchema,
  website: z.string().url(),
  bookingUrl: z.string().url(),
  contactUrl: z.string().url(),
  instagram: InstagramProfileUrlSchema.optional(),
  instagramPosts: z.array(InstagramPostUrlSchema).default([]),
  portfolioImages: z.array(PortfolioImageSchema).default([]),
  portfolioItems: z.array(PortfolioItemSchema).default([]),
  sourceRefs: z.array(SourceRefSchema).min(1),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confidence: z.number().min(0).max(1),
});

export const TattooDatasetSchema = z.array(TattooRecordSchema).min(200);

export type BayRegion = z.infer<typeof BayRegionSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
export type PortfolioImage = z.infer<typeof PortfolioImageSchema>;
export type PortfolioItem = z.infer<typeof PortfolioItemSchema>;
export type TattooRecord = z.infer<typeof TattooRecordSchema>;

export function isInstagramProfileUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  const reserved = new Set(['p', 'reel', 'tv', 'stories', 'explore', 'accounts']);
  return host === 'instagram.com' && parts.length === 1 && !reserved.has(parts[0].toLowerCase());
}

export function isOfficialInstagramPostUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  return host === 'instagram.com' && parts.length >= 2 && ['p', 'reel', 'tv'].includes(parts[0]);
}

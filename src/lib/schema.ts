import { z } from 'zod';

export const BayRegionSchema = z.enum([
  'SF',
  'East Bay',
  'North Bay',
  'Peninsula',
  'South Bay',
]);

export const BookingStatusSchema = z.enum(['open', 'waitlist', 'closed', 'unknown']);

const InstagramProfileUrlSchema = z
  .string()
  .url()
  .refine((value) => isInstagramProfileUrl(value), {
    message: 'Instagram profile must be a public profile URL, not media or CDN.',
  });

const InstagramPostUrlSchema = z
  .string()
  .url()
  .refine((value) => isOfficialInstagramPostUrl(value), {
    message: 'Instagram posts must use official public post, reel, or tv URLs.',
  });

export const SourceRefSchema = z.object({
  label: z.string().min(2),
  url: z.string().url(),
  type: z.enum(['official', 'website', 'directory', 'osm', 'permit', 'manual']),
});

export const PortfolioImageSchema = z
  .object({
    id: z.string().min(2),
    alt: z.string().min(8),
    tone: z.enum(['linework', 'flash', 'studio', 'lettering', 'color', 'blackwork']),
    url: z.string().url().optional(),
  })
  .superRefine((image, context) => {
    if (!image.url) return;

    const blockedHosts = ['instagram.com', 'cdninstagram.com', 'fbcdn.net'];
    const host = new URL(image.url).hostname.replace(/^www\./, '');
    if (blockedHosts.some((blocked) => host.includes(blocked))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Portfolio images must not host copied Instagram media.',
        path: ['url'],
      });
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
  sourceRefs: z.array(SourceRefSchema).min(1),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confidence: z.number().min(0).max(1),
});

export const TattooDatasetSchema = z.array(TattooRecordSchema).min(200);

export type BayRegion = z.infer<typeof BayRegionSchema>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
export type PortfolioImage = z.infer<typeof PortfolioImageSchema>;
export type TattooRecord = z.infer<typeof TattooRecordSchema>;

function isInstagramProfileUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  const reserved = new Set(['p', 'reel', 'tv', 'stories', 'explore', 'accounts']);
  return host === 'instagram.com' && parts.length === 1 && !reserved.has(parts[0].toLowerCase());
}

function isOfficialInstagramPostUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  return host === 'instagram.com' && parts.length >= 2 && ['p', 'reel', 'tv'].includes(parts[0]);
}

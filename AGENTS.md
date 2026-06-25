# Tattoo Finder Agent Guide

## Objective

Build and maintain a static Airbnb-style marketplace web app for finding Bay Area tattoo artists and studios. The app must help users compare portfolios, location, styles, source confidence, and booking/contact links faster than Instagram plus Maps.

## Current Product Shape

- Static Vite + React + TypeScript app deployed to GitHub Pages at `/tattoo-finder/`.
- Source data lives in `scraped-database/records.json`; app-ready data is copied to `src/data/records.json`.
- No backend, auth, private API tokens, payments, or marketplace booking in v1.
- UI flow follows Airbnb marketplace patterns: top mode nav, segmented search, horizontal discovery shelves, listing cards, saved items, detail view, and list/map search results.

## Allowed Workflows

- Read from public, first-party, or open-data sources where robots/terms permit.
- Use rate-limited, cached enrichment scripts under `scraped-database/scripts`.
- Store Instagram profile URLs and official public post/reel/tv URLs only.
- Store first-party website image URLs only when the image is referenced from an audited source page.
- Use localStorage only for client preferences such as saved records and last search.
- Use subagents for data, UI, and QA loops when broadening the app.

## Constraints

- Never copy, screenshot, cache, or host Instagram media.
- Never store Instagram CDN, `cdninstagram.com`, or `fbcdn.net` media URLs.
- Never imply booking availability, pricing, ratings, or verified quality unless sourced.
- Permit/open-data records are discovery records, not endorsements or booking guarantees.
- OSM map tiles must show attribution and must not be prefetched or scraped.
- Generated placeholder art must be visibly abstract and labeled as a fallback, not fake portfolio work.

## Design Rules

- Brand palette: off-black, warm off-white, and yellow.
- Headlines: Zalando Sans, bold, all caps.
- Body/UI: Space Grotesk.
- Product register: familiar marketplace/search ergonomics over decorative novelty.
- Airbnb flow inspiration is allowed; Airbnb branding, assets, exact copy, and proprietary UI code are not.
- Use cards only for listings, sheets, and repeated objects. Avoid nested cards.

## Testing Requirements

- Run data validation before every deploy.
- Run unit/component tests for schema, filters, saved state, URL state, cards, search, and detail behavior.
- Run Playwright for mobile and desktop search/list/map/detail flows.
- Review screenshots locally before deployment.
- Verify GitHub Pages live URL after push.

## Backlog

- Broaden portfolio enrichment across more official Bay Area sources.
- Add manual verification queue for high-value artists/studios with weak source confidence.
- Add opt-in artist/studio submission flow in a later backend-backed version.
- Add commercial map tiles if traffic exceeds OSM-friendly usage.
- Add richer style taxonomy and artist-level profile matching.

# Tattoo Finder Agent Guide

## Objective

Build and maintain Tattoo Finder, a mobile-first static web app that helps people discover Bay Area tattoo artists and studios by portfolio style, location, map position, source confidence, and booking/contact paths.

The app must feel like a portfolio-first Airbnb-style finder for tattoo work: quick to scan on mobile, spatially useful on desktop, visually grounded in off-black, off-white, and yellow, and never dependent on a backend or private secrets.

## Allowed Workflows

- Use short implementation loops: plan the slice, write or update tests first when behavior is involved, implement, run focused checks, then run broader checks before claiming completion.
- Use subagents for independent slices when useful: data collection/QA, UI implementation, accessibility and visual review, deployment verification.
- Keep agent write scopes disjoint when multiple agents are active. Agents must not revert or overwrite changes made by others.
- Prefer small focused files over large mixed-responsibility modules.
- Use local static data and build-time scripts. No server runtime, database, or API key is required for v1.
- Use GitHub CLI and GitHub Actions for repository setup, publishing, and Pages deployment.

## Constraints

- Do not scrape, copy, download, or commit Instagram media. Store Instagram profile links and official public post URLs only. Render official embeds lazily when possible and always provide a plain link fallback.
- Every artist or studio record must include source references, verification date, confidence, and enough location data to place it within the Bay Area.
- Data collection must be auditable, rate-limited, reversible, and respectful of source terms, robots rules, and map/geocoding policies.
- OSM tiles must show visible attribution and must not be prefetched, bulk downloaded, or hidden behind restrictive referrer policies.
- The app must remain static and GitHub Pages compatible. Do not add backend-only libraries, server routes, private tokens, or runtime secrets.
- The UI must be mobile-first. Desktop split map/gallery layout is an enhancement, not the primary experience.
- Avoid pure black and pure white. Use charcoal, warm paper, and yellow. Avoid purple/blue gradients, decorative blobs, emoji, nested cards, generic dashboard charts, and marketing-first hero screens.
- Use Zalando Sans for all-caps display/headline moments and a legible modern sans for body/UI text.

## Testing Requirements

- Add or update tests for schema validation, search/filter behavior, distance sorting, dedupe checks, saved-list persistence, detail panel behavior, map/list toggling, and embed fallbacks.
- Run data QA before publishing. The dataset must contain at least 200 records, valid coordinates, unique IDs, source URLs, no copied Instagram media, and no duplicate website/Instagram clusters.
- Run unit/component tests, build, and Playwright smoke tests before making completion claims.
- Visual review must cover mobile and desktop viewports.

## Deployment Rules

- Build with Vite using the `/tattoo-finder/` base path.
- Deploy the static build to GitHub Pages from `juleshaggard/tattoo-finder` using GitHub Actions.
- Verify the published site after deployment and report the live URL plus the exact checks run.

## Backlog

- Expand verified artist-level coverage beyond studio-level records.
- Add richer official embed support where Meta credentials or approved oEmbed access are available.
- Add user-submitted corrections with a moderation workflow.
- Add appointment availability, guest spot indicators, and convention/travel filters.
- Add commercial map tile provider support if traffic exceeds public OSM tile expectations.
- Add comparison mode, keyboard shortcuts, and advanced style taxonomy search.
- Add image moderation and rights workflow before any hosted portfolio media is introduced.

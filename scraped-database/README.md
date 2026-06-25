# Scraped Database

This folder is the preserved data foundation for the next Tattoo Finder rebuild.

- `records.json`: 471 Bay Area tattoo artist/studio records.
- `data-metadata.json`: generation date, source counts, and source list.
- `portfolio-audit.json` and `portfolio-rejections.json`: accepted, blocked, and quarantined portfolio decisions.

Current metadata:

- Generated: 2026-06-25
- Total records: 471
- OpenStreetMap records: 157
- Santa Clara County permit records: 321
- Sources: OpenStreetMap Overpass API, Santa Clara County permitted body art facilities
- Portfolio references: 79 app-visible refs across 18 records; 46 rejected or quarantined URLs.

Data constraints to preserve in the rebuild:

- Do not copy or host Instagram media.
- Store Instagram profile and official public post URLs only.
- Treat permit/source records as discovery data, not booking guarantees.

Portfolio enrichment:

- `records.json` may include `portfolioItems` for rights-safe portfolio references.
- Run `node scraped-database/scripts/enrich-portfolios.mjs` to refresh portfolio links and audit data.
- Run `node scraped-database/scripts/validate-portfolios.mjs` after enrichment.
- The crawler writes temporary HTTP responses to `scraped-database/.http-cache/`, which is ignored and must not contain downloaded portfolio image files.
- `scraped-database/original-src/` is an ignored local backup from the reset phase and is not part of the deployable database.

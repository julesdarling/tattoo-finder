# Tattoo Finder Design System

## Brand

- Tone: useful, sharp, trustworthy, slightly gritty.
- Palette: off-black, warm off-white, yellow accent.
- Color strategy: restrained product UI with yellow reserved for active/search/save emphasis.
- Avoid pure `#000` and `#fff`; use tinted OKLCH neutrals.

## Typography

- Headlines: Zalando Sans, bold, uppercase, compact line height.
- Body and UI: Space Grotesk.
- No display fonts inside labels, form controls, or dense metadata.

## Layout

- Home: Airbnb-inspired top nav, segmented search pill, continue-search strip, and horizontal listing shelves.
- Results: desktop split list/map; mobile fixed map/list toggle.
- Cards: listing cards only, not page sections. Image area first, metadata below.
- Details: sheet/drawer with gallery, source strip, map, styles, and contact actions.

## Components

- Search pill has three segments: Where, Style, Availability.
- Mode tabs: Artists, Studios, Flash.
- Listing cards use heart/save affordance, source badge, portfolio count, styles, and city/region.
- Fallback media must be abstract and labeled.
- Buttons must have hover, active, focus-visible, disabled, and loading states where applicable.

## Motion

- Motion is product-state motion only: hover, active, sheet open, map/list toggle, carousel scroll.
- Prefer 150-250ms transitions using transform and opacity.
- No decorative load choreography.

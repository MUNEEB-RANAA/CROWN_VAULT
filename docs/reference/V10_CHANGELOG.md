# CrownVault V10 Changelog

## Main correction
V10 addresses the core V9 problem: the supplied imagery is now visibly connected to the marketplace experience rather than feeling hidden behind the data layer.

## Images
- 59 original supplied V9 images retained.
- 54 original images are assigned to real watch listings.
- 5 original images are used as visible homepage/category/editorial photography.
- 1 additional user-provided smartwatch image added to reach five Smartwatch listings.
- All static catalog image paths are project-relative so product photography can appear even when `index.html` is opened directly.
- Added `visual-check.html` and `IMAGE_USAGE.md` for transparent image verification.

## Collections
- Dedicated Men's Watches page: 12 visible sale cards.
- Dedicated Women's Watches page: 10 visible sale cards.
- Dedicated Couple Watches page: 5 visible sale cards.
- Dedicated Smartwatches page: 5 visible sale cards.
- Accepted four-card collection design retained.

## Product cards
- Actual image remains the dominant element.
- Price displayed directly under the watch name.
- Buy Now is full-width and primary.
- Details, Save and Compare are secondary actions.
- Pre-Owned / Available status visible on the image.

## Watch detail
- Working primary Buy Now action with price.
- Seller-photo gallery for multi-image listings.
- Expanded watch specifications and seller details.
- Add to purchase bag remains secondary.

## Selling
- 1–5 image upload and preview.
- First image becomes the live sale-card image.
- Seller watch is published into Pre-Owned and sale grids.
- Listing stores service history and condition notes.
- Dashboard retains the listing image and direct live-listing link.

## Offline / direct-open mode
- Added a local browser fallback for browsing and demo marketplace actions when no Node server is running.
- Server mode remains the recommended full local experience.

## Backend
- API version 10.0.0.
- 55 built-in watch listings: 33 Men's, 12 Women's, 5 Couple, 5 Smartwatch.
- Registration, wishlist, compare, Buy Now, bag, checkout, seller upload, live listing, offers, dashboard and contact routes retained and tested.

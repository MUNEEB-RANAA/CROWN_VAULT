# CrownVault V14 — preloader update (14.0.0)

V14 replaces the preloader text with the existing white-and-gold CrownVault logo and increases its timer to 1 second. It retains the V13 video playback fix and all existing layouts, media and animations. See `V14_FIXES.md` for this release and `V13_FIXES.md` for the earlier video fix.

A local watch marketplace prototype using the original HTML, CSS, vanilla JavaScript, Node.js built-ins and JSON database. No new runtime packages, frameworks, external APIs or payment integrations were added. The supplied V11 did not use Bootstrap; its existing styles remain intact. All original media files are retained. The malformed Solaris Gold Diver illustration is replaced in the website with a corrected concept image; its original file remains in the archive.

## Start on Windows

Extract the ZIP, open CMD inside `CrownVault_V14`, then run:

```cmd
node --version
node server.js
```

Open http://localhost:3000. Alternatively use `START_CROWNVAULT.bat`. No `npm install` is needed. Tested with Node 24.19.0 in the build environment. Use a supported Node LTS release. Do not double-click index.html for accounts or purchases: file previews are catalogue-only.

## Verify

```cmd
npm run check
npm test
```

Tests use a temporary database and port 3099; they do not modify your catalogue or accounts.

1. Register, select a watch, choose Buy now, enter delivery details and place the order.
2. Confirm the order detail page opens, the bag is empty and the watch is sold.
3. Open Dashboard → View order to see its timeline; use Refresh status for updates.
4. Sign in as another account: the first account's order URL must be unavailable.
5. Sell a watch with 1–5 JPEG/PNG/WebP photographs. Check the live listing and preview.
6. Check navigation, help panel and forms at desktop and mobile widths.

## Administrator setup

Register an account normally. Stop the server with Ctrl+C before running:

```cmd
node scripts/set-admin.js your-registered-email@example.com
node server.js
```

The administrator dashboard lists all orders. Open an order and use Manage order. Backend permissions enforce every update. Valid sequence: ORDER_PLACED → CONFIRMED → PREPARING → SHIPPED → DELIVERED. Cancellation is allowed before shipping and restores availability. Delivered and cancelled orders are terminal. Changes record actor, status and timestamp.

## Files and architecture

- `server.js`: HTTP server, cookie authentication, authorization, validation, serialized database mutations, static public-file allowlist and API routes.
- `data/db.json`: original catalogue and application records; not publicly served. One server process only.
- `assets/js/app.js`: shared API access, session state and product actions.
- `assets/js/collection.js`: bag and checkout; persistent retry key and order redirect.
- `order.html`, `assets/js/order.js`: owner/admin order view, timeline and admin controls.
- `assets/js/account.js`: login, registration and dashboard links.
- `assets/js/sell.js`: photo previews, compression and listing submission.
- `assets/js/v12.js`, `assets/css/v12.css`: help panel, visible Bag link, labelled fields, keyboard navigation and responsive order layout.
- `tests/marketplace.test.js`: isolated HTTP integration regression test.
- `scripts/set-admin.js`: local administrator provisioning; run only with server stopped.
- `scripts/start.js`: Windows launcher that waits for the server before opening your browser.
- `assets/js/home.js`: cached scroll measurements, time-based interpolation, transform/opacity transitions and a normal scrolling layout on mobile.
- `tests/home-motion.test.js`: checks animation completion, reverse scrolling and reduced-motion settings without a browser.

Users own carts, wishlists, listings and orders through userId. Order items snapshot watchId, name, image and price. Sessions reference userId and expire after seven days. Catalogue availability is checked inside the serialized order transaction. An idempotency key is scoped to user and request fingerprint.

| Role | Permissions |
|---|---|
| Guest | Browse/search watches, compare locally, read help, send contact message |
| Member | Own account, bag, wishlist, listings, offers and orders |
| Administrator | Member actions plus view all orders and valid status updates |

## Added API behavior

- POST `/api/orders`: requires signed-in cookie and `Idempotency-Key` header (16–100 letters, numbers, `_` or `-`). Body: name, email, address, city, country. Total comes from the server. Identical retries return the same order; changed payload returns 409.
- GET `/api/orders/:id`: owner or administrator only.
- PATCH `/api/orders/:id/status`: administrator only; body `{ "status": "CONFIRMED" }` or a valid next state.
- GET `/api/admin/orders`: administrator only.

Existing catalogue, auth, cart, listing, offer and contact routes remain.

## Configuration and limits

Optional environment variables: PORT (3000), HOST (127.0.0.1), CV_DATA_FILE (data/db.json), CV_UPLOAD_DIR (uploads), NODE_ENV. Production mode sets Secure cookies and expects HTTPS. No credentials are embedded. Keep backups of data/db.json and uploads together before replacing a working installation.

This is a single-process local prototype, not a production payment service. No real payment, shipping, email notification, AI chatbot, n8n workflow or external sync is connected. Status notifications are on-page; refresh to fetch updates. Network errors never silently write orders to browser storage. Uploaded files receive size/type-signature checks, not malware scanning or full server-side image decoding. Before public hosting, add durable transactional storage, asynchronous password hashing, operational rate limits, managed TLS, upload scanning, account recovery, production monitoring and backup/restore testing.

## V12 validation (retained from the previous release)

Node syntax checks and isolated HTTP integration assertions passed: private-file blocking, authentication, cross-origin rejection, concurrent checkout idempotency, sold inventory conflict, owner isolation, admin authorization, transition ordering, invalid image/price rejection and malformed cookies. Original media byte comparison passed. Four automated test groups pass, including motion state transitions, positive seller upload with an unknown year, and the corrected image on legacy databases.

Visual browser QA could not be completed because the browser security policy blocks the local preview. CSS and HTML were checked, and animation logic was tested, but actual browser rendering, frame rate and full click-through behavior remain unverified. Run the manual steps above before demonstrating.

## What changed in the refined edition

The “Watches, worn properly” section now uses three equal columns with identical card proportions. The first card no longer spans rows. All three cards are actual collection links. Image focal points, captions and spacing are defined for each photograph. Product cards use equal media areas and flex bodies to keep purchase buttons aligned. Journal and collection cards have consistent proportions.

The hero uses transform and opacity updates with cached geometry and short time-based interpolation. Cards stay visible at the end of the transition. The requestAnimationFrame loop stops when settled. Mobile and reduced-motion layouts use ordinary document scrolling. A Play/Pause film button respects user intent, visibility and reduced-motion settings. No animation library is required.

The new Solaris image is used in the server catalogue and offline catalogue. Existing order snapshots using its old image are updated when read. Other product information remains unchanged. The image is an AI-created concept illustration for this prototype, not evidence of a real item for sale.

## Upgrade your existing V12 safely

1. Stop the old server. Keep a copy of your current folder.
2. Extract this edition into a separate folder.
3. If you want your existing accounts, orders and uploads, copy the old `data/db.json` and `uploads` folder into the new edition. The server updates the old gold image reference automatically.
4. Start the new edition, open http://localhost:3000, then press Ctrl+F5 to refresh cached styles and scripts.

The archive uses writable directories so local database changes work after extraction.

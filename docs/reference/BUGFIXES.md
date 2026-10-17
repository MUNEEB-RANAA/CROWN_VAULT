# CrownVault V10 — Bug Fix Pass

This documents every fix applied during the code review. Read this alongside
`V10_CHANGELOG.md`.

## 1. Stored XSS via seller listing fields (High severity)
**Files:** `assets/js/app.js`, `assets/js/watch.js`, `assets/js/collection.js`,
`assets/js/account.js`, `assets/js/sell.js`

Seller-submitted text (brand, model, description, notes, status, etc.) was being
inserted directly into `innerHTML` across product cards, the watch detail page,
the dashboard, and the compare table — with no escaping. A seller could type
something like `<img src=x onerror=alert(1)>` as a watch model name and it would
execute in every other visitor's browser who viewed that listing.

**Fix:** added a shared `escapeHtml()` helper in `app.js` (exported on
`window.CrownVault`) and used it everywhere user-supplied text is rendered.

## 2. Sold watches could be bought again in offline mode (Medium)
**File:** `assets/js/offline-data.js`

Offline/local-file mode only checked the "sold" list inside the `/api/watches`
grid endpoint. The single-watch lookup, Buy Now, and Add to Cart endpoints never
checked it, so a direct link, browser back button, or an item still sitting in
your wishlist could be bought again after it was already sold. Server mode
(`server.js`) already handled this correctly — this fix brings offline mode in
line with it.

## 3. Plaintext passwords in offline mode (Medium)
**File:** `assets/js/offline-data.js`

Offline mode stored the raw password string in `localStorage`. Added a
`hashPassword()` helper using the browser's built-in Web Crypto API (SHA-256) so
only a hash is ever stored, matching the intent (if not the exact algorithm) of
`server.js`'s `scrypt`-based hashing.

**Note:** if you had test accounts registered before this fix, they were saved
with the old plaintext field and won't be able to log in anymore — just
register again, or clear `localStorage` for a clean slate.

## 4. Read-modify-write race condition (Low)
**File:** `server.js`

Every request read the whole `db.json`, changed it in memory, then wrote it
back — with no locking. Two near-simultaneous requests (e.g. two browser tabs)
could each read the same "before" state and the second write would silently
overwrite the first request's change.

**Fix:** added a `runSerialized()` queue. GET requests still run freely; any
request that can mutate the store (POST/PUT/DELETE) now runs one at a time.

## 5. Seller listings auto-featured in offline mode only (Low)
**File:** `assets/js/offline-data.js`

New seller listings were created with `featured: true` in offline mode but
`featured: false` on the server. Changed offline mode to match the server so a
demo behaves the same whether or not Node is running.

## 6. Oversized photo uploads failed silently (Low)
**Files:** `server.js`, `assets/js/sell.js`

If an uploaded photo was over 3MB, the backend just dropped it with no
indication to the seller — a listing could publish with fewer photos than
selected and no explanation. `saveDataImage()` now returns a reason on failure,
and the listings API returns a `warning` field that `sell.js` displays after a
successful publish.

## 7. Brand filter could list brands with zero available watches (Cosmetic)
**Files:** `server.js`, `assets/js/offline-data.js`

The brand dropdown was built from *all* watches, including sold ones. Selecting
such a brand returned an empty grid with no obvious reason why. Both the server
and offline-data brand lists are now filtered to available watches first.

## 8. Copy-pasted `data-page` attribute (Cosmetic)
**Files:** `faq.html`, `services.html`

Both pages had `data-page="about"` left over from being cloned off
`about.html`. No JS currently reads this attribute, so it wasn't functionally
broken, but it's corrected to `"faq"` / `"services"` respectively to avoid
future confusion.

---

## Important: product photos not included

This bundle does **not** include your `assets/images/v9/*.jpeg` and
`assets/images/v8/*.jpeg` product photography — only the three CrownVault logo
files were part of the original upload. Copy this bundle's `assets/js/`,
`assets/css/`, `server.js`, and the corrected `.html` files into your real
project folder (which already has the full `assets/images/` directory) rather
than running this bundle standalone.

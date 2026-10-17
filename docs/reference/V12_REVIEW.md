# V11 review and V12 scope

V11 has a coherent luxury editorial design: restrained typography, large watch photography, a cinematic hero video, product categories, seller listings, comparisons and an account dashboard. Preserve this direction rather than replacing it with a generic storefront. The largest weaknesses are transaction correctness and feedback.

## Confirmed V11 findings

| Finding | V12 change |
|---|---|
| Static server allowed direct database/source downloads | Public path allowlist blocks private files |
| Checkout trusted a stale bag even after inventory sold | Rechecks availability inside serialized transaction |
| Repeat submit had no persistent request identity | User-scoped idempotency key and request fingerprint |
| Demo orders claimed payment confirmation | ORDER_PLACED with explicit no-payment copy |
| Success was only a short checkout message | Dedicated order page and dashboard links |
| No order detail ownership endpoint or lifecycle | Owner/admin endpoint, transitions and history |
| Fetch failures silently switched into offline account/order handling | Server actions fail visibly; file mode is catalogue-only |
| Login accepted arbitrary next destinations | Same-origin HTML redirect restriction |
| Upload trusted declared image MIME; prices could be non-finite | Signature/size checks, finite price/year validation |
| Form labels lacked programmatic associations | Associated labels and live feedback |
| Bag was buried in navigation | Persistent header Bag shortcut |
| No bot implementation in uploaded source | Clearly labelled navigation help panel, no AI claims |

## Scope decisions

Keep original media, page content, catalogue, storage model and vanilla frontend. Add no dependencies. No Figma file, database migration service, real payment, external automation, deployment or third-party integration is needed for this local V12 release. Order tracking is refresh-based. Existing V11 payment-labelled orders display as placed without inventing payment evidence. Keep the original archive as a rollback copy.

The included README defines architecture, roles, file connections, commands, API behavior, security boundaries and remaining production requirements. This pass addresses the identified defects; it is not a complete security audit or production certification.

## Refined edition after user feedback

- Fixed the explicit `grid-row: span 2` on the first editorial card using a consistent, responsive grid.
- Replaced the physically malformed gold-watch concept photograph, with the user's approval.
- Removed the hero's animated clip-path and fade-out of the navigation cards at the end of scrolling.
- Cached hero layout measurements, added time-based progress easing and stopped idle animation frames.
- Added usable Play/Pause video control; reduced-motion users get a static layout and paused film by default.
- Aligned purchase buttons and image areas; corrected tight header spacing on narrow phones.
- Accepted unknown seller years as null, validated provided years, and added a successful-upload regression assertion.
- Updated the Windows launcher to wait for server startup and normalized ZIP directory permissions.
- Confirmed all four automated test groups pass. Browser rendering remains unverified due to local URL restrictions.

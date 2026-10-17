# CrownVault V14 — preloader update

Version: 14.0.0

The homepage preloader now displays `assets/images/crownvault-logo-on-dark.png`, the exact existing white-and-gold crown logo used by the homepage header. The image is centred on the existing black overlay and scales proportionally on small screens. Its display timer is 1 second (1000ms), as in the supplied code.

The homepage starts fetching the existing logo early and uses new cache versions for the two preloader files. The timer stays independent of video and API loading; it does not add a scroll lock, wait for media events or change the existing animations. Browser timers can run later if the page is suspended or busy.

## Open this version

1. Extract `CrownVault_V14_Fixed.zip`.
2. Stop an older CrownVault server before starting V14.
3. Open the extracted `CrownVault_V14` folder and run `START_CROWNVAULT.bat` on Windows with Node.js installed, or run `node server.js` in this folder. No package installation is needed.
4. Open http://localhost:3000 and press Ctrl+F5 once. Check the crown logo preloader and the homepage video.

To change the duration, edit the `1000` value in the `window.setTimeout` call in `assets/js/preloader.js`. Use `2000` for 2 seconds.

## Preserved from V13

The video playback fix, video file, video size and crop, scroll animation, all other page layouts, cards, product images, catalogue, database and application features remain unchanged. The original logo image itself is unchanged. Release metadata, the existing preloader test and documentation are updated for V14.

## Verification

All 12 automated tests passed, including the original-logo and 1000ms preloader check, video playback, motion and marketplace checks. JavaScript syntax, local page/asset references, unchanged-file comparisons and ZIP integrity were checked. Browser preview is unavailable in this build environment, so actual playback should still be checked on your computer.

If upgrading an existing installation, stop its server, keep a backup, then copy its `data/db.json` and `uploads` folder into V14 before starting it to retain your accounts, orders and uploads.

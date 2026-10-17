# CrownVault V13 — final video fix

Version: 13.0.0

## Requested changes

The homepage film now shares one pending playback request across startup, visibility and media-ready events. In V12, two startup calls could overlap: the older call then paused the video even though the film was still visible. A regression check reproduced the frozen state in V12 and confirmed that V13 keeps playing through the same event sequence without scrolling.

Muted, inline playback is set before requesting play, and the existing video now uses `preload="auto"`. Manual Play/Pause, tab visibility, the existing scroll visibility signal and reduced-motion preferences remain respected. An interrupted request can recover after a quick tab switch. If a browser blocks autoplay, the existing Play film button remains available; the code does not repeatedly retry a denied request.

The homepage has a brief CrownVault preloader. A single 100ms timer removes it independently of video, image or API loading. It adds no fade delay, scroll lock or layout shift. As with all browser timers, actual removal can be later if the browser suspends or stalls the page; 100ms is the configured duration, not a promise that the whole site downloads in 100ms. With JavaScript disabled, no overlay is inserted.

## Preserved exactly from V12 refined

- The original hero MP4, its dimensions, crop and layout styles.
- `assets/js/home.js`, including the smooth scroll animation and its timings.
- Both existing stylesheets, all card layouts, text and page designs.
- All 126 media files, including the approved replacement golden watch image.
- The catalogue, database, forms, accounts, orders, navigation and other shared UI code.

Only the playback controller, homepage media loading attribute and new preloader affect website behavior. Release labels, this documentation, the homepage playback script cache version and regression tests were updated for V13. Other HTML pages are unchanged.

## Verification

- All 12 automated tests passed: eight playback/preloader checks and the four existing motion/marketplace checks.
- The original V12 controller freezes in the reproduced startup race; the V13 controller makes one play request and remains playing.
- JavaScript syntax passed for all 19 JavaScript files.
- All local asset and page references on the 23 HTML pages resolve.
- Byte comparisons confirmed that existing media, animation code, layout styles, database and unrelated shared UI code are unchanged.

Browser preview is blocked by this build environment's security policy, so these results cover automated logic and file checks, not measured frame rate or playback on your particular browser.

## Open V13 for your exam

1. Extract `CrownVault_V13_Fixed.zip` into a new folder.
2. Stop any older CrownVault server before starting this version.
3. Open `CrownVault_V13` and double-click `START_CROWNVAULT.bat` on Windows. Node.js must already be installed. No package installation is needed. Alternatively run `node server.js` in this folder.
4. Open http://localhost:3000 and press Ctrl+F5 once to bypass the older cached page.
5. On the fresh homepage, the preloader should disappear after its brief timer and the muted film should start once enough video has loaded, without scrolling. Check Play/Pause and a scroll down and back up. A browser or device with autoplay restrictions may require the existing Play film button.

To retain accounts and orders from an existing installation, stop its server, keep a backup, and copy its `data/db.json` and `uploads` folder into V13 before starting it. The approved golden watch image migration from V12 is retained.

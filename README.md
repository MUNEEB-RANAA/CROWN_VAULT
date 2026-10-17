# CrownVault V15 — organised handover

This is an organisation-only package made from the supplied CrownVault V14 ZIP. Every original file is included exactly once, with identical contents. Existing code, images, video, database records, formatting, line endings and version labels are preserved. V15 names this handover package; `package.json` and the health API still report the original 14.0.0 version because their code was not edited.

## Open the website

1. Extract the entire ZIP first.
2. Stop any older CrownVault server.
3. Open the `app` folder and double-click `START_CROWNVAULT.bat` on Windows. Node.js must be installed. No packages need to be downloaded for this project.
4. Open http://localhost:3000 if it does not open automatically.

From a terminal opened in `CrownVault_V15`, the equivalent commands are:

```sh
cd app
node server.js
```

Keep that terminal open while using the website. Stop it with Ctrl+C. On macOS/Linux, the existing `app/start-crownvault.sh` is also available. Accounts, listings and orders require the Node server; opening an HTML file directly is only a catalogue preview.

## Where everything belongs

| Location | Contents |
| --- | --- |
| `app/` | Runnable project: HTML pages, Node server, package configuration and original launchers |
| `app/assets/css/` | All existing stylesheets, including the preloader styles |
| `app/assets/js/` | All existing browser scripts, including video playback and the crown-logo preloader |
| `app/assets/images/` | All original logo, product and editorial photographs, in their existing referenced folders |
| `app/assets/video/` | The original homepage film |
| `app/data/db.json` | Original application database |
| `app/uploads/` | Folder for future seller uploads; the supplied ZIP contains no uploaded files |
| `app/scripts/` | Original startup and administrator utilities |
| `app/tests/` | Original automated tests |
| `docs/reference/` | All nine original project documents, kept together so their cross-references remain useful |
| `docs/asset-manifests/` | The two original image inventory JSON files, which are not used by the running application |
| `verification/FILE_MAP.csv` | Original path, new path, purpose, size and SHA-256 checksum for every original file |
| `verification/VERIFICATION.md` | File preservation and packaging verification results |

The HTML pages, `server.js`, `package.json`, `assets`, `data`, `scripts` and `tests` retain their relative positions inside `app`. Splitting these into new frontend/backend/public folders would require changing paths in the source. Existing image subfolder names are likewise retained because catalogue data and page code refer to them.

## Existing project documentation

Start with [the original project README](docs/reference/README.md). Other useful originals are [V14 preloader notes](docs/reference/V14_FIXES.md), [V13 video notes](docs/reference/V13_FIXES.md), [the V12 review](docs/reference/V12_REVIEW.md) and [image usage](docs/reference/IMAGE_USAGE.md).

These documents are reproduced without edits. When they mention an older project folder, use `app` in this package for server commands and application paths. Read the file map for the new location of any moved document or image inventory.

## Existing tests

From the `app` folder, run:

```sh
npm run check
npm test
```

The existing tests use a temporary database and port 3099. No new tests, runtime features or dependencies were added for this handover.

## Retain your data when changing folders

Stop the old server and keep a backup before replacing an existing installation. To retain accounts, orders and seller photographs created after the supplied ZIP was made, copy your existing `data/db.json` into `app/data/db.json` and the contents of your existing `uploads` folder into `app/uploads` before starting this copy.

# CrownVault V11 — Restored Media + V10 Bug Fix Merge

## Base
- Uses the reviewed/fixed V10 code bundle as the runtime codebase.
- Preserves all fixes documented in `BUGFIXES.md`.

## Restored from the complete V10 project
- Full `assets/images/` library, including V9 watch photography and earlier image sets.
- `assets/video/crownvault-hero.mp4` homepage hero film.
- `data/db.json`.
- V9/V10 image manifests in `data/`.

## Verification
- Local image/video references checked for missing files.
- JavaScript/server syntax checks run with the project `npm run check` command.
- Hero video path retained as `assets/video/crownvault-hero.mp4`.

No fixed application code was rolled back to the older V10 implementation.

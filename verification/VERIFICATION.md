# V15 organisation verification

Source archive: `CrownVault_V14_Fixed(1).zip`

Source archive SHA-256: `a77cc18d06ce25a9dc9a09407796ad4c6426b5cabe8a41bbf646498ff36d3872`

## Preservation results

- Original files checked: **186**.
- Original files with changed contents: **0**.
- Original files omitted: **0**.
- Original files duplicated: **0**.
- Original application files: **175**, now together under `app/` with their existing internal paths.
- Original documentation: **9** files, now together under `docs/reference/`.
- Original image inventory files: **2**, now under `docs/asset-manifests/`.
- Images and video preserved: **126** original media files.
- Existing version strings and configuration values remain unchanged.

Every destination was directly compared with its corresponding source ZIP member, and its SHA-256 checksum and size were checked against `FILE_MAP.csv`. This comparison includes the application database after running the existing tests.

## New handover material

Only these three new documentation/inventory files were added:

- `README.md`: the V15 handover and launch guide.
- `verification/FILE_MAP.csv`: all original-to-new paths, categories, sizes and hashes.
- `verification/VERIFICATION.md`: this report.

The empty `app/uploads/` directory is included for the existing upload feature. No source code or launcher was added or changed.

## Verification performed

- All **12 existing automated tests passed** from the relocated `app` folder, covering marketplace behavior, motion, video playback and the original-logo preloader.
- All **941 local page/media references** on the **23 HTML pages** resolve from their new locations.
- All **87 distinct literal asset paths** found in application HTML, CSS, JavaScript and JSON resolve.
- New handover guide links resolve.
- Documentation and image inventories have no references from runtime source that depend on their former locations.
- The final ZIP is checked for CRC errors and compared byte-for-byte against the organised directory before delivery.

Live browser preview was unavailable, so no new visual browser review was performed. The website source and media remain identical to the supplied version.

## Read the file map

`FILE_MAP.csv` has one row per original file. The Original path column identifies its exact source ZIP member; the V15 path column gives its destination beneath the new package. Hashes describe the unchanged original contents, not ZIP compression metadata. New handover documentation is listed above and is not counted among the 186 originals.

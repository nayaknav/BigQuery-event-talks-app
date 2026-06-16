# Changelog

All notable changes to the **BigQuery Release Notes Hub** will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-06-16

### Added
- **Collapsible Cards ("Read More")**: Long release updates exceeding 300 characters are now truncated with a fading gradient. Added an interactive expand/collapse toggle button for cleaner feed scanning.
- **Timeline Pagination**: Implemented lazy loading of entries (10 days at a time) with a **Load More** button to decrease initial DOM nodes and improve rendering speeds.
- **Direct Copy Link**: Added a "Copy Link" button to card footers allowing users to copy the direct anchor link (e.g. `https://docs.cloud.google.com/bigquery/docs/release-notes#Date`) to their clipboard.
- **Offline Cache Banner**: Added a top warning banner that appears if the server fails to fetch the live feed and falls back to cached data. Includes a **Retry Connection** button.
- **Keyboard Shortcuts**: Added hotkeys: `/` to focus/select the search bar, and `Esc` to clear search filters.

### Changed
- **Twitter URL Character Limits**: Re-engineered the character counting logic in the Tweet Composer to match X (Twitter)'s native URL behavior: any URL (`http://` or `https://`) now counts as exactly **23 characters**, rather than its literal length.

---

## [1.1.0] - 2026-06-16

### Added
- **Export to CSV**: Added a client-side utility button in card footers. Generates structured CSVs (`Date,Category,Description,Link`) dynamically as local browser Blob downloads, bypassing server roundtrips.

---

## [1.0.0] - 2026-06-16

### Added
- **Core Flask Server**: Implemented Flask routing, XML parser for Atom feeds, regex-based category splitter, and HTML tag stripper.
- **Dual Caching**: In-memory caching with a 1-hour lifecycle and automatic error fallbacks.
- **Obsidian Dark & Light Theme**: Seamless CSS-variable-based layout toggle that persists preferences in `localStorage`.
- **Tweet Composer Modal**: High-fidelity modal simulating a native X post, featuring dynamic SVG character progress rings and redirect intents.
- **Toast Notifications**: Slide-in system alerts indicating success, info, and error status updates.
- **Filter & Search**: Active client-side keyword searching with visual term highlights, alongside category pills.

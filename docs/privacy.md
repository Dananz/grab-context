---
title: Grab Context — Privacy Policy
permalink: /privacy
---

# Privacy Policy

_Last updated: 2026-05-11_

Grab Context is a Firefox extension that copies the HTML of a clicked element as Markdown so the user can paste it into AI coding assistants. It does not contain analytics, telemetry, error reporting, advertising, or any other code that transmits data off the user's device.

## Data the extension stores

The extension stores **one boolean value** in [`chrome.storage.local`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local):

- `react_grab_enabled` — whether the extension's in-page UI is turned on. Synchronised across tabs on the same Firefox profile by the browser. Never transmitted off-device.

The underlying [`react-grab`](https://github.com/aidenybai/react-grab) library also persists a small UI-preference object (toolbar position, collapsed/expanded, default action) in `window.localStorage` of each origin you visit. That object stays in the page's own origin and is never transmitted off-device.

## Data the extension reads

- **The HTML of an element you explicitly click** while the selection cursor is armed. The HTML is converted to Markdown locally by [Turndown](https://github.com/mixmark-io/turndown) and written to your system clipboard via `navigator.clipboard.write`. Nothing leaves your device.
- **The bounding rect of an element you explicitly capture** via the Screenshot action. The visible viewport of the active tab is captured locally via [`chrome.tabs.captureVisibleTab`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/captureVisibleTab), cropped to the rect in the content script, and written to your system clipboard. Nothing leaves your device.

The extension never reads the contents of pages you have not interacted with, and never reads form values, cookies, passwords, headers, or any other page state besides the element you clicked.

## Permissions

- `storage` — required to remember whether the in-page UI is enabled.
- `activeTab` — required for `chrome.tabs.captureVisibleTab` so the Screenshot action can capture the current viewport. Used only after you explicitly trigger Screenshot.
- `<all_urls>` host permission — required to inject the selection cursor into whichever page you click on. The injection is purely UI; no page content is read unless you click an element with the cursor armed, and even then the result is only written to your local clipboard.

## Third-party code

The extension bundles, at build time, the following MIT-licensed dependencies:

- [`react-grab`](https://github.com/aidenybai/react-grab) v0.1.29 — Aiden Bai
- [`bippy`](https://github.com/aidenybai/bippy) — Aiden Bai (transitive)
- [`turndown`](https://github.com/mixmark-io/turndown) — Dom Christie
- Icon glyph from [Phosphor Icons](https://github.com/phosphor-icons/core) — Helena Zhang & Tobias Fried

No remote code is loaded at runtime. All JavaScript is bundled at build time.

## Source

Full source: <https://github.com/Dananz/grab-context>

## Contact

Open an issue at <https://github.com/Dananz/grab-context/issues>.

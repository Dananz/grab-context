# AMO submission copy

Paste the matching section into each field in the addons.mozilla.org
developer hub after `pnpm sign:listed` uploads the build.

---

## Name

Grab Context

## Summary (max 250 chars)

Click any element on a page to copy it as Markdown ready to paste into ChatGPT, Claude, Cursor, or Copilot. Detects React, Vue, and Svelte components and includes their names and source files in the copied context.

---

## Description (long form)

Grab Context turns any web page into a clip source for AI coding assistants.

Click the toolbar button to arm a selection cursor on the current tab. Click any element and it is copied to your clipboard as clean Markdown, including:

- The element's HTML, converted to Markdown via Turndown
- Component name and source file when the element belongs to a React, Vue, or Svelte component
- A concise selector path so the assistant can locate the element again

Use the Screenshot action in the in-page toolbar to capture the selected element to your clipboard as a PNG.

Paste the result into ChatGPT, Claude, Cursor, GitHub Copilot Chat, or any chat tool. The assistant gets the exact element you wanted to discuss without you having to describe it.

### Component detection

- React: walks the React fiber tree using bippy and resolves the nearest named component.
- Vue 3: reads __vueParentComponent and pulls the component name from type.__name and the source file from type.__file in dev builds. Also reads data-v-inspector attributes when vite-plugin-vue-inspector is installed.
- Svelte: reads __svelte_meta to get the component file and line.

In production builds without dev metadata, the extension still copies clean HTML and a CSS selector for the clicked element.

### Privacy

Grab Context runs entirely in your browser. It does not send any page content, clipboard data, or telemetry to any server. No analytics, no remote configuration, no account.

The "storage" permission is used only to remember whether the in-page UI is enabled (one boolean, chrome.storage.local).

The "activeTab" permission is required for chrome.tabs.captureVisibleTab when you trigger the Screenshot action.

The "<all_urls>" host permission is required because the extension must inject the selection cursor into whatever page you click on. The extension does not read or transmit page content unless you explicitly click an element with the cursor active, in which case the result is written only to your local clipboard.

Full privacy policy: https://dananz.github.io/grab-context/privacy

### Source code and licensing

This extension is open source and built from publicly available components.

- The element-selection engine is react-grab by Aiden Bai (MIT), https://github.com/aidenybai/react-grab — pinned to version 0.1.29, the release that ships Vue and Svelte detection.
- Markdown conversion uses Turndown by Dom Christie (MIT), https://github.com/mixmark-io/turndown.
- Icons are derived from Phosphor Icons by Helena Zhang and Tobias Fried (MIT), https://github.com/phosphor-icons/core.

The Firefox manifest, the auto-arm selection wiring, the crosshair overlay, the screenshot plugin and the icon are by Tomer Danan, MIT licensed. The full extension source is at:

  https://github.com/Dananz/grab-context

There is also an official Chrome build of React Grab maintained by the upstream author. This Firefox build exists because the upstream extension repository does not currently target Firefox.

---

## Notes to reviewer (private field)

The submitted XPI is produced by `pnpm install && pnpm build` from the attached source archive. Reviewer-side reproduction:

  unzip grab-context-source.zip
  pnpm install
  pnpm build
  # dist/ matches the uploaded XPI byte-for-byte except for the manifest
  # version timestamp.

This extension does NOT load any remote code at runtime. All JavaScript is
bundled at build time:

- dist/src/content/react-grab.js bundles the npm package react-grab@0.1.29
  (MIT, https://www.npmjs.com/package/react-grab/v/0.1.29). The exact same
  bundled JavaScript is shipped by the upstream author at
  https://unpkg.com/react-grab@0.1.29/dist/index.global.js, and its sha256
  is 4a1e71090e8ad8bb6049de80ccccdc0f5bb147b9f8fb88886d871612ac7ca04b.
- dist/src/content/bridge.js, react-grab.js content-script glue, crosshair.ts
  and screenshot.ts are all from src/ in the source archive.
- dist/src/background/service-worker.js is the compiled
  src/background/service-worker.ts.

Source maps are not shipped to keep the bundle small; reviewers reproducing
the build will see the same minified output.

Lint note: web-ext lint emits one UNSAFE_VAR_ASSIGNMENT warning on
dist/src/content/react-grab.js. That assignment lives in the vendored
react-grab@0.1.29 bundle (the upstream toolbar component setting
innerHTML on a shadow-DOM element it owns) and is not our code. The
shadow host is isolated; the input is library-controlled, not page or
user input. We do not modify react-grab.

Permissions explained:
- storage: persists one boolean (react_grab_enabled).
- activeTab: required for chrome.tabs.captureVisibleTab in the Screenshot
  action; only invoked after the user explicitly triggers the action via
  the in-page toolbar.
- <all_urls> host_permission: content scripts inject into all pages so the
  cursor can be summoned on any site. No page content is read unless the
  user explicitly clicks an element with the cursor armed.

---

## Categories

Primary: Developer Tools
Secondary: Other

## Tags

react, vue, svelte, ai, llm, copilot, cursor, claude, chatgpt, devtools, components, markdown, screenshot

## Homepage URL

https://github.com/Dananz/grab-context

## Support email

(your email)

## Support URL

https://github.com/Dananz/grab-context/issues

## Privacy policy URL

https://dananz.github.io/grab-context/privacy

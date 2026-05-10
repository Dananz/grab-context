# AMO submission copy

Paste the relevant section into the matching field on
https://addons.mozilla.org/developers/.

---

## Summary (max 250 chars)

Click any element on a page to copy it as Markdown ready to paste into ChatGPT, Claude, Cursor, or Copilot. Detects React, Vue, and Svelte components and includes their names and source files in the copied context.

---

## Description (long form)

Grab Context turns any web page into a clip source for AI coding assistants.

Click the toolbar button to enable a selection cursor on the current tab. Click any element and it is copied to your clipboard as clean Markdown, including:

- The element's HTML, converted to Markdown via Turndown
- Component name and source file when the element belongs to a React, Vue, or Svelte component
- A concise selector path so the assistant can locate the element again

Paste the result into ChatGPT, Claude, Cursor, GitHub Copilot Chat, or any chat tool. The assistant gets the exact element you wanted to discuss without you having to describe it.

### Component detection

- React: walks the React fiber tree using bippy and resolves the nearest named component.
- Vue 3: reads __vueParentComponent and pulls the component name from type.__name and the source file from type.__file in dev builds. Also reads data-v-inspector attributes when vite-plugin-vue-inspector is installed.
- Svelte: reads __svelte_meta to get the component file and line.

In production builds without dev metadata, the extension still copies clean HTML and a CSS selector for the clicked element.

### Privacy

Grab Context runs entirely in your browser. It does not send any page content, clipboard data, or telemetry to any server. The only network access happens when you click the toolbar button on localhost; on local development origins the extension waits briefly to coordinate with any react-grab instance the page may have installed itself. No analytics, no remote configuration, no account.

The "storage" permission is used only to remember whether the toolbar is enabled and where you docked it, in chrome.storage.local on this device.

The "<all_urls>" host permission is required because the extension must inject the selection cursor into whatever page you click on. The extension does not read or transmit page content unless you explicitly click an element with the cursor active, in which case the result is written only to your local clipboard.

### Source code and licensing

This extension is open source and built from publicly available components.

- The element-selection engine is react-grab by Aiden Bai (MIT), https://github.com/aidenybai/react-grab — pinned to version 0.1.29, the release that ships Vue and Svelte detection.
- Markdown conversion uses Turndown by Dom Christie (MIT), https://github.com/mixmark-io/turndown.
- Icons are derived from Phosphor Icons by Helena Zhang and Tobias Fried (MIT), https://github.com/phosphor-icons/core.

This Firefox build, the manifest, the auto-copy default-action wiring, and the icon are by Tomer Danan and are MIT licensed. The full extension source is at:

  https://github.com/Dananz/grab-context

There is also an official Chrome build of react-grab maintained by the upstream author, available on the Chrome Web Store. This Firefox build exists because the upstream extension repository did not previously target Firefox.

---

## Notes to reviewer (private field)

Build instructions, in case you need to reproduce the bundle:

  pnpm install
  pnpm build
  cd dist && zip -r ../grab-context.xpi . -x "*.DS_Store"

The bundle in dist/src/content/react-grab.js is produced by Vite from the upstream npm package "react-grab" at version 0.1.29 plus our content-script glue at src/content/react-grab.ts. The published react-grab dist is the same file Aiden Bai distributes via npm and unpkg. Source maps are included in the build.

This extension does not load any remote code at runtime. All JavaScript is bundled at build time.

---

## Categories

Primary: Developer Tools
Secondary: Other

## Tags

react, vue, svelte, ai, llm, copilot, cursor, claude, chatgpt, devtools, components, markdown

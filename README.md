# Grab Context — Firefox extension

Click any element on a web page to copy it as Markdown for AI coding assistants. Detects React, Vue, and Svelte component names and source files.

This is a Firefox build that bundles [`react-grab`](https://github.com/aidenybai/react-grab) (MIT, by Aiden Bai) at version `0.1.29` — the release that ships Vue and Svelte detection alongside React. Markdown conversion is via [Turndown](https://github.com/mixmark-io/turndown). Toolbar icon derived from [Phosphor Icons](https://github.com/phosphor-icons/core). See [`NOTICE`](./NOTICE) for full attribution.

## What it does

1. Click the toolbar button to enable a selection cursor on the active tab.
2. Click any element. The element is copied to the clipboard as Markdown, with the React / Vue / Svelte component name and source file appended when available.
3. Paste into ChatGPT, Claude, Cursor, Copilot Chat, etc.

## Component detection

| Framework | Method |
| --- | --- |
| React | Walks the fiber tree via `bippy`, resolves the nearest named component |
| Vue 3 | Reads `__vueParentComponent`, then `type.__name` and `type.__file` (dev builds), plus `data-v-inspector` from `vite-plugin-vue-inspector` |
| Svelte | Reads `__svelte_meta` |

In production builds without dev metadata, copies clean HTML and a CSS selector instead.

## Build

```bash
pnpm install
pnpm build           # outputs dist/
pnpm package         # outputs grab-context.xpi
```

## Sideload (temporary)

1. `about:debugging#/runtime/this-firefox`
2. *Load Temporary Add-on…* → select `dist/manifest.json`.

## Permanent install (signed)

Self-distribution signing via AMO:

```bash
pnpm dlx web-ext sign \
  --source-dir=dist \
  --api-key="$AMO_JWT_ISSUER" \
  --api-secret="$AMO_JWT_SECRET" \
  --channel=unlisted
```

The signed XPI from `web-ext-artifacts/` installs permanently in regular Firefox.

## Notes

- Targets Firefox 128+ (`world: "MAIN"` content scripts).
- Background uses `background.scripts` (event page), not `service_worker`.
- Uses the `chrome.*` API (Firefox 109+ aliases), so the upstream content-script source is unchanged.
- Default click action is `copy` instead of `comment`, so a single click copies immediately with no prompt.
- Add-on id is `grab-context@tomerdanan.dev` — change it in `src/manifest.json` if you republish under a different namespace.

## License

MIT — see [`LICENSE`](./LICENSE). Bundled dependencies remain under their own MIT licenses; see [`NOTICE`](./NOTICE).

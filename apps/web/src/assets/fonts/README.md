# Fonts

The design system specifies three faces (docs/15-DESIGN-SYSTEM.md §3). No binary font
files are committed here — drop them in yourself and the `@font-face` rules in
`src/styles/index.css` pick them up. Until they exist the stack degrades to
`ui-sans-serif` / `ui-monospace`, so the app builds and runs unstyled-but-correct.

## What to drop in, and where

Serving directory: **`apps/web/public/fonts/`** — not this directory.

`public/` is copied verbatim by Vite and its URLs are not resolved at build time, so a
missing file is a runtime 404 with a font fallback rather than a failed build. This
directory (`src/assets/fonts/`) is where subsetting _sources_ live if you keep them in
the repo; the artefacts that ship go to `public/fonts/`.

| File name (exact)                        | Face                          | Axes needed                     |
| ---------------------------------------- | ----------------------------- | ------------------------------- |
| `public/fonts/archivo-variable.woff2`    | Archivo (body + display)      | `wght 100..900`, `wdth 62..125` |
| `public/fonts/geist-mono-variable.woff2` | Geist Mono (all machine text) | `wght 100..900`                 |

One Archivo file covers both `Archivo` and `Archivo Expanded`: the second `@font-face`
pins `font-stretch: 125%` on the same source, which drives the `wdth` axis. Do not ship
a separate expanded file.

## Where to get them

- **Archivo** — Omnibus-Type, OFL-1.1. Variable TTF at
  <https://github.com/Omnibus-Type/Archivo> (`fonts/variable/Archivo[wdth,wght].ttf`),
  or Google Fonts → "Archivo" → download family.
- **Geist Mono** — Vercel, OFL-1.1. Variable TTF at
  <https://github.com/vercel/geist-font> (`packages/next/dist/fonts/geist-mono/`),
  or <https://vercel.com/font>.

## Converting and subsetting

Both sources ship as variable TTF. Convert to `woff2` and subset to the Latin +
Latin-Extended-A range that `en` and `cs` need (Czech needs `čďěňřšťůž` and their caps),
keeping the variable axes intact:

```sh
pip install fonttools brotli

fonttools varLib.instancer "Archivo[wdth,wght].ttf" \
  --output archivo-variable-axes.ttf   # only if you need to pin an axis; usually skip

pyftsubset "Archivo[wdth,wght].ttf" \
  --output-file=archivo-variable.woff2 \
  --flavor=woff2 \
  --layout-features='*' \
  --unicodes=U+0000-00FF,U+0100-017F,U+2000-206F,U+2070-209F,U+20A0-20BF,U+2190-21FF,U+2212,U+2500-257F \
  --drop-tables+=DSIG

pyftsubset "GeistMono[wght].ttf" \
  --output-file=geist-mono-variable.woff2 \
  --flavor=woff2 \
  --layout-features='*,tnum,zero' \
  --unicodes=U+0000-00FF,U+0100-017F,U+2000-206F,U+2070-209F,U+20A0-20BF,U+2190-21FF,U+2212,U+2500-257F \
  --drop-tables+=DSIG
```

Keep `tnum` in Geist Mono's feature list — every number in a table and every delta
badge relies on tabular figures (§3).

## After dropping them in

Add preloads to `index.html` so the display face is not swapped in after LCP:

```html
<link rel="preload" href="/fonts/archivo-variable.woff2" as="font" type="font/woff2" crossorigin />
<link
  rel="preload"
  href="/fonts/geist-mono-variable.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

No external font CDN, ever — the CSP forbids it (§3).

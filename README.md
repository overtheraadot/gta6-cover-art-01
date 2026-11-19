# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/overtheraadot/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/overtheraadot/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Sunset Split turns a photo and a caption into GTA-style cover art: slanted
multi-panel posters with white gutters, a big condensed caption with an outline
and an accent shadow, and a sunset or neon colour grade. Three layouts (Split,
Triptych, Hero), four grades (Vice Sunset, Neon Night, Pastel Vice, Noir), and
exports at the three common post sizes — 1080 × 1080, 1080 × 1350 and
1920 × 1080 PNG.

Each panel takes its own photo: click a panel on the preview to select it, drag
to pan, scroll to zoom, or load one photo into every panel. The caption,
tagline and kicker are editable live. Everything runs offline as static files
under `app/` — no build step, no network, photos never leave your machine.

Original work only: no Rockstar Games logos, artwork or fonts. The condensed
type is Noto Sans Condensed (Black + Bold) under the SIL Open Font License,
shipped in `app/fonts/` with its license. Sample photos are stock images
included with the app.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — pick a sample photo or load your own, write
a caption, choose a layout, grade and size, and press **Export PNG**.

To hand the entry in (what the grader runs):

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` into `out/` and writes `out/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=overtheraa.ai&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

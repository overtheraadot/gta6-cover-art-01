// Vice Sunset Split — the entry program for make.fun gta6-cover-art-01.
//
// Node 22, standard library only. It takes the app/ folder and the screenshots/
// folder sitting beside this file, copies both into the output directory, and
// writes output/dossier.json with the kit's vendored library, so the judge can
// read the app's source and screenshots. Nothing is built and nothing is fetched:
// the app is plain static files a browser opens offline.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The folder this file lives in, and the folder the dossier goes to.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

// The whole app, exactly as it sits in the repository.
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

// The screenshots, when the folder exists (it always does in this repo).
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier, under the scorer's caps from the kit's gate: the text is capped at
// 160 KiB, at most 4 screenshots of 256 KiB each, and app/ stays inside 993
// files / 48 MiB with no path over 1000 bytes, so the whole output fits the
// platform's own 1000-entry / 64 MiB limit with room to spare.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

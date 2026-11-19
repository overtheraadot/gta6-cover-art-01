// Vice Sunset Split — the entrypoint the grader runs (Node 22).
//
// It hands the app in: copy app/ and screenshots/ from this repository into
// the output directory (MAKEFUN_OUTPUT_DIR, or /output when unset), then
// write /output/dossier.json with buildDossier from vendor/makefun-app.ts,
// the kit's own copy, unchanged. The copy is plain and ordered, so two runs
// over the same repository write byte-identical output.

import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

/** Copy a directory tree, entries in code-unit order, files only. */
function copyTree(sourceDir: string, targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  const entries = readdirSync(sourceDir).sort();
  for (const name of entries) {
    const from = join(sourceDir, name);
    const to = join(targetDir, name);
    const info = statSync(from);
    if (info.isDirectory()) {
      copyTree(from, to);
    } else if (info.isFile()) {
      copyFileSync(from, to);
    }
    // Anything else (a link, a socket) is left behind on purpose.
  }
}

mkdirSync(outputRoot, { recursive: true });
for (const part of ['app', 'screenshots']) {
  const target = join(outputRoot, part);
  rmSync(target, { recursive: true, force: true });
  copyTree(join(repoRoot, part), target);
}

const dossier = buildDossier(outputRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputRoot, 'dossier.json'), dossier);
console.log(`wrote ${join(outputRoot, 'dossier.json')} (${dossier.length} bytes)`);

/**
 * FeeFlow — icon + social preview builder.
 *
 * Regenerates every raster asset in `assets/icons/` (and `assets/og-image.png`)
 * from the hand-authored SVG sources in `assets/icons/src/`.
 *
 * Usage:
 *   npm install            # dev dependencies only, nothing ships at runtime
 *   npm run build:assets   # add --og to also rebuild the social preview image
 *
 * The published site itself has zero runtime dependencies — the PNGs produced
 * here are committed, so deploying FeeFlow never needs a build step.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'assets', 'icons', 'src');
const outDir = join(root, 'assets', 'icons');
// resvg's font loader wants full TTFs; the dev dependencies below ship the same
// typefaces the site uses (web woff2 subsets live in assets/fonts/).
const cacheDir = join(tmpdir(), 'feeflow-font-cache');

mkdirSync(outDir, { recursive: true });
mkdirSync(cacheDir, { recursive: true });

/** Copy a TTF out of the @expo-google-fonts packages into the font cache. */
function ttf(pkg, file) {
  const source = dirname(require.resolve(`@expo-google-fonts/${pkg}/package.json`));
  const family = {
    'instrument-serif': 'InstrumentSerif',
    'plus-jakarta-sans': 'PlusJakartaSans',
    'jetbrains-mono': 'JetBrainsMono',
  }[pkg];
  const name = `${family}_${file}.ttf`;
  copyFileSync(join(source, file, name), join(cacheDir, name));
}

[
  ['instrument-serif', '400Regular'],
  ['instrument-serif', '400Regular_Italic'],
  ['plus-jakarta-sans', '400Regular'],
  ['plus-jakarta-sans', '500Medium'],
  ['plus-jakarta-sans', '600SemiBold'],
  ['plus-jakarta-sans', '700Bold'],
  ['plus-jakarta-sans', '800ExtraBold'],
  ['jetbrains-mono', '500Medium'],
  ['jetbrains-mono', '600SemiBold'],
  ['jetbrains-mono', '700Bold'],
].forEach(([pkg, file]) => ttf(pkg, file));

/** Rasterise an SVG string to a PNG of the given width. */
function render(svg, width, file) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontDirs: [cacheDir], loadSystemFonts: false, defaultFontFamily: 'Plus Jakarta Sans' },
  });
  const png = resvg.render().asPng();
  writeFileSync(file, png);
  console.log(`  ✓ ${file.replace(root + '/', '')}  (${(png.length / 1024).toFixed(1)} kB, ${width}px)`);
}

const read = (name) => readFileSync(join(srcDir, name), 'utf8');

console.log('Building FeeFlow raster assets…');

render(read('brand-mark.svg'), 192, join(outDir, 'icon-192.png'));
render(read('brand-mark.svg'), 512, join(outDir, 'icon-512.png'));
render(read('maskable.svg'), 512, join(outDir, 'maskable-512.png'));
render(read('brand-mark.svg'), 180, join(outDir, 'apple-touch-icon.png'));
render(read('brand-mark.svg'), 32, join(outDir, 'favicon-32.png'));

if (process.argv.includes('--og')) {
  render(read('og-image.svg'), 1200, join(root, 'assets', 'og-image.png'));
}

console.log('Done.');

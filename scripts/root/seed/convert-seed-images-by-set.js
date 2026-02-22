#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};
function log(msg, color = colors.reset) {
  console.log(color + msg + colors.reset);
}

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const INPUT_ROOT = path.join(PROJECT_ROOT, 'temp-images');
const MANIFEST = path.join(PROJECT_ROOT, 'backend', 'prisma', 'seed-product-sets.json');
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'frontend', 'public');

const DEFAULTS = {
  quality: 85,
  resizeWidth: 1200,
  dryRun: false,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { ...DEFAULTS };
  for (const arg of args) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg.startsWith('--quality=')) {
      const q = Number(arg.split('=')[1]);
      if (!Number.isNaN(q) && q >= 1 && q <= 100) opts.quality = q;
    } else if (arg.startsWith('--width=')) {
      const w = Number(arg.split('=')[1]);
      if (!Number.isNaN(w) && w >= 200) opts.resizeWidth = w;
    }
  }
  return opts;
}

function safeSlug(s) {
  return String(s || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function resolveExistingDirCaseInsensitive(absPath) {
  if (fs.existsSync(absPath)) return absPath;
  const parsed = path.parse(absPath);
  const parts = parsed.dir.split(path.sep).filter(Boolean);
  const root = parsed.root;
  let cur = root;
  for (const part of parts) {
    if (!fs.existsSync(cur)) return null;
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    const match = entries.find((e) => e.isDirectory() && e.name.toLowerCase() === part.toLowerCase());
    if (!match) return null;
    cur = path.join(cur, match.name);
  }
  if (!fs.existsSync(cur)) return null;
  const entries = fs.readdirSync(cur, { withFileTypes: true });
  const lastMatch = entries.find((e) => e.isDirectory() && e.name.toLowerCase() === parsed.base.toLowerCase());
  return lastMatch ? path.join(cur, lastMatch.name) : null;
}

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const supported = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  return fs
    .readdirSync(dirPath)
    .filter((f) => !f.startsWith('.') && supported.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function convertOne(inputPath, outputPath, opts) {
  if (opts.dryRun) return true;
  await sharp(inputPath)
    .resize({ width: opts.resizeWidth, withoutEnlargement: true })
    .webp({ quality: opts.quality })
    .toFile(outputPath);
  return true;
}

function ensureDir(dirPath, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolvePublicUrlToFsPath(publicUrl) {
  // publicUrl: /images/seed_images/...
  const rel = publicUrl.startsWith('/') ? publicUrl.slice(1) : publicUrl;
  return path.join(PUBLIC_ROOT, rel.split('/').join(path.sep));
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST)) {
    throw new Error(`Missing manifest: ${MANIFEST}`);
  }
  const raw = fs.readFileSync(MANIFEST, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('seed-product-sets.json must be an array');
  return parsed;
}

function findStyleDirByScanning(productType, groupSlug, styleCode) {
  const base = path.join(INPUT_ROOT, productType, groupSlug);
  if (!fs.existsSync(base)) return null;
  const entries = fs.readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory());
  const wanted = styleCode.toLowerCase();
  let exact = entries.find((e) => e.name.toLowerCase() === wanted);
  if (exact) return path.join(base, exact.name);
  // Fallback: if user used a different style folder name, but only 1 exists, assume it's it
  if (entries.length === 1) return path.join(base, entries[0].name);
  return null;
}

async function main() {
  const opts = parseArgs();

  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║   CONVERT SEED IMAGES BY PRODUCT SET (SPU)    ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝\n', colors.cyan);
  if (opts.dryRun) log('⚠️  DRY RUN MODE - no files will be written\n', colors.yellow);

  const sets = loadManifest();
  let totalWritten = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const set of sets) {
    const styleCode = safeSlug(set.styleCode);
    const groupSlug = safeSlug(set.groupSlug);
    const productType = String(set.productType || '').toLowerCase();

    if (!styleCode || !groupSlug) {
      log(`❌ Invalid set: missing groupSlug/styleCode`, colors.red);
      totalFailed++;
      continue;
    }

    const inputDirExpected = path.join(INPUT_ROOT, productType, groupSlug, styleCode);
    const inputDirResolved =
      resolveExistingDirCaseInsensitive(inputDirExpected) ||
      findStyleDirByScanning(productType, groupSlug, styleCode) ||
      inputDirExpected;

    if (!fs.existsSync(inputDirResolved)) {
      const hint = path.join(INPUT_ROOT, productType, groupSlug, '<STYLE_CODE>', '<colorSlug>');
      log(`\n⚠️  Skip ${styleCode}: input folder not found: ${inputDirExpected}`, colors.yellow);
      log(`    💡 Put images under: ${hint}`, colors.cyan);
      continue;
    }

    const inputDir = inputDirResolved;

    log(`\n📦 ${groupSlug}/${styleCode} (${productType})`, colors.magenta);
    const colorsArr = Array.isArray(set.colors) ? set.colors : [];
    for (const color of colorsArr) {
      const colorSlug = safeSlug(color.colorSlug);
      if (!colorSlug) continue;

      const colorInputDirExpected = path.join(inputDir, colorSlug);
      const colorInputDir = resolveExistingDirCaseInsensitive(colorInputDirExpected) || colorInputDirExpected;
      const files = listImageFiles(colorInputDir);
      if (files.length === 0) {
        log(`  ⚠️  ${colorSlug}: no input images at ${colorInputDir}`, colors.yellow);
        continue;
      }

      // Determine output folder from manifest URLs
      const images = Array.isArray(color.images) ? color.images : [];

      // Prefer deterministic base URL in the same folder for this set/color
      const baseUrl = `/images/seed_images/${groupSlug}/${styleCode}/${colorSlug}`;
      const firstUrl = images.find((u) => typeof u === 'string' && u.startsWith(baseUrl + '/')) || `${baseUrl}/__placeholder__.webp`;
      if (!firstUrl || typeof firstUrl !== 'string') {
        log(`  ❌ ${colorSlug}: manifest missing images[] URLs`, colors.red);
        totalFailed++;
        continue;
      }

      const outputDir = path.dirname(resolvePublicUrlToFsPath(firstUrl));
      ensureDir(outputDir, opts.dryRun);

      log(`  🎨 ${colorSlug}: ${files.length} file(s) → ${outputDir}`, colors.cyan);
      for (let i = 0; i < files.length; i++) {
        const inFile = files[i];
        const inPath = path.join(colorInputDir, inFile);
        const outName = `${styleCode}-${colorSlug}-${i + 1}.webp`;
        const outPath = path.join(outputDir, outName);
        const outUrl = `${baseUrl}/${outName}`;

        try {
          if (fs.existsSync(outPath)) {
            totalSkipped++;
            log(`    ↷ exists, skip: ${outName}`, colors.yellow);
            continue;
          }
          await convertOne(inPath, outPath, opts);
          totalWritten++;
          log(`    ✅ ${path.basename(inFile)} → ${outName}`, colors.green);

          // Ensure manifest has correct URL list (only our generated naming)
          if (!images.includes(outUrl)) images.push(outUrl);
        } catch (e) {
          totalFailed++;
          log(`    ❌ Failed: ${inFile} (${e && e.message ? e.message : e})`, colors.red);
        }
      }

      // Drop any legacy placeholder entries like .../1.webp, .../2.webp to avoid mixing naming schemes
      color.images = images.filter((u) => typeof u === 'string' && u.startsWith(baseUrl + '/') && !/\/(\d+)\.webp$/.test(u));
    }
  }

  if (!opts.dryRun) {
    fs.writeFileSync(MANIFEST, JSON.stringify(sets, null, 2) + '\n', 'utf-8');
  }

  log('\n' + '═'.repeat(60), colors.cyan);
  log(`Written: ${totalWritten}`, totalWritten ? colors.green : colors.yellow);
  log(`Skipped (already exists): ${totalSkipped}`, colors.cyan);
  log(`Failed: ${totalFailed}`, totalFailed ? colors.red : colors.green);
  log(`\nManifest: ${MANIFEST}`, colors.cyan);
  log(`Input root: ${INPUT_ROOT}`, colors.cyan);
  log(`Public root: ${PUBLIC_ROOT}\n`, colors.cyan);
}

main().catch((e) => {
  log(`\n❌ Error: ${e.message || e}`, colors.red);
  process.exit(1);
});

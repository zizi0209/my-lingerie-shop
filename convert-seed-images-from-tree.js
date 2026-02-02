#!/usr/bin/env node

/**
 * Convert seed images from temp-images tree structure to webp format
 * 
 * Structure: temp-images/<loại>/<dòng>/<SPU>/<màu-slug>/images...
 * 
 * màu-slug must match color slugs in DB:
 *   den, trang, hong, do, xanh-duong, xanh-la, tim, nude, be, xam, nau, vang, cam, navy, ruou-vang
 * 
 * Usage:
 *   node convert-seed-images-from-tree.js [--dry-run] [--no-manifest] [--quality=85] [--width=1200]
 */
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

const PROJECT_ROOT = __dirname;
const INPUT_ROOT = path.join(PROJECT_ROOT, 'temp-images');
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'frontend', 'public');
const OUTPUT_ROOT = path.join(PUBLIC_ROOT, 'images', 'seed_images');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'backend', 'prisma', 'seed-product-sets.json');

const PRODUCT_TYPE_MAP = {
  bra: 'BRA',
  panty: 'PANTY',
  set: 'SET',
  sleepwear: 'SLEEPWEAR',
  shapewear: 'SHAPEWEAR',
  accessory: 'ACCESSORY',
};

// Map productType folder to categorySlug
const CATEGORY_SLUG_MAP = {
  bra: 'ao-lot',
  panty: 'quan-lot',
  set: 'bo-do-lot',
  sleepwear: 'do-ngu',
  shapewear: 'do-gen',
  accessory: 'phu-kien',
};

// Valid color slugs (must exist in DB Color table)
const VALID_COLOR_SLUGS = [
  'den', 'trang', 'hong', 'do', 'xanh-duong', 'xanh-la', 'tim',
  'nude', 'be', 'xam', 'nau', 'vang', 'cam', 'navy', 'ruou-vang'
];

const DEFAULTS = {
  quality: 85,
  width: 1200,
  dryRun: false,
  writeManifest: true,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { ...DEFAULTS };
  for (const arg of args) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--no-manifest') opts.writeManifest = false;
    else if (arg.startsWith('--quality=')) {
      const q = Number(arg.split('=')[1]);
      if (!Number.isNaN(q) && q >= 1 && q <= 100) opts.quality = q;
    } else if (arg.startsWith('--width=')) {
      const w = Number(arg.split('=')[1]);
      if (!Number.isNaN(w) && w >= 200) opts.width = w;
    }
  }
  return opts;
}

function isImageFile(file) {
  const ext = path.extname(file).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
}

function listDirs(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name);
}

function listImages(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((f) => !f.startsWith('.') && isImageFile(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function ensureDir(dirPath, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

async function toWebp(inputPath, outputPath, opts) {
  if (opts.dryRun) return;
  await sharp(inputPath)
    .resize({ width: opts.width, withoutEnlargement: true })
    .webp({ quality: opts.quality })
    .toFile(outputPath);
}

function buildOutputUrl(groupSlug, spu, colorSlug, filename) {
  if (colorSlug) {
    return `/images/seed_images/${groupSlug}/${spu}/${colorSlug}/${filename}`;
  }
  return `/images/seed_images/${groupSlug}/${spu}/${filename}`;
}

function validateColorSlug(slug) {
  return VALID_COLOR_SLUGS.includes(slug);
}

async function main() {
  const opts = parseArgs();

  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║   CONVERT SEED IMAGES FROM temp-images TREE    ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝\n', colors.cyan);
  if (opts.dryRun) log('⚠️  DRY RUN MODE - no files will be written\n', colors.yellow);

  const productTypeDirs = listDirs(INPUT_ROOT);
  const entries = [];

  let written = 0;
  let skipped = 0;
  let failed = 0;
  let invalidColors = [];

  for (const ptDir of productTypeDirs) {
    const productType = PRODUCT_TYPE_MAP[ptDir.toLowerCase()];
    if (!productType) continue;

    const categorySlug = CATEGORY_SLUG_MAP[ptDir.toLowerCase()] || 'phu-kien';
    const ptPath = path.join(INPUT_ROOT, ptDir);
    const groupSlugs = listDirs(ptPath);
    for (const groupSlug of groupSlugs) {
      const groupPath = path.join(ptPath, groupSlug);
      const spus = listDirs(groupPath);
      for (const spu of spus) {
        const spuPath = path.join(groupPath, spu);

        // Detect whether this SPU has color subfolders
        const subDirs = listDirs(spuPath);
        const hasColorLevel = subDirs.length > 0 && subDirs.every((d) => listImages(path.join(spuPath, d)).length > 0 || listDirs(path.join(spuPath, d)).length === 0 || true);

        const colorNodes = [];
        if (subDirs.length > 0) {
          // Treat subdirs as colors
          for (const colorSlug of subDirs) {
            // Validate color slug
            if (!validateColorSlug(colorSlug)) {
              invalidColors.push({ path: `${ptDir}/${groupSlug}/${spu}/${colorSlug}`, slug: colorSlug });
              log(`  ⚠️  Invalid color slug: "${colorSlug}" - skipping`, colors.yellow);
              continue;
            }
            const colorPath = path.join(spuPath, colorSlug);
            const imgs = listImages(colorPath);
            if (imgs.length === 0) continue;
            colorNodes.push({ colorSlug, imagesDir: colorPath, images: imgs });
          }
        }

        // If no color folders with images, treat SPU folder as "no-color" images
        const rootImgs = listImages(spuPath);
        if (colorNodes.length === 0 && rootImgs.length > 0) {
          // No color classification for products without color folders
          colorNodes.push({ colorSlug: null, imagesDir: spuPath, images: rootImgs, isNoColorFolder: true });
        }

        if (colorNodes.length === 0) continue;

        log(`\n📦 ${ptDir}/${groupSlug}/${spu}`, colors.magenta);

        const manifestColors = [];
        for (const node of colorNodes) {
          const colorSlug = node.colorSlug;
          const outDir = colorSlug != null
            ? path.join(OUTPUT_ROOT, groupSlug, spu, colorSlug)
            : path.join(OUTPUT_ROOT, groupSlug, spu);
          ensureDir(outDir, opts.dryRun);

          const urls = [];
          for (let i = 0; i < node.images.length; i++) {
            const inName = node.images[i];
            const inPath = path.join(node.imagesDir, inName);

            const outName = colorSlug != null
              ? `${spu}-${colorSlug}-${i + 1}.webp`
              : `${spu}-${i + 1}.webp`;
            const outPath = path.join(outDir, outName);

            try {
              if (fs.existsSync(outPath)) {
                skipped++;
              } else {
                await toWebp(inPath, outPath, opts);
                written++;
              }
              urls.push(buildOutputUrl(groupSlug, spu, colorSlug, outName));
            } catch (e) {
              failed++;
              log(`  ❌ ${inName} → ${outName}: ${e && e.message ? e.message : e}`, colors.red);
            }
          }

          manifestColors.push({
            colorSlug: colorSlug || 'den',
            colorSlug: colorSlug,
            isDefault: colorSlug == null || manifestColors.length === 0,
            images: urls,
            sizes: [{ size: 'Free Size', stock: 10 }],
          });

          if (node.isNoColorFolder) {
            log(`  🖼️  no-color folder (default to 'den'): ${node.images.length} img(s)`, colors.yellow);
            log(`  🖼️  no color classification: ${node.images.length} img(s)`, colors.yellow);
            log(`  🎨 ${colorSlug}: ${node.images.length} img(s)`, colors.cyan);
          }
        }

        entries.push({
          groupSlug,
          styleCode: spu,
          productType,
          categorySlug,
          name: groupSlug,
          descriptionHtml: null,
          price: 100000,
          salePrice: null,
          isFeatured: false,
          isVisible: true,
          colors: manifestColors,
        });
      }
    }
  }

  if (opts.writeManifest) {
    ensureDir(path.dirname(MANIFEST_PATH), opts.dryRun);
    if (!opts.dryRun) {
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2) + '\n', 'utf-8');
    }
  }

  log('\n' + '═'.repeat(60), colors.cyan);
  log(`Written: ${written}`, written ? colors.green : colors.yellow);
  log(`Skipped: ${skipped}`, colors.cyan);
  log(`Failed: ${failed}`, failed ? colors.red : colors.green);
  if (invalidColors.length > 0) {
    log(`\n⚠️  Invalid color slugs found (${invalidColors.length}):`, colors.yellow);
    for (const ic of invalidColors) {
      log(`   ${ic.path} → "${ic.slug}"`, colors.yellow);
    }
    log(`\nValid slugs: ${VALID_COLOR_SLUGS.join(', ')}`, colors.cyan);
  }
  log(`Output: ${OUTPUT_ROOT}`, colors.cyan);
  log(`Manifest: ${MANIFEST_PATH} ${opts.writeManifest ? '' : '(not written)'}`, colors.cyan);
  log('', colors.reset);
}

main().catch((e) => {
  log(`\n❌ Error: ${e.message || e}`, colors.red);
  process.exit(1);
});

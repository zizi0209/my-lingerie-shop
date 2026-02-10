#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CONFIG = {
  sourceDir: path.join(__dirname, 'temp-images'),
  targetDir: path.join(__dirname, 'frontend', 'public', 'images', 'seed'),
  quality: 85,
  resize: { width: 1200 },
  categories: ['bra', 'panty', 'set', 'sleepwear', 'shapewear', 'accessory'],
  supportedFormats: ['.jpg', '.jpeg', '.png', '.webp']
};

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m', magenta: '\x1b[35m' };
function log(msg, color = colors.reset) { console.log(color + msg + colors.reset); }

function setupTempDirectories() {
  if (!fs.existsSync(CONFIG.sourceDir)) fs.mkdirSync(CONFIG.sourceDir, { recursive: true });
  CONFIG.categories.forEach(cat => {
    const dir = path.join(CONFIG.sourceDir, cat);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function getImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).filter(f => CONFIG.supportedFormats.includes(path.extname(f).toLowerCase())).sort();
}

async function convertToWebP(inputPath, outputPath, index, category) {
  try {
    await sharp(inputPath).resize({ width: CONFIG.resize.width, withoutEnlargement: true }).webp({ quality: CONFIG.quality }).toFile(outputPath);
    const inSize = fs.statSync(inputPath).size;
    const outSize = fs.statSync(outputPath).size;
    const saved = Math.round((1 - outSize / inSize) * 100);
    log(`  ✅ ${category}-${index}.webp - ${(inSize/1024).toFixed(1)}KB → ${(outSize/1024).toFixed(1)}KB (saved ${saved}%)`, colors.green);
    return true;
  } catch (error) {
    log(`  ❌ Failed: ${path.basename(inputPath)} - ${error.message}`, colors.red);
    return false;
  }
}

async function processCategory(category, dryRun = false) {
  const sourceDir = path.join(CONFIG.sourceDir, category);
  const targetDir = path.join(CONFIG.targetDir, category);
  const imageFiles = getImageFiles(sourceDir);
  if (imageFiles.length === 0) {
    log(`\n⚠️  ${category.toUpperCase()}: No images found`, colors.yellow);
    return { processed: 0, failed: 0 };
  }
  log(`\n📸 ${category.toUpperCase()}: Found ${imageFiles.length} images`, colors.magenta);
  let processed = 0, failed = 0;
  for (let i = 0; i < imageFiles.length; i++) {
    const inputPath = path.join(sourceDir, imageFiles[i]);
    const outputPath = path.join(targetDir, `${category}-${i + 1}.webp`);
    if (dryRun) {
      log(`  [DRY RUN] Would convert: ${imageFiles[i]} → ${category}-${i + 1}.webp`, colors.cyan);
      processed++;
    } else {
      const success = await convertToWebP(inputPath, outputPath, i + 1, category);
      if (success) {
        processed++;
      } else {
        failed++;
      }
    }
  }
  return { processed, failed };
}

async function convertImages(dryRun = false) {
  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║     AUTOMATED SEED IMAGES CONVERTER           ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝', colors.cyan);
  if (dryRun) log('\n⚠️  DRY RUN MODE - No files will be modified\n', colors.yellow);
  log(`\n📁 Source: ${CONFIG.sourceDir}`, colors.cyan);
  log(`📁 Target: ${CONFIG.targetDir}`, colors.cyan);
  log(`⚙️  Quality: ${CONFIG.quality}`, colors.cyan);
  log(`📐 Max Width: ${CONFIG.resize.width}px\n`, colors.cyan);
  const stats = { totalProcessed: 0, totalFailed: 0 };
  for (const category of CONFIG.categories) {
    const result = await processCategory(category, dryRun);
    stats.totalProcessed += result.processed;
    stats.totalFailed += result.failed;
  }
  log('\n' + '═'.repeat(60), colors.cyan);
  log('\n📊 SUMMARY\n', colors.magenta);
  log(`Total processed: ${stats.totalProcessed}`, stats.totalProcessed > 0 ? colors.green : colors.yellow);
  log(`Total failed: ${stats.totalFailed}`, stats.totalFailed > 0 ? colors.red : colors.green);
  if (stats.totalProcessed > 0 && !dryRun) {
    log('\n✅ Conversion complete!', colors.green);
    log('\n🔍 Verify: node verify-seed-images.js', colors.cyan);
    log('🌱 Seed: cd backend && npx ts-node prisma/seed-products.ts\n', colors.cyan);
  } else if (stats.totalProcessed === 0) {
    log('\n⚠️  No images to process!', colors.yellow);
    log(`\n📝 Place images in: ${CONFIG.sourceDir}/{category}/`, colors.cyan);
    log('   Categories: bra, panty, set, sleepwear, shapewear, accessory\n');
  }
}

function showInstructions() {
  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║     HOW TO USE                                ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝\n', colors.cyan);
  log('📝 Step-by-step:\n', colors.magenta);
  log('1. Download images (any format: jpg, png, webp)');
  log(`\n2. Organize into folders: ${CONFIG.sourceDir}/`, colors.cyan);
  log('   ├── bra/         (put bra images here)', colors.cyan);
  log('   ├── panty/       (put panty images here)', colors.cyan);
  log('   ├── set/         (put set images here)', colors.cyan);
  log('   ├── sleepwear/   (put sleepwear images here)', colors.cyan);
  log('   ├── shapewear/   (put shapewear images here)', colors.cyan);
  log('   └── accessory/   (put accessory images here)\n', colors.cyan);
  log('3. Run this script:', colors.green);
  log('   node convert-seed-images.js\n', colors.green);
  log('4. Images will auto-convert to WebP and rename to:');
  log('   bra-1.webp, bra-2.webp, panty-1.webp, etc.\n');
  log('✨ No manual renaming needed!\n', colors.green);
  log('💡 Options:', colors.magenta);
  log('   --dry-run      Preview without converting');
  log('   --quality=85   Set WebP quality (1-100)');
  log('   --help         Show this help\n');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { dryRun: false, help: false };
  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--quality=')) {
      const quality = parseInt(arg.split('=')[1]);
      if (quality >= 1 && quality <= 100) CONFIG.quality = quality;
    }
  }
  return options;
}

async function main() {
  const options = parseArgs();
  if (options.help) { showInstructions(); return; }
  setupTempDirectories();
  let hasImages = false;
  for (const category of CONFIG.categories) {
    if (getImageFiles(path.join(CONFIG.sourceDir, category)).length > 0) {
      hasImages = true;
      break;
    }
  }
  if (!hasImages) { showInstructions(); return; }
  await convertImages(options.dryRun);
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});

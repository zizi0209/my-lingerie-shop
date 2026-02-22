/**
 * Verify Seed Images Script
 * Run: node scripts/root/verify/verify-seed-images.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Categories to check
const CATEGORIES = [
  'bra',
  'panty',
  'set',
  'sleepwear',
  'shapewear',
  'accessory',
];

const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'public');
const SEED_DIR = path.join(PUBLIC_DIR, 'images', 'seed');

async function verifySeedImages() {
  log('\n╔════════════════════════════════════════════════╗', colors.cyan);
  log('║     SEED IMAGES VERIFICATION                  ║', colors.cyan);
  log('╚════════════════════════════════════════════════╝', colors.cyan);

  log(`\n📁 Seed directory: ${SEED_DIR}\n`, colors.cyan);

  let totalImages = 0;
  let missingCategories = [];
  const results = {};

  // Check each category
  for (const category of CATEGORIES) {
    const categoryDir = path.join(SEED_DIR, category);
    
    if (!fs.existsSync(categoryDir)) {
      missingCategories.push(category);
      results[category] = { exists: false, count: 0 };
      log(`\n❌ ${category.toUpperCase()}`, colors.red);
      log(`   Directory not found: ${categoryDir}`, colors.red);
      continue;
    }
    
    // Count .webp images
    const files = fs.readdirSync(categoryDir);
    const imageFiles = files.filter(f => f.endsWith('.webp') && !f.startsWith('.'));
    
    results[category] = {
      exists: true,
      count: imageFiles.length,
      files: imageFiles,
    };
    
    totalImages += imageFiles.length;
    
    if (imageFiles.length === 0) {
      log(`\n⚠️  ${category.toUpperCase()}`, colors.yellow);
      log(`   Images found: 0`, colors.yellow);
      log(`   💡 Add images with naming: ${category}-1.webp, ${category}-2.webp, etc.`, colors.yellow);
    } else {
      log(`\n✅ ${category.toUpperCase()}`, colors.green);
      log(`   Images found: ${imageFiles.length}`, colors.green);
      log(`   Files: ${imageFiles.slice(0, 3).join(', ')}${imageFiles.length > 3 ? '...' : ''}`, colors.cyan);
    }
  }

  log('\n' + '═'.repeat(60), colors.cyan);
  log('\n📊 SUMMARY\n', colors.magenta);
  log(`Total categories: ${CATEGORIES.length}`);
  log(`Categories with images: ${CATEGORIES.length - missingCategories.length}`, colors.green);
  log(`Total images: ${totalImages}`, totalImages > 0 ? colors.green : colors.yellow);

  if (totalImages === 0) {
    log('\n⚠️  WARNING: No seed images found!', colors.yellow);
    log('\n📝 Next steps:', colors.cyan);
    log('   1. Download/prepare product images');
    log('   2. Convert to WebP format (https://cloudconvert.com/jpg-to-webp)');
    log('   3. Rename to: {category}-{number}.webp');
    log(`   4. Place in: ${SEED_DIR}/{category}/`);
    log('\n💡 Example:');
    log('   frontend/public/images/seed/bra/bra-1.webp');
    log('   frontend/public/images/seed/bra/bra-2.webp');
    log('   frontend/public/images/seed/panty/panty-1.webp');
    log('\n⚡ Seeding will use picsum.photos fallback if no local images', colors.yellow);
    log('\n📚 See: LOCAL_SEED_IMAGES_GUIDE.md for detailed instructions\n', colors.cyan);
    return false;
  } else if (totalImages < CATEGORIES.length * 3) {
    log('\n⚠️  You have some images but might want more for variety', colors.yellow);
    log(`   Recommended: At least 5-8 images per category`);
    log(`   Currently: ${Math.floor(totalImages / CATEGORIES.length)} images per category (average)`, colors.yellow);
  } else {
    log('\n✅ Great! You have enough images for seeding', colors.green);
    log(`   Average: ${Math.floor(totalImages / CATEGORIES.length)} images per category`, colors.green);
  }

  log('\n🎯 Ready to seed with local images!', colors.green);
  log('   Run: cd backend && npx ts-node prisma/seed-products.ts\n', colors.cyan);

  return true;
}

// Run verification
verifySeedImages()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log(`\n❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  });

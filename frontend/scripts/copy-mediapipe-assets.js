const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const MODELS_DIR = path.join(PUBLIC_DIR, 'models');
const WASM_DIR = path.join(PUBLIC_DIR, 'mediapipe', 'wasm');
const NODE_WASM_DIR = path.join(ROOT, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');

const ASSETS = [
  {
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
    fileName: 'pose_landmarker_lite.task',
  },
  {
    url: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
    fileName: 'selfie_segmenter.tflite',
  },
];

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const copyDirectory = (source, target) => {
  ensureDir(target);
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
};

const downloadFile = (url, targetPath) => new Promise((resolve, reject) => {
  const fileStream = fs.createWriteStream(targetPath);
  https.get(url, (res) => {
    if (res.statusCode !== 200) {
      reject(new Error(`Download failed (${res.statusCode}) for ${url}`));
      return;
    }
    res.pipe(fileStream);
    fileStream.on('finish', () => fileStream.close(resolve));
  }).on('error', (err) => {
    fs.unlink(targetPath, () => reject(err));
  });
});

const main = async () => {
  try {
    ensureDir(MODELS_DIR);
    ensureDir(WASM_DIR);

    if (!fs.existsSync(NODE_WASM_DIR)) {
      throw new Error(`Không tìm thấy wasm ở ${NODE_WASM_DIR}. Hãy chạy npm install trong frontend trước.`);
    }

    console.log('Copying MediaPipe wasm...');
    copyDirectory(NODE_WASM_DIR, WASM_DIR);

    for (const asset of ASSETS) {
      const targetPath = path.join(MODELS_DIR, asset.fileName);
      if (fs.existsSync(targetPath)) {
        console.log(`Skip (already exists): ${asset.fileName}`);
        continue;
      }
      console.log(`Downloading ${asset.fileName}...`);
      await downloadFile(asset.url, targetPath);
    }

    console.log('✅ MediaPipe assets ready.');
  } catch (error) {
    console.error('❌ Failed to prepare MediaPipe assets:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

main();

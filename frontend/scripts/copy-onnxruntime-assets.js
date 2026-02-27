const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ORT_PUBLIC_DIR = path.join(PUBLIC_DIR, 'onnxruntime');
const NODE_ORT_DIR = path.join(ROOT, 'node_modules', 'onnxruntime-web', 'dist');

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const copyWasmFiles = (source, target) => {
  const entries = fs.readdirSync(source, { withFileTypes: true });
  const wasmFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.wasm'))
    .map((entry) => entry.name);

  if (wasmFiles.length === 0) {
    throw new Error(`Không tìm thấy file .wasm trong ${source}`);
  }

  wasmFiles.forEach((file) => {
    const from = path.join(source, file);
    const to = path.join(target, file);
    fs.copyFileSync(from, to);
  });
};

const main = () => {
  try {
    ensureDir(ORT_PUBLIC_DIR);

    if (!fs.existsSync(NODE_ORT_DIR)) {
      throw new Error(`Không tìm thấy onnxruntime-web ở ${NODE_ORT_DIR}. Hãy chạy npm install trong frontend trước.`);
    }

    copyWasmFiles(NODE_ORT_DIR, ORT_PUBLIC_DIR);

    console.log('✅ ONNX Runtime wasm assets ready.');
  } catch (error) {
    console.error('❌ Failed to prepare ONNX Runtime assets:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

main();

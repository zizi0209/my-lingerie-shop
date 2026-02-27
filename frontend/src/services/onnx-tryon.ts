export type ProgressCallback = (progress: number, message?: string) => void;

type InputLayout = 'NCHW' | 'NHWC';
type ChannelOrder = 'RGB' | 'BGR';

interface OnnxNormalization {
  mean: [number, number, number];
  std: [number, number, number];
  scale?: number;
  channelOrder?: ChannelOrder;
}

interface OnnxTryOnManifest {
  version: string;
  modelUrl: string;
  inputSize: { width: number; height: number };
  inputLayout?: InputLayout;
  outputLayout?: InputLayout;
  inputs: {
    person: string;
    garment: string;
    mask?: string;
  };
  outputs: {
    result: string;
  };
  normalization?: OnnxNormalization;
  adapter?: {
    mode: 'model' | 'frontend';
    modelInputs?: {
      person: string;
      garment: string;
      mask?: string;
    };
    modelOutputs?: {
      result: string;
    };
  };
  metadata?: {
    opset?: number;
    commit?: string;
    preProcess?: string;
    postProcess?: string;
    exportedAt?: string;
  };
}

interface OnnxTryOnRequest {
  personCanvas: HTMLCanvasElement;
  garmentImage: HTMLImageElement;
  getMaskData?: () => Promise<ImageData | null>;
  onProgress?: ProgressCallback;
}

interface PublicConfigPayload {
  enable_onnx_tryon?: string;
  onnx_tryon_manifest_url?: string;
  onnx_wasm_base_url?: string;
}

interface OnnxRuntimeConfig {
  enabled: boolean;
  manifestUrl: string;
  wasmBaseUrl: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const FALLBACK_MANIFEST_URL = '/static/onnx/tryon/manifest.json';
const FALLBACK_WASM_BASE_URL = '/onnxruntime/';
const ENV_ENABLE_ONNX_TRYON = process.env.NEXT_PUBLIC_ENABLE_ONNX_TRYON;
const ENV_MANIFEST_URL = process.env.NEXT_PUBLIC_ONNX_TRYON_MANIFEST_URL;
const ENV_WASM_BASE_URL = process.env.NEXT_PUBLIC_ONNX_WASM_BASE_URL;
const DEFAULT_NORMALIZATION: OnnxNormalization = {
  mean: [0.5, 0.5, 0.5],
  std: [0.5, 0.5, 0.5],
  scale: 1 / 255,
  channelOrder: 'RGB',
};
const MODEL_LOAD_TIMEOUT_MS = 45000;
const FRONTEND_CONTRACT = {
  inputs: {
    person: 'person',
    garment: 'garment',
    mask: 'mask',
  },
  outputs: {
    result: 'result',
  },
} as const;

let cachedManifest: OnnxTryOnManifest | null = null;
let cachedManifestUrl: string | null = null;
let sessionPromise: Promise<import('onnxruntime-web').InferenceSession> | null = null;
let runtimeConfigPromise: Promise<OnnxRuntimeConfig> | null = null;
let cachedRuntimeConfig: OnnxRuntimeConfig | null = null;
let loggedRuntimeConfig = false;

export async function isOnnxTryOnEnabled(): Promise<boolean> {
  const config = await getRuntimeConfig();
  return config.enabled;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNumberTuple3 = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number');

const isInputLayout = (value: unknown): value is InputLayout => value === 'NCHW' || value === 'NHWC';
const isAdapterMode = (value: unknown): value is 'model' | 'frontend' => value === 'model' || value === 'frontend';

const normalizeBoolean = (value?: string): boolean | null => {
  if (value === undefined) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
};

const isOnnxTryOnManifest = (value: unknown): value is OnnxTryOnManifest => {
  if (!isRecord(value)) return false;
  if (typeof value.version !== 'string') return false;
  if (typeof value.modelUrl !== 'string') return false;
  if (!isRecord(value.inputSize)) return false;
  if (typeof value.inputSize.width !== 'number' || typeof value.inputSize.height !== 'number') return false;
  if (!isRecord(value.inputs)) return false;
  if (typeof value.inputs.person !== 'string' || typeof value.inputs.garment !== 'string') return false;
  if (!isRecord(value.outputs) || typeof value.outputs.result !== 'string') return false;
  if (value.inputLayout && !isInputLayout(value.inputLayout)) return false;
  if (value.outputLayout && !isInputLayout(value.outputLayout)) return false;

  if (value.normalization) {
    if (!isRecord(value.normalization)) return false;
    if (!isNumberTuple3(value.normalization.mean)) return false;
    if (!isNumberTuple3(value.normalization.std)) return false;
  }

  if (value.adapter) {
    if (!isRecord(value.adapter)) return false;
    if (!isAdapterMode(value.adapter.mode)) return false;
    if (value.adapter.modelInputs) {
      if (!isRecord(value.adapter.modelInputs)) return false;
      if (typeof value.adapter.modelInputs.person !== 'string') return false;
      if (typeof value.adapter.modelInputs.garment !== 'string') return false;
      if (value.adapter.modelInputs.mask && typeof value.adapter.modelInputs.mask !== 'string') return false;
    }
    if (value.adapter.modelOutputs) {
      if (!isRecord(value.adapter.modelOutputs)) return false;
      if (typeof value.adapter.modelOutputs.result !== 'string') return false;
    }
  }

  if (value.metadata) {
    if (!isRecord(value.metadata)) return false;
    if (value.metadata.opset && typeof value.metadata.opset !== 'number') return false;
    if (value.metadata.commit && typeof value.metadata.commit !== 'string') return false;
    if (value.metadata.preProcess && typeof value.metadata.preProcess !== 'string') return false;
    if (value.metadata.postProcess && typeof value.metadata.postProcess !== 'string') return false;
    if (value.metadata.exportedAt && typeof value.metadata.exportedAt !== 'string') return false;
  }

  return true;
};

const resolveAdapterIo = (manifest: OnnxTryOnManifest): {
  modelInputs: OnnxTryOnManifest['inputs'];
  modelOutputs: OnnxTryOnManifest['outputs'];
} => {
  const mode = manifest.adapter?.mode ?? 'model';
  if (mode === 'model') {
    return { modelInputs: manifest.inputs, modelOutputs: manifest.outputs };
  }

  if (
    manifest.inputs.person !== FRONTEND_CONTRACT.inputs.person ||
    manifest.inputs.garment !== FRONTEND_CONTRACT.inputs.garment ||
    manifest.outputs.result !== FRONTEND_CONTRACT.outputs.result
  ) {
    throw new Error('Manifest frontend contract không hợp lệ');
  }

  const modelInputs = manifest.adapter?.modelInputs;
  const modelOutputs = manifest.adapter?.modelOutputs;
  if (!modelInputs || !modelOutputs) {
    throw new Error('Manifest adapter thiếu modelInputs/modelOutputs');
  }

  return { modelInputs, modelOutputs };
};

const resolveUrl = (baseUrl: string, relativeUrl: string): string => {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch {
    return relativeUrl;
  }
};

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout ${label} sau ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const fetchPublicConfig = async (): Promise<PublicConfigPayload> => {
  const response = await fetch(`${API_BASE_URL}/public/config`);
  if (!response.ok) {
    throw new Error('Không thể tải public config');
  }
  const payload = (await response.json()) as { data?: PublicConfigPayload; success?: boolean };
  if (!payload.success || !payload.data) {
    return {};
  }
  return payload.data;
};

const getRuntimeConfig = async (): Promise<OnnxRuntimeConfig> => {
  if (cachedRuntimeConfig) return cachedRuntimeConfig;
  if (runtimeConfigPromise) return runtimeConfigPromise;

  runtimeConfigPromise = (async () => {
    let publicConfig: PublicConfigPayload = {};
    try {
      publicConfig = await fetchPublicConfig();
    } catch (error) {
      console.warn('[TryOn][ONNX] Không thể lấy public config:', error);
    }

    const envEnabled = normalizeBoolean(ENV_ENABLE_ONNX_TRYON);
    const runtimeEnabled = normalizeBoolean(publicConfig.enable_onnx_tryon);
    const enabled = envEnabled ?? runtimeEnabled ?? false;

    const manifestUrl = ENV_MANIFEST_URL || publicConfig.onnx_tryon_manifest_url || FALLBACK_MANIFEST_URL;
    const wasmBaseUrl = ENV_WASM_BASE_URL || publicConfig.onnx_wasm_base_url || FALLBACK_WASM_BASE_URL;

    if (cachedManifestUrl && cachedManifestUrl !== manifestUrl) {
      cachedManifest = null;
      sessionPromise = null;
    }

    cachedRuntimeConfig = { enabled, manifestUrl, wasmBaseUrl };
    if (!loggedRuntimeConfig) {
      console.info('[TryOn][ONNX] runtime config:', cachedRuntimeConfig);
      loggedRuntimeConfig = true;
    }
    return cachedRuntimeConfig;
  })();

  return runtimeConfigPromise;
};

const loadManifest = async (manifestUrl: string): Promise<OnnxTryOnManifest> => {
  if (cachedManifest && cachedManifestUrl === manifestUrl) return cachedManifest;

  const response = await fetch(manifestUrl, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Không thể tải manifest ONNX (${response.status})`);
  }
  const payload: unknown = await response.json();
  if (!isOnnxTryOnManifest(payload)) {
    throw new Error('Manifest ONNX không hợp lệ');
  }
  cachedManifest = payload;
  cachedManifestUrl = manifestUrl;
  return payload;
};

const isWebGpuSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'gpu' in navigator;

const initOnnxEnv = (ort: typeof import('onnxruntime-web'), wasmBaseUrl: string): void => {
  ort.env.wasm.wasmPaths = wasmBaseUrl;
  if (typeof navigator !== 'undefined') {
    const cores = navigator.hardwareConcurrency ?? 4;
    ort.env.wasm.numThreads = Math.max(1, Math.min(4, cores));
  }
  ort.env.wasm.simd = true;
};

const getOnnxSession = async (
  manifest: OnnxTryOnManifest,
  manifestUrl: string,
  wasmBaseUrl: string
): Promise<import('onnxruntime-web').InferenceSession> => {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const ort = await import('onnxruntime-web');
    initOnnxEnv(ort, wasmBaseUrl);
    const executionProviders: import('onnxruntime-web').InferenceSession.SessionOptions['executionProviders'] =
      isWebGpuSupported() ? ['webgpu', 'wasm'] : ['wasm'];
    const modelUrl = resolveUrl(manifestUrl, manifest.modelUrl);
    try {
      return await withTimeout(
        ort.InferenceSession.create(modelUrl, { executionProviders }),
        MODEL_LOAD_TIMEOUT_MS,
        'tải model'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải model ONNX';
      throw new Error(`Không thể tải model ONNX. Hãy kiểm tra ${modelUrl}. (${message})`);
    }
  })();

  return sessionPromise;
};

const createImageTensor = async (
  ort: typeof import('onnxruntime-web'),
  source: CanvasImageSource,
  width: number,
  height: number,
  normalization: OnnxNormalization,
  layout: InputLayout
): Promise<import('onnxruntime-web').Tensor> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể tạo canvas cho ONNX');
  }
  ctx.drawImage(source, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const scale = normalization.scale ?? 1 / 255;
  const [meanR, meanG, meanB] = normalization.mean;
  const [stdR, stdG, stdB] = normalization.std;
  const channelOrder = normalization.channelOrder ?? 'RGB';

  const total = width * height;
  const tensorData = new Float32Array(total * 3);

  for (let i = 0; i < total; i += 1) {
    const base = i * 4;
    const r = data[base];
    const g = data[base + 1];
    const b = data[base + 2];
    const channels = channelOrder === 'BGR' ? [b, g, r] : [r, g, b];

    const nr = (channels[0] * scale - meanR) / stdR;
    const ng = (channels[1] * scale - meanG) / stdG;
    const nb = (channels[2] * scale - meanB) / stdB;

    if (layout === 'NCHW') {
      const offset = i;
      tensorData[offset] = nr;
      tensorData[offset + total] = ng;
      tensorData[offset + total * 2] = nb;
    } else {
      const offset = i * 3;
      tensorData[offset] = nr;
      tensorData[offset + 1] = ng;
      tensorData[offset + 2] = nb;
    }
  }

  const dims = layout === 'NCHW' ? [1, 3, height, width] : [1, height, width, 3];
  return new ort.Tensor('float32', tensorData, dims);
};

const createMaskTensor = async (
  ort: typeof import('onnxruntime-web'),
  maskData: ImageData,
  width: number,
  height: number,
  layout: InputLayout
): Promise<import('onnxruntime-web').Tensor> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể tạo mask canvas cho ONNX');
  }
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskData.width;
  maskCanvas.height = maskData.height;
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) {
    throw new Error('Không thể tạo mask context');
  }
  maskCtx.putImageData(maskData, 0, 0);
  ctx.drawImage(maskCanvas, 0, 0, width, height);
  const resized = ctx.getImageData(0, 0, width, height);
  const total = width * height;
  const tensorData = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    const alpha = resized.data[i * 4 + 3] / 255;
    tensorData[i] = alpha;
  }
  const dims = layout === 'NCHW' ? [1, 1, height, width] : [1, height, width, 1];
  return new ort.Tensor('float32', tensorData, dims);
};

const inferOutputLayout = (dims: readonly number[]): InputLayout => {
  if (dims.length === 4) {
    return dims[1] === 3 || dims[1] === 4 ? 'NCHW' : 'NHWC';
  }
  if (dims.length === 3) {
    return dims[0] === 3 || dims[0] === 4 ? 'NCHW' : 'NHWC';
  }
  return 'NCHW';
};

const buildImageFromTensor = (
  tensor: import('onnxruntime-web').Tensor,
  outputLayout?: InputLayout
): HTMLCanvasElement => {
  const dims = tensor.dims;
  const data = tensor.data as Float32Array;
  const layout = outputLayout ?? inferOutputLayout(dims);
  let height = 0;
  let width = 0;
  let channels = 3;

  if (dims.length === 4) {
    if (layout === 'NCHW') {
      channels = dims[1];
      height = dims[2];
      width = dims[3];
    } else {
      height = dims[1];
      width = dims[2];
      channels = dims[3];
    }
  } else if (dims.length === 3) {
    if (layout === 'NCHW') {
      channels = dims[0];
      height = dims[1];
      width = dims[2];
    } else {
      height = dims[0];
      width = dims[1];
      channels = dims[2];
    }
  } else {
    throw new Error('Output tensor shape không hỗ trợ');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể tạo canvas output');
  }

  const imageData = ctx.createImageData(width, height);
  const output = imageData.data;

  let maxSample = 0;
  const step = Math.max(1, Math.floor(data.length / 1000));
  for (let i = 0; i < data.length; i += step) {
    maxSample = Math.max(maxSample, data[i]);
  }
  const scale = maxSample <= 1.5 ? 255 : 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      let r = 0;
      let g = 0;
      let b = 0;
      if (layout === 'NCHW') {
        const base = pixelIndex;
        r = data[base] ?? 0;
        g = data[base + width * height] ?? 0;
        b = data[base + width * height * 2] ?? 0;
      } else {
        const base = pixelIndex * channels;
        r = data[base] ?? 0;
        g = data[base + 1] ?? 0;
        b = data[base + 2] ?? 0;
      }
      const outIndex = pixelIndex * 4;
      output[outIndex] = Math.max(0, Math.min(255, Math.round(r * scale)));
      output[outIndex + 1] = Math.max(0, Math.min(255, Math.round(g * scale)));
      output[outIndex + 2] = Math.max(0, Math.min(255, Math.round(b * scale)));
      output[outIndex + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

export const runOnnxTryOn = async (request: OnnxTryOnRequest): Promise<HTMLCanvasElement> => {
  const runtimeConfig = await getRuntimeConfig();
  if (!runtimeConfig.enabled) {
    throw new Error('ONNX try-on chưa được bật');
  }

  request.onProgress?.(18, 'Đang tải cấu hình try-on...');
  const manifest = await loadManifest(runtimeConfig.manifestUrl);
  const normalization = manifest.normalization ?? DEFAULT_NORMALIZATION;
  const inputLayout = manifest.inputLayout ?? 'NCHW';
  const outputLayout = manifest.outputLayout ?? 'NCHW';
  const { modelInputs, modelOutputs } = resolveAdapterIo(manifest);

  request.onProgress?.(28, 'Đang tải model chất lượng cao...');
  const session = await getOnnxSession(manifest, runtimeConfig.manifestUrl, runtimeConfig.wasmBaseUrl);
  const ort = await import('onnxruntime-web');

  request.onProgress?.(45, 'Đang chuẩn bị dữ liệu...');
  const personTensor = await createImageTensor(
    ort,
    request.personCanvas,
    manifest.inputSize.width,
    manifest.inputSize.height,
    normalization,
    inputLayout
  );
  const garmentTensor = await createImageTensor(
    ort,
    request.garmentImage,
    manifest.inputSize.width,
    manifest.inputSize.height,
    normalization,
    inputLayout
  );

  const feeds: Record<string, import('onnxruntime-web').Tensor> = {
    [modelInputs.person]: personTensor,
    [modelInputs.garment]: garmentTensor,
  };

  if (modelInputs.mask && request.getMaskData) {
    const maskData = await request.getMaskData();
    if (maskData) {
      feeds[modelInputs.mask] = await createMaskTensor(
        ort,
        maskData,
        manifest.inputSize.width,
        manifest.inputSize.height,
        inputLayout
      );
    }
  }

  request.onProgress?.(70, 'Đang chạy AI try-on...');
  const results = await session.run(feeds, [modelOutputs.result]);
  const output = results[modelOutputs.result];
  if (!output) {
    throw new Error('Không nhận được output từ ONNX');
  }

  request.onProgress?.(88, 'Đang dựng ảnh kết quả...');
  const outputCanvas = buildImageFromTensor(output, outputLayout);
  return outputCanvas;
};

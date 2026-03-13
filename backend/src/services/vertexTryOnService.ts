import { downloadGcsUriAsBase64, getTryOnStorageProvider, isGcsUri, uploadBase64ToTryOnStorage } from './virtualTryOnStorage';

const VERTEX_PROJECT_ID = process.env.VERTEX_AI_PROJECT_ID
  || process.env.GCP_PROJECT_ID
  || process.env.GOOGLE_CLOUD_PROJECT
  || '';
const VERTEX_LOCATION = process.env.VERTEX_AI_LOCATION
  || process.env.GOOGLE_CLOUD_LOCATION
  || 'us-central1';
const VERTEX_TRYON_MODEL_ID = process.env.VERTEX_TRYON_MODEL_ID || 'virtual-try-on-001';
const VERTEX_VEO_MODEL_ID = process.env.VERTEX_VEO_MODEL_ID || 'veo-3.1-generate-001';
const VERTEX_VEO_OUTPUT_GCS_URI = process.env.VERTEX_VEO_OUTPUT_GCS_URI || '';
const VERTEX_TRYON_OUTPUT_PREFIX = process.env.VERTEX_TRYON_OUTPUT_PREFIX || 'virtual-tryon/outputs';
const VERTEX_TRYON_SAMPLE_COUNT = Number(process.env.VERTEX_TRYON_SAMPLE_COUNT || 1);
const VERTEX_VEO_DURATION_SECONDS = Number(process.env.VERTEX_VEO_DURATION_SECONDS || 8);
const VERTEX_VEO_POLL_INTERVAL_MS = Number(process.env.VERTEX_VEO_POLL_INTERVAL_MS || 3000);
const VERTEX_VEO_MAX_POLL_ATTEMPTS = Number(process.env.VERTEX_VEO_MAX_POLL_ATTEMPTS || 40);
const FREE_MODE_DISABLE_VIDEO = process.env.FREE_MODE_DISABLE_VIDEO === 'true';

const ACCESS_TOKEN_ENV = process.env.VERTEX_AI_ACCESS_TOKEN || process.env.GCP_ACCESS_TOKEN || '';
const METADATA_TOKEN_URL =
  process.env.GCP_METADATA_TOKEN_URL
  || 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface VertexTryOnPrediction {
  bytesBase64Encoded?: string;
  mimeType?: string;
}

interface VertexTryOnResponse {
  predictions?: VertexTryOnPrediction[];
}

interface VeoOperationResponse {
  name?: string;
}

interface VeoVideoOutput {
  gcsUri?: string;
  mimeType?: string;
}

interface VeoGenerateResponse {
  videos?: VeoVideoOutput[];
}

interface VeoPollResponse {
  done?: boolean;
  response?: VeoGenerateResponse;
  error?: { message?: string };
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

export function isVertexTryOnAvailable(): boolean {
  return Boolean(VERTEX_PROJECT_ID && VERTEX_LOCATION);
}

function ensureVertexConfig(): void {
  if (!VERTEX_PROJECT_ID) {
    throw new Error('VERTEX_AI_PROJECT_ID is required');
  }
  if (!VERTEX_LOCATION) {
    throw new Error('VERTEX_AI_LOCATION is required');
  }
}

function normalizeBase64(input: string): string {
  if (input.startsWith('data:')) {
    const parts = input.split(',');
    return parts[1] || '';
  }
  return input;
}

async function getAccessToken(): Promise<string> {
  if (ACCESS_TOKEN_ENV) {
    return ACCESS_TOKEN_ENV;
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - now > 60_000) {
    return cachedToken.token;
  }

  const response = await fetch(METADATA_TOKEN_URL, {
    headers: {
      'Metadata-Flavor': 'Google',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Không lấy được access token từ metadata: ${response.status} ${text}`);
  }

  const data = (await response.json()) as AccessTokenResponse;
  if (!data.access_token) {
    throw new Error('Metadata token response thiếu access_token');
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

async function callVertexApi(path: string, body: Record<string, unknown>): Promise<Response> {
  ensureVertexConfig();
  const token = await getAccessToken();
  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/${path}`;

  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadUrlAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Không tải được ảnh từ URL: ${response.status} ${text}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}

export async function processVertexTryOn(params: {
  personImageBase64: string;
  garmentImageBase64: string;
  sampleCount?: number;
}): Promise<{ base64Image: string; mimeType: string }> {
  const personImage = normalizeBase64(params.personImageBase64);
  const garmentImage = normalizeBase64(params.garmentImageBase64);
  const sampleCount = params.sampleCount && params.sampleCount > 0 ? params.sampleCount : VERTEX_TRYON_SAMPLE_COUNT;

  const body = {
    instances: [
      {
        personImage: {
          image: {
            bytesBase64Encoded: personImage,
          },
        },
        productImages: [
          {
            image: {
              bytesBase64Encoded: garmentImage,
            },
          },
        ],
      },
    ],
    parameters: {
      sampleCount,
    },
  } satisfies Record<string, unknown>;

  const response = await callVertexApi(
    `publishers/google/models/${VERTEX_TRYON_MODEL_ID}:predict`,
    body,
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vertex Try-On lỗi: ${response.status} ${text}`);
  }

  const data = (await response.json()) as VertexTryOnResponse;
  const prediction = data.predictions?.[0];
  const bytes = prediction?.bytesBase64Encoded;
  if (!bytes) {
    throw new Error('Vertex Try-On không trả về ảnh');
  }

  return {
    base64Image: bytes,
    mimeType: prediction?.mimeType || 'image/png',
  };
}

export async function processVertexTryOnFromGcs(params: {
  personImageGcsUri: string;
  garmentImageGcsUri: string;
}): Promise<{ base64Image: string; mimeType: string }> {
  if (!isGcsUri(params.personImageGcsUri) || !isGcsUri(params.garmentImageGcsUri)) {
    throw new Error('GCS URI không hợp lệ');
  }

  const [personBase64, garmentBase64] = await Promise.all([
    downloadGcsUriAsBase64(params.personImageGcsUri),
    downloadGcsUriAsBase64(params.garmentImageGcsUri),
  ]);

  return processVertexTryOn({
    personImageBase64: personBase64,
    garmentImageBase64: garmentBase64,
  });
}

export async function processVertexTryOnFromUrl(params: {
  personImageUrl: string;
  garmentImageUrl: string;
}): Promise<{ base64Image: string; mimeType: string }> {
  const [personBase64, garmentBase64] = await Promise.all([
    downloadUrlAsBase64(params.personImageUrl),
    downloadUrlAsBase64(params.garmentImageUrl),
  ]);

  return processVertexTryOn({
    personImageBase64: personBase64,
    garmentImageBase64: garmentBase64,
  });
}

function buildVeoOutputStorageUri(): string {
  if (VERTEX_VEO_OUTPUT_GCS_URI) {
    return VERTEX_VEO_OUTPUT_GCS_URI;
  }
  const bucket = process.env.GCS_TRYON_BUCKET || '';
  if (!bucket) {
    return '';
  }
  return `gs://${bucket}/${VERTEX_TRYON_OUTPUT_PREFIX}/videos`;
}

export async function generateVeoVideoFromImage(params: {
  imageGcsUri: string;
  prompt?: string;
  durationSeconds?: number;
  mimeType?: string;
}): Promise<{ gcsUri: string; mimeType: string }> {
  if (FREE_MODE_DISABLE_VIDEO || getTryOnStorageProvider() !== 'gcs') {
    throw new Error('Video generation disabled in free mode');
  }
  if (!isGcsUri(params.imageGcsUri)) {
    throw new Error('imageGcsUri không hợp lệ');
  }

  const outputStorageUri = buildVeoOutputStorageUri();
  if (!outputStorageUri || !outputStorageUri.startsWith('gs://')) {
    throw new Error('VERTEX_VEO_OUTPUT_GCS_URI hoặc GCS_TRYON_BUCKET chưa cấu hình');
  }

  const durationSeconds = params.durationSeconds && params.durationSeconds > 0
    ? params.durationSeconds
    : VERTEX_VEO_DURATION_SECONDS;

  const body = {
    instances: [
      {
        prompt: params.prompt || 'Fashion try-on video, smooth camera motion, realistic lighting',
        image: {
          gcsUri: params.imageGcsUri,
          mimeType: params.mimeType || 'image/png',
        },
      },
    ],
    parameters: {
      durationSeconds,
      sampleCount: 1,
      storageUri: outputStorageUri,
    },
  } satisfies Record<string, unknown>;

  const startResponse = await callVertexApi(
    `publishers/google/models/${VERTEX_VEO_MODEL_ID}:predictLongRunning`,
    body,
  );

  if (!startResponse.ok) {
    const text = await startResponse.text();
    throw new Error(`Veo khởi chạy lỗi: ${startResponse.status} ${text}`);
  }

  const startData = (await startResponse.json()) as VeoOperationResponse;
  if (!startData.name) {
    throw new Error('Veo không trả về operation name');
  }

  for (let attempt = 0; attempt < VERTEX_VEO_MAX_POLL_ATTEMPTS; attempt += 1) {
    await sleep(VERTEX_VEO_POLL_INTERVAL_MS);

    const pollResponse = await callVertexApi(
      `publishers/google/models/${VERTEX_VEO_MODEL_ID}:fetchPredictOperation`,
      { operationName: startData.name },
    );

    if (!pollResponse.ok) {
      const text = await pollResponse.text();
      throw new Error(`Veo poll lỗi: ${pollResponse.status} ${text}`);
    }

    const pollData = (await pollResponse.json()) as VeoPollResponse;
    if (!pollData.done) {
      continue;
    }

    if (pollData.error?.message) {
      throw new Error(`Veo lỗi: ${pollData.error.message}`);
    }

    const video = pollData.response?.videos?.[0];
    if (!video?.gcsUri) {
      throw new Error('Veo không trả về gcsUri video');
    }

    return {
      gcsUri: video.gcsUri,
      mimeType: video.mimeType || 'video/mp4',
    };
  }

  throw new Error('Veo xử lý quá thời gian chờ');
}

export async function storeTryOnResult(params: {
  base64Image: string;
  mimeType: string;
}): Promise<{ storageUri?: string; signedUrl: string }> {
  const result = await uploadBase64ToTryOnStorage({
    base64: params.base64Image,
    mimeType: params.mimeType,
    prefix: VERTEX_TRYON_OUTPUT_PREFIX,
  });

  return {
    storageUri: result.storageUri,
    signedUrl: result.url,
  };
}

const BASE_URL = process.env.TRYON_SMOKE_BASE_URL || 'http://localhost:3000/api';
const WORKER_TOKEN = process.env.TRYON_WORKER_TOKEN || '';
const VIDEO_DURATION_SECONDS = Number(process.env.TRYON_SMOKE_VIDEO_SECONDS || '6');
const ENABLE_VIDEO = process.env.TRYON_SMOKE_ENABLE_VIDEO === 'true';

const DEFAULT_IMAGE_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xr4cAAAAASUVORK5CYII=';
const PERSON_IMAGE_BASE64 = process.env.TRYON_SMOKE_PERSON_BASE64 || DEFAULT_IMAGE_BASE64;
const GARMENT_IMAGE_BASE64 = process.env.TRYON_SMOKE_GARMENT_BASE64 || DEFAULT_IMAGE_BASE64;

type SignedUploadResponse = {
  uploadUrl: string;
  uploadMethod: 'PUT' | 'POST';
  uploadFields?: Record<string, string>;
  provider: 'gcs' | 'cloudinary';
  gcsUri?: string;
  expiresInSeconds: number;
};

type UploadedAsset = {
  provider: 'gcs' | 'cloudinary';
  gcsUri?: string;
  url?: string;
};

type JobStatusResponse = {
  success: boolean;
  data?: {
    jobId?: string;
    status?: string;
    resultImage?: string;
    resultVideo?: string;
    statusReason?: string;
    errorStage?: string;
  };
  error?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  if (!dataUrl.startsWith('data:')) {
    return { mimeType: 'image/png', buffer: Buffer.from(dataUrl, 'base64') };
  }
  const [meta, data] = dataUrl.split(',');
  const mimeMatch = meta.match(/^data:([^;]+);base64$/);
  const mimeType = mimeMatch?.[1] ?? 'image/png';
  return { mimeType, buffer: Buffer.from(data, 'base64') };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const normalizedHeaders = init?.headers
    ? init.headers instanceof Headers
      ? Object.fromEntries(init.headers.entries())
      : Array.isArray(init.headers)
        ? Object.fromEntries(init.headers)
        : init.headers
    : {};
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...normalizedHeaders,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return (await response.json()) as T;
}

async function uploadToSignedUrl(
  signed: SignedUploadResponse,
  imageBase64: string,
): Promise<UploadedAsset> {
  const { mimeType, buffer } = parseDataUrl(imageBase64);

  if (signed.uploadMethod === 'PUT') {
    const uploadResponse = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: buffer,
    });
    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      throw new Error(`Upload failed ${uploadResponse.status}: ${text}`);
    }
    return {
      provider: 'gcs',
      gcsUri: signed.gcsUri,
    };
  }

  const form = new FormData();
  Object.entries(signed.uploadFields || {}).forEach(([key, value]) => {
    form.append(key, value);
  });
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), 'image.png');

  const uploadResponse = await fetch(signed.uploadUrl, {
    method: 'POST',
    body: form,
  });
  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(`Upload failed ${uploadResponse.status}: ${text}`);
  }

  const payload = await uploadResponse.json() as { secure_url?: string };
  return {
    provider: 'cloudinary',
    url: payload.secure_url,
  };
}

async function createSignedUpload(category: string, contentLength: number, contentType: string) {
  return requestJson<{ success: boolean; data?: SignedUploadResponse; error?: string }>(
    `${BASE_URL}/virtual-tryon/uploads/signed-url`,
    {
      method: 'POST',
      body: JSON.stringify({
        category,
        contentLength,
        contentType,
      }),
    },
  );
}

async function pollJob(jobId: string): Promise<JobStatusResponse['data']> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await requestJson<JobStatusResponse>(`${BASE_URL}/virtual-tryon/jobs/${jobId}`);
    const status = response.data?.status;
    if (status === 'completed') {
      return response.data;
    }
    if (status === 'failed' || status === 'dead_letter' || status === 'failed_config') {
      throw new Error(response.data?.statusReason || response.error || 'Job failed');
    }
    await sleep(3000);
  }
  throw new Error('Polling timeout');
}

async function run(): Promise<void> {
  console.log(`[TryOn][Smoke] Base URL: ${BASE_URL}`);

  await requestJson(`${BASE_URL}/virtual-tryon/status`);
  await requestJson(`${BASE_URL}/virtual-tryon/health`);

  const personPayload = parseDataUrl(PERSON_IMAGE_BASE64);
  const garmentPayload = parseDataUrl(GARMENT_IMAGE_BASE64);

  const personSigned = await createSignedUpload('person', personPayload.buffer.length, personPayload.mimeType);
  if (!personSigned.success || !personSigned.data) {
    throw new Error(personSigned.error || 'Không lấy được signed URL cho person');
  }
  const garmentSigned = await createSignedUpload('garment', garmentPayload.buffer.length, garmentPayload.mimeType);
  if (!garmentSigned.success || !garmentSigned.data) {
    throw new Error(garmentSigned.error || 'Không lấy được signed URL cho garment');
  }

  if (ENABLE_VIDEO && (personSigned.data.provider !== 'gcs' || garmentSigned.data.provider !== 'gcs')) {
    throw new Error('Smoke test video yêu cầu TRYON_STORAGE_PROVIDER=gcs');
  }

  if (personSigned.data.provider === 'gcs' && !personSigned.data.gcsUri) {
    throw new Error('Signed URL response thiếu gcsUri');
  }
  if (garmentSigned.data.provider === 'gcs' && !garmentSigned.data.gcsUri) {
    throw new Error('Signed URL response thiếu gcsUri');
  }

  const personUpload = await uploadToSignedUrl(personSigned.data, PERSON_IMAGE_BASE64);
  const garmentUpload = await uploadToSignedUrl(garmentSigned.data, GARMENT_IMAGE_BASE64);

  if (personSigned.data.provider === 'cloudinary' && !personUpload.url) {
    throw new Error('Upload cloudinary không trả về URL cho person');
  }
  if (garmentSigned.data.provider === 'cloudinary' && !garmentUpload.url) {
    throw new Error('Upload cloudinary không trả về URL cho garment');
  }

  const jobResponse = await requestJson<{ success: boolean; data?: { jobId?: string }; error?: string }>(
    `${BASE_URL}/virtual-tryon/jobs`,
    {
      method: 'POST',
      body: JSON.stringify({
        personImageGcsUri: personSigned.data.provider === 'gcs' ? personSigned.data.gcsUri : undefined,
        garmentImageGcsUri: garmentSigned.data.provider === 'gcs' ? garmentSigned.data.gcsUri : undefined,
        personImageUrl: personSigned.data.provider === 'cloudinary' ? personUpload.url : undefined,
        garmentImageUrl: garmentSigned.data.provider === 'cloudinary' ? garmentUpload.url : undefined,
        wantsVideo: ENABLE_VIDEO,
        videoDurationSeconds: ENABLE_VIDEO ? VIDEO_DURATION_SECONDS : undefined,
      }),
    },
  );

  const jobId = jobResponse.data?.jobId;
  if (!jobResponse.success || !jobId) {
    throw new Error(jobResponse.error || 'Không tạo được job');
  }

  const processHeaders = WORKER_TOKEN ? { 'x-worker-token': WORKER_TOKEN } : undefined;
  await requestJson(`${BASE_URL}/virtual-tryon/jobs/${jobId}/process`, {
    method: 'POST',
    headers: processHeaders,
  });

  const result = await pollJob(jobId);
  console.log('[TryOn][Smoke] Completed:', {
    jobId,
    resultImage: result?.resultImage,
    resultVideo: result?.resultVideo,
  });
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('[TryOn][Smoke] Failed:', message);
  process.exitCode = 1;
});

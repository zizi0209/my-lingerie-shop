const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api';
const PERSON_PATH = 'uploads/tryon-person.png';
const GARMENT_PATH = 'uploads/tryon-garment.png';
const VIDEO_DURATION_SECONDS = 6;
const POLL_TIMEOUT_MS = 90_000;

async function requestSignedUrl(category, contentLength) {
  const response = await fetch(`${BASE_URL}/virtual-tryon/uploads/signed-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentType: 'image/png',
      category,
      contentLength,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(`Signed URL failed ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

async function uploadToSignedUrl(signed, buffer) {
  if (signed.uploadMethod === 'POST') {
    const form = new FormData();
    Object.entries(signed.uploadFields || {}).forEach(([key, value]) => {
      form.append(key, value);
    });
    form.append('file', new Blob([buffer], { type: 'image/png' }), 'image.png');

    const uploadResponse = await fetch(signed.uploadUrl, {
      method: 'POST',
      body: form,
    });
    if (!uploadResponse.ok) {
      const text = await uploadResponse.text().catch(() => '');
      throw new Error(`Upload failed ${uploadResponse.status}: ${text}`);
    }
    const responsePayload = await uploadResponse.json().catch(() => ({}));
    return { url: responsePayload.secure_url };
  }

  const uploadResponse = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: buffer,
  });
  if (!uploadResponse.ok) {
    const text = await uploadResponse.text().catch(() => '');
    throw new Error(`Upload failed ${uploadResponse.status}: ${text}`);
  }
  return { gcsUri: signed.gcsUri };
}

async function createJob(personGcsUri, garmentGcsUri) {
  const response = await fetch(`${BASE_URL}/virtual-tryon/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personImageGcsUri: personGcsUri,
      garmentImageGcsUri: garmentGcsUri,
      wantsVideo: true,
      videoDurationSeconds: VIDEO_DURATION_SECONDS,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success || !payload.data?.jobId) {
    throw new Error(`Create job failed ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload.data.jobId;
}

async function pollJob(jobId) {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const response = await fetch(`${BASE_URL}/virtual-tryon/jobs/${jobId}`);
    const payload = await response.json();
    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(`Status failed ${response.status}: ${JSON.stringify(payload)}`);
    }
    const data = payload.data;
    if (['completed', 'failed', 'dead_letter', 'failed_config', 'failed_provider', 'expired'].includes(data.status)) {
      return data;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('Poll timeout');
}

async function run() {
  const personBuffer = fs.readFileSync(PERSON_PATH);
  const garmentBuffer = fs.readFileSync(GARMENT_PATH);

  console.log('[Smoke] Signed URL person');
  const personSigned = await requestSignedUrl('person', personBuffer.length);
  console.log('[Smoke] Signed URL garment');
  const garmentSigned = await requestSignedUrl('garment', garmentBuffer.length);

  console.log('[Smoke] Upload person');
  await uploadToSignedUrl(personSigned, personBuffer);
  console.log('[Smoke] Upload garment');
  await uploadToSignedUrl(garmentSigned, garmentBuffer);

  console.log('[Smoke] Create job');
  const jobId = await createJob(personSigned.gcsUri, garmentSigned.gcsUri);
  console.log('[Smoke] Job', jobId);

  const result = await pollJob(jobId);
  console.log('[Smoke] Result', JSON.stringify(result));
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[Smoke] Failed', message);
  process.exitCode = 1;
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const getTryOnHealthSnapshotMock = vi.fn();
const getSignedReadUrlForGcsUriMock = vi.fn();
const isGcsUriMock = vi.fn();
const generateVeoVideoFromImageMock = vi.fn();

vi.mock('../../config/tryOnConfig', () => ({
  getTryOnHealthSnapshot: getTryOnHealthSnapshotMock,
}));

vi.mock('../../services/virtualTryOnStorage', async () => {
  const actual = await vi.importActual<typeof import('../../services/virtualTryOnStorage')>('../../services/virtualTryOnStorage');
  return {
    ...actual,
    getSignedReadUrlForGcsUri: getSignedReadUrlForGcsUriMock,
    isGcsUri: isGcsUriMock,
  };
});

vi.mock('../../services/vertexTryOnService', async () => {
  const actual = await vi.importActual<typeof import('../../services/vertexTryOnService')>('../../services/vertexTryOnService');
  return {
    ...actual,
    generateVeoVideoFromImage: generateVeoVideoFromImageMock,
  };
});

import { generateVideoFromExistingImage } from '../virtualTryOnController';

function createMockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;

  (res.status as unknown as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

describe('generateVideoFromExistingImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isGcsUriMock.mockReturnValue(true);
    getSignedReadUrlForGcsUriMock.mockResolvedValue('https://example.com/result-image.png');
    getTryOnHealthSnapshotMock.mockReturnValue({
      videoEnabled: true,
      videoReasons: [],
    });
  });

  it('trả fail-soft với resultImage khi Veo không trả gcsUri', async () => {
    generateVeoVideoFromImageMock.mockRejectedValue(new Error('Veo completed nhưng không có video URI trong response'));

    const req = {
      body: {
        resultImageGcsUri: 'gs://bucket/tryon/result.png',
      },
    } as Request;

    const res = createMockRes();

    await generateVideoFromExistingImage(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        resultImage: 'https://example.com/result-image.png',
        resultImageGcsUri: 'gs://bucket/tryon/result.png',
        videoStatus: 'failed',
        videoErrorMessage: 'Veo completed nhưng không có video URI trong response',
      },
    });
  });
});

import { describe, expect, it, vi } from 'vitest';

vi.mock('../virtualTryOnStorage', () => ({
  findLatestVideoObjectInGcsPrefix: vi.fn(),
}));

import { extractVeoVideoResult, resolveVeoVideoFromOutputPrefix } from '../vertexTryOnService';
import { findLatestVideoObjectInGcsPrefix } from '../virtualTryOnStorage';

describe('extractVeoVideoResult', () => {
  it('đọc được gcsUri từ response.videos', () => {
    const result = extractVeoVideoResult({
      done: true,
      response: {
        videos: [
          {
            gcsUri: 'gs://bucket/path/video.mp4',
            mimeType: 'video/mp4',
          },
        ],
      },
    });

    expect(result).toEqual({
      gcsUri: 'gs://bucket/path/video.mp4',
      mimeType: 'video/mp4',
    });
  });

  it('đọc được gcsUri từ shape lồng nhau của response', () => {
    const result = extractVeoVideoResult({
      done: true,
      response: {
        outputs: [
          {
            video: {
              file: {
                gcsUri: 'gs://bucket/path/video-nested.mp4',
              },
            },
          },
        ],
      } as unknown as { videos?: Array<{ gcsUri?: string; mimeType?: string }> },
    });

    expect(result).toEqual({
      gcsUri: 'gs://bucket/path/video-nested.mp4',
      mimeType: 'video/mp4',
    });
  });

  it('trả null khi không tìm thấy gcsUri', () => {
    const result = extractVeoVideoResult({
      done: true,
      response: {
        videos: [{ mimeType: 'video/mp4' }],
      },
    });

    expect(result).toBeNull();
  });
});

describe('resolveVeoVideoFromOutputPrefix', () => {
  it('trả về video mới nhất từ output prefix khi có kết quả fallback', async () => {
    vi.mocked(findLatestVideoObjectInGcsPrefix).mockResolvedValueOnce({
      gcsUri: 'gs://bucket/virtual-tryon/outputs/videos/video-1.mp4',
      updatedAtMs: Date.now(),
    });

    const result = await resolveVeoVideoFromOutputPrefix({
      outputStorageUri: 'gs://bucket/virtual-tryon/outputs/videos',
      requestStartedAtMs: Date.now() - 10_000,
    });

    expect(result).toEqual({
      gcsUri: 'gs://bucket/virtual-tryon/outputs/videos/video-1.mp4',
      mimeType: 'video/mp4',
    });
  });

  it('trả null khi fallback không tìm thấy file video', async () => {
    vi.mocked(findLatestVideoObjectInGcsPrefix).mockResolvedValueOnce(null);

    const result = await resolveVeoVideoFromOutputPrefix({
      outputStorageUri: 'gs://bucket/virtual-tryon/outputs/videos',
      requestStartedAtMs: Date.now() - 10_000,
    });

    expect(result).toBeNull();
  });
});

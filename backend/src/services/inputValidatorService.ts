import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

export type GarmentImageType = 'PRODUCT_ONLY' | 'MODEL_WORN' | 'INVALID';

export type InputValidationErrorCode =
  | 'INPUT_GARMENT_INVALID'
  | 'INPUT_GARMENT_MODEL_WORN'
  | 'INPUT_GARMENT_TOO_SMALL'
  | 'USER_IMAGE_INVALID'
  | 'USER_IMAGE_TOO_SMALL'
  | 'USER_IMAGE_ASPECT_RATIO'
  | 'INPUT_IMAGE_UNSUPPORTED';

interface ValidationError {
  code: InputValidationErrorCode;
  message: string;
  details?: Record<string, string | number | boolean>;
}

interface ValidationResult {
  ok: boolean;
  error?: ValidationError;
  garmentType?: GarmentImageType;
}

interface ImageInfo {
  width: number;
  height: number;
  hasAlpha: boolean;
  alphaCoverage: number;
}

const MIN_PERSON_WIDTH = 512;
const MIN_PERSON_HEIGHT = 512;
const MIN_GARMENT_WIDTH = 320;
const MIN_GARMENT_HEIGHT = 320;
const MAX_ASPECT_RATIO = 2.5;
const MIN_ASPECT_RATIO = 0.4;
const ALPHA_COVERAGE_THRESHOLD = 0.98;

const ALLOW_MODEL_WORN = process.env.TRYON_ALLOW_MODEL_WORN === 'true';

function decodeBase64Image(base64: string): Buffer {
  if (base64.startsWith('data:')) {
    const parts = base64.split(',');
    if (parts.length < 2) {
      throw new Error('Invalid data URL');
    }
    return Buffer.from(parts[1], 'base64');
  }
  return Buffer.from(base64, 'base64');
}

async function analyzeImage(buffer: Buffer): Promise<ImageInfo> {
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Missing image dimensions');
  }

  const { data, info } = await sharp(buffer)
    .resize({ width: 256, height: 256, fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let nonTransparent = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = data[i + info.channels - 1];
    if (alpha > 10) nonTransparent += 1;
  }

  const totalPixels = Math.max(1, info.width * info.height);
  const alphaCoverage = nonTransparent / totalPixels;

  return {
    width: metadata.width,
    height: metadata.height,
    hasAlpha: Boolean(metadata.hasAlpha),
    alphaCoverage,
  };
}

function validatePersonImage(info: ImageInfo): ValidationError | null {
  if (info.width < MIN_PERSON_WIDTH || info.height < MIN_PERSON_HEIGHT) {
    return {
      code: 'USER_IMAGE_TOO_SMALL',
      message: 'Ảnh người quá nhỏ. Vui lòng dùng ảnh rõ nét, toàn thân.',
      details: { width: info.width, height: info.height },
    };
  }

  const ratio = info.width / info.height;
  if (ratio > MAX_ASPECT_RATIO || ratio < MIN_ASPECT_RATIO) {
    return {
      code: 'USER_IMAGE_ASPECT_RATIO',
      message: 'Tỷ lệ ảnh người không phù hợp. Vui lòng dùng ảnh toàn thân thẳng đứng.',
      details: { ratio: Number(ratio.toFixed(2)) },
    };
  }

  return null;
}

function classifyGarmentImage(info: ImageInfo): GarmentImageType {
  if (info.width < MIN_GARMENT_WIDTH || info.height < MIN_GARMENT_HEIGHT) {
    return 'INVALID';
  }

  if (!info.hasAlpha) {
    return 'MODEL_WORN';
  }

  if (info.alphaCoverage >= ALPHA_COVERAGE_THRESHOLD) {
    return 'MODEL_WORN';
  }

  return 'PRODUCT_ONLY';
}

export async function validateTryOnInputs(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<ValidationResult> {
  try {
    const personBuffer = decodeBase64Image(personImageBase64);
    const garmentBuffer = decodeBase64Image(garmentImageBase64);

    const [personType, garmentType] = await Promise.all([
      fileTypeFromBuffer(personBuffer),
      fileTypeFromBuffer(garmentBuffer),
    ]);

    if (!personType?.mime?.startsWith('image/') || !garmentType?.mime?.startsWith('image/')) {
      return {
        ok: false,
        error: {
          code: 'INPUT_IMAGE_UNSUPPORTED',
          message: 'Định dạng ảnh không được hỗ trợ.',
        },
      };
    }

    const [personInfo, garmentInfo] = await Promise.all([
      analyzeImage(personBuffer),
      analyzeImage(garmentBuffer),
    ]);

    const personError = validatePersonImage(personInfo);
    if (personError) {
      return { ok: false, error: personError };
    }

    const garmentClass = classifyGarmentImage(garmentInfo);
    if (garmentClass === 'INVALID') {
      return {
        ok: false,
        error: {
          code: 'INPUT_GARMENT_TOO_SMALL',
          message: 'Ảnh sản phẩm quá nhỏ. Vui lòng dùng ảnh rõ nét, độ phân giải cao.',
          details: { width: garmentInfo.width, height: garmentInfo.height },
        },
      };
    }

    if (garmentClass === 'MODEL_WORN' && !ALLOW_MODEL_WORN) {
      return {
        ok: false,
        garmentType: garmentClass,
        error: {
          code: 'INPUT_GARMENT_MODEL_WORN',
          message: 'Ảnh sản phẩm phải là ảnh lingerie riêng (đã tách nền). Không dùng ảnh người mẫu mặc đồ.',
          details: {
            hasAlpha: garmentInfo.hasAlpha,
            alphaCoverage: Number(garmentInfo.alphaCoverage.toFixed(2)),
          },
        },
      };
    }

    return { ok: true, garmentType: garmentClass };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return {
      ok: false,
      error: {
        code: 'INPUT_GARMENT_INVALID',
        message: `Không thể đọc ảnh đầu vào: ${message}`,
      },
    };
  }
}

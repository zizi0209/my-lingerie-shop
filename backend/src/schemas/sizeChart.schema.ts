import { z } from 'zod';

// Schema cho từng entry trong bảng size
export const SizeEntrySchema = z.object({
  size: z.string().min(1, 'Size không được để trống'),
  bust: z.string().optional(),
  underBust: z.string().optional(),
  cup: z.string().optional(),
  waist: z.string().optional(),
  hips: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  braSize: z.string().optional(),
  pantySize: z.string().optional(),
  belly: z.string().optional(),
});

// Schema cho hướng dẫn cách đo
export const MeasurementStepSchema = z.object({
  name: z.string().min(1, 'Tên bước đo không được để trống'),
  description: z.string().min(1, 'Mô tả không được để trống'),
  image: z.string().url().optional(),
});

// Schema chính cho customSizeChart
export const CustomSizeChartSchema = z.object({
  name: z.string().min(1, 'Tên bảng size không được để trống'),
  headers: z.array(z.string()).min(2, 'Cần ít nhất 2 cột (Size + 1 thông số)'),
  sizes: z.array(SizeEntrySchema).min(1, 'Cần ít nhất 1 dòng size'),
  measurements: z.array(MeasurementStepSchema).optional(),
  tips: z.array(z.string()).optional(),
  note: z.string().optional(),
});

// Schema cho SizeChartTemplate (khi Admin update)
export const SizeChartTemplateUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  headers: z.array(z.string()).min(2).optional(),
  sizes: z.array(SizeEntrySchema).min(1).optional(),
  measurements: z.array(MeasurementStepSchema).optional(),
  tips: z.array(z.string()).optional(),
  internationalSizes: z.record(z.string(), z.unknown()).optional(),
  measurementImage: z.string().url().optional().nullable(),
  note: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Type inference từ schema
export type SizeEntry = z.infer<typeof SizeEntrySchema>;
export type MeasurementStep = z.infer<typeof MeasurementStepSchema>;
export type CustomSizeChart = z.infer<typeof CustomSizeChartSchema>;
export type SizeChartTemplateUpdate = z.infer<typeof SizeChartTemplateUpdateSchema>;

// Validation functions
export const validateCustomSizeChart = (data: unknown): CustomSizeChart => {
  const result = CustomSizeChartSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Invalid customSizeChart:\n${errors.join('\n')}`);
  }
  
  return result.data;
};

export const validateSizeChartTemplateUpdate = (data: unknown): SizeChartTemplateUpdate => {
  const result = SizeChartTemplateUpdateSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Invalid template data:\n${errors.join('\n')}`);
  }
  
  return result.data;
};

// ProductType enum matching Prisma
export const ProductTypeEnum = ['BRA', 'PANTY', 'SET', 'SLEEPWEAR', 'SHAPEWEAR', 'ACCESSORY'] as const;
export type ProductType = typeof ProductTypeEnum[number];

export const isValidProductType = (type: string): type is ProductType => {
  return ProductTypeEnum.includes(type as ProductType);
};

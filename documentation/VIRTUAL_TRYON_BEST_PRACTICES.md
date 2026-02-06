
# Virtual Try-On Feature - Best Practices & Implementation Guide

## Giải đáp thắc mắc về GPU/VRAM

### "12GB VRAM" nghĩa là gì?

**VRAM (Video RAM)** là bộ nhớ của card đồ họa (GPU), KHÔNG phải RAM thông thường của máy tính.

| Thuật ngữ | Giải thích |
|-----------|------------|
| **RAM** | Bộ nhớ hệ thống (8GB, 16GB, 32GB...) - dùng cho CPU |
| **VRAM** | Bộ nhớ card đồ họa (4GB, 8GB, 12GB...) - dùng cho GPU |

Khi chạy AI model như IDM-VTON **locally trên máy tính cá nhân**:
- Cần GPU NVIDIA với ≥12GB VRAM (RTX 3080, RTX 4070 Ti, A100...)
- Máy tính thông thường (laptop, PC văn phòng) thường có GPU yếu hoặc không có
- **KHÔNG PHÙ HỢP** cho deployment production

### Tại sao không thể deploy model này lên Railway/Vercel?

```
┌─────────────────────────────────────────────────────────────────┐
│                    VẤN ĐỀ VỚI AI MODELS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IDM-VTON / CatVTON / Diffusion Models                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Cần GPU với 8-12GB VRAM                              │   │
│  │  • Model size: 5-10GB                                   │   │
│  │  • Inference time: 30-60 giây/ảnh                       │   │
│  │  • Cost: $0.50-2/giờ GPU cloud                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Railway/Vercel Free Tier                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ❌ Không có GPU                                         │   │
│  │  ❌ RAM giới hạn (512MB-1GB)                             │   │
│  │  ❌ Timeout ngắn (10-30 giây)                            │   │
│  │  ❌ Không đủ storage cho model                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  KẾT LUẬN: Không thể self-host AI model trên free tier        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Giải pháp MIỄN PHÍ duy nhất: Hugging Face Spaces (ZeroGPU)

### Tại sao Hugging Face Spaces?

Hugging Face cung cấp **ZeroGPU** - GPU inference MIỄN PHÍ cho các Spaces public:

| Đặc điểm | Chi tiết |
|----------|----------|
| **Cost** | $0 (hoàn toàn miễn phí) |
| **GPU** | NVIDIA A10G / T4 (miễn phí, shared) |
| **Giới hạn** | Queue time khi đông (30s - 5 phút) |
| **Uptime** | 99%+ (Hugging Face infrastructure) |
| **Models có sẵn** | IDM-VTON, CatVTON, FASHN đã deploy |

### Architecture đề xuất (100% FREE)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ARCHITECTURE                         │
│                          (Hoàn toàn miễn phí)                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────┐                      ┌────────────────────────┐ │
│  │   VERCEL (Free)  │                      │  HUGGING FACE SPACES   │ │
│  │   Frontend       │                      │  (ZeroGPU - Free)      │ │
│  │                  │                      │                        │ │
│  │  Next.js App     │   Gradio Client     │  ┌──────────────────┐  │ │
│  │  ┌────────────┐  │ ──────────────────► │  │   IDM-VTON       │  │ │
│  │  │ TryOn Page │  │                      │  │   (Public Space) │  │ │
│  │  │            │  │ ◄────────────────── │  │                  │  │ │
│  │  │ • Upload   │  │   Generated Image   │  │  GPU: A10G       │  │ │
│  │  │ • Preview  │  │                      │  │  VRAM: 24GB      │  │ │
│  │  │ • Result   │  │                      │  │  Cost: $0        │  │ │
│  │  └────────────┘  │                      │  └──────────────────┘  │ │
│  │                  │                      │                        │ │
│  │  MediaPipe       │                      │  Alternatives:         │ │
│  │  (Client-side)   │                      │  • CatVTON             │ │
│  │  • Pose preview  │                      │  • FASHN VTON          │ │
│  │  • Body guide    │                      │  • OutfitAnyone        │ │
│  └──────────────────┘                      └────────────────────────┘ │
│          │                                                            │
│          │                                                            │
│          ▼                                                            │
│  ┌──────────────────┐                                                 │
│  │  RAILWAY (Free)  │                                                 │
│  │   Backend        │                                                 │
│  │                  │                                                 │
│  │  • User auth     │  ◄── Không xử lý AI ở đây!                     │
│  │  • Order history │      Chỉ lưu metadata                          │
│  │  • Try-on logs   │                                                 │
│  └──────────────────┘                                                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Frontend Integration (Tuần 1-2)

#### 1.1 Cài đặt dependencies

```bash
# Trong frontend/
npm install @gradio/client @mediapipe/tasks-vision react-webcam
```

#### 1.2 Component Structure

```
frontend/src/
├── components/
│   └── virtual-tryon/
│       ├── VirtualTryOnModal.tsx      # Modal chính
│       ├── PhotoUploader.tsx          # Upload/Camera
│       ├── PoseGuide.tsx              # Hướng dẫn pose (MediaPipe)
│       ├── GarmentSelector.tsx        # Chọn sản phẩm để try-on
│       ├── TryOnResult.tsx            # Hiển thị kết quả
│       ├── ProcessingQueue.tsx        # Loading/Queue status
│       └── PrivacyNotice.tsx          # Consent dialog
│
├── services/
│   └── virtual-tryon/
│       ├── huggingface-client.ts      # Gradio client wrapper
│       └── pose-detection.ts          # MediaPipe helper
│
└── hooks/
    └── useVirtualTryOn.ts             # Custom hook
```

#### 1.3 Core Service: Hugging Face Client

```typescript
// frontend/src/services/virtual-tryon/huggingface-client.ts
import { Client } from "@gradio/client";

export interface TryOnResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  processingTime?: number;
}

export interface TryOnOptions {
  personImage: File;
  garmentImage: File;
  garmentDescription?: string;
  denoiseSteps?: number;
  seed?: number;
}

// Primary: IDM-VTON (best quality)
const SPACES = {
  primary: "yisol/IDM-VTON",
  fallback1: "zhengchong/CatVTON", 
  fallback2: "texelmoda/virtual-try-on-diffusion-vton-d"
};

export async function virtualTryOn(options: TryOnOptions): Promise<TryOnResult> {
  const startTime = Date.now();
  
  try {
    // Connect to IDM-VTON Space
    const client = await Client.connect(SPACES.primary);
    
    const result = await client.predict("/tryon", {
      dict: {
        background: options.personImage,
        layers: [],
        composite: null,
      },
      garm_img: options.garmentImage,
      garment_des: options.garmentDescription || "clothing",
      is_checked: true,           // Auto-mask
      is_checked_crop: false,     // Don't auto-crop
      denoise_steps: options.denoiseSteps || 30,
      seed: options.seed || -1,   // Random seed
    });
    
    const processingTime = Date.now() - startTime;
    
    // Result contains [generated_image, masked_image]
    const generatedImage = result.data[0] as { url: string };
    
    return {
      success: true,
      imageUrl: generatedImage.url,
      processingTime,
    };
    
  } catch (error) {
    console.error("Virtual try-on failed:", error);
    
    // Try fallback space
    try {
      return await tryOnWithFallback(options);
    } catch (fallbackError) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

async function tryOnWithFallback(options: TryOnOptions): Promise<TryOnResult> {
  const client = await Client.connect(SPACES.fallback1);
  // CatVTON has different API signature
  const result = await client.predict("/tryon", {
    person_image: options.personImage,
    cloth_image: options.garmentImage,
  });
  
  return {
    success: true,
    imageUrl: (result.data[0] as { url: string }).url,
  };
}

// Check space status
export async function checkSpaceStatus(): Promise<{
  available: boolean;
  queueSize?: number;
}> {
  try {
    const client = await Client.connect(SPACES.primary);
    const status = await client.view_api();
    return { available: true };
  } catch {
    return { available: false };
  }
}
```

#### 1.4 React Hook

```typescript
// frontend/src/hooks/useVirtualTryOn.ts
import { useState, useCallback } from 'react';
import { virtualTryOn, TryOnResult, TryOnOptions } from '@/services/virtual-tryon/huggingface-client';

export type TryOnStatus = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'error';

export function useVirtualTryOn() {
  const [status, setStatus] = useState<TryOnStatus>('idle');
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [progress, setProgress] = useState(0);

  const tryOn = useCallback(async (options: TryOnOptions) => {
    setStatus('uploading');
    setProgress(10);
    
    try {
      setStatus('queued');
      setProgress(30);
      
      // Simulate queue (HF Spaces has queue)
      setStatus('processing');
      setProgress(50);
      
      const tryOnResult = await virtualTryOn(options);
      
      setProgress(100);
      setStatus(tryOnResult.success ? 'completed' : 'error');
      setResult(tryOnResult);
      
      return tryOnResult;
    } catch (error) {
      setStatus('error');
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setProgress(0);
  }, []);

  return {
    status,
    result,
    progress,
    tryOn,
    reset,
    isLoading: status === 'uploading' || status === 'queued' || status === 'processing',
  };
}
```

#### 1.5 Main Component

```tsx
// frontend/src/components/virtual-tryon/VirtualTryOnModal.tsx
'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { useVirtualTryOn } from '@/hooks/useVirtualTryOn';
import Image from 'next/image';

interface VirtualTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  garmentImage: string;  // Product image URL
  garmentName: string;
}

export function VirtualTryOnModal({
  isOpen,
  onClose,
  garmentImage,
  garmentName,
}: VirtualTryOnModalProps) {
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [personPreview, setPersonPreview] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { status, result, progress, tryOn, reset, isLoading } = useVirtualTryOn();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPersonImage(file);
      setPersonPreview(URL.createObjectURL(file));
    }
  };

  const handleTryOn = async () => {
    if (!personImage || !hasConsent) return;
    
    // Fetch garment image as File
    const garmentResponse = await fetch(garmentImage);
    const garmentBlob = await garmentResponse.blob();
    const garmentFile = new File([garmentBlob], 'garment.jpg', { type: 'image/jpeg' });
    
    await tryOn({
      personImage,
      garmentImage: garmentFile,
      garmentDescription: garmentName,
    });
  };

  const handleClose = () => {
    reset();
    setPersonImage(null);
    setPersonPreview(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            Phòng thử đồ ảo - {garmentName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Person Image Upload */}
          <div className="space-y-4">
            <h3 className="font-medium">Ảnh của bạn</h3>
            
            {!personPreview ? (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-pink-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600">
                  Tải lên ảnh toàn thân của bạn
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Khuyến nghị: Đứng thẳng, nền đơn giản
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                <Image
                  src={personPreview}
                  alt="Your photo"
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => {
                    setPersonImage(null);
                    setPersonPreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                >
                  X
                </button>
              </div>
            )}

            {/* Privacy Consent */}
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => setHasConsent(e.target.checked)}
                className="mt-1"
              />
              <span className="text-gray-600">
                Tôi đồng ý cho phép xử lý ảnh của tôi. Ảnh sẽ được gửi đến 
                Hugging Face để xử lý và <strong>không được lưu trữ</strong>.
              </span>
            </label>
          </div>

          {/* Right: Result */}
          <div className="space-y-4">
            <h3 className="font-medium">Kết quả</h3>
            
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
              {status === 'idle' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Image
                      src={garmentImage}
                      alt={garmentName}
                      width={200}
                      height={200}
                      className="mx-auto mb-4 opacity-50"
                    />
                    <p className="text-sm">Kết quả sẽ hiển thị ở đây</p>
                  </div>
                </div>
              )}
              
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
                  <Loader2 className="w-12 h-12 animate-spin text-pink-500 mb-4" />
                  <p className="text-sm text-gray-600">
                    {status === 'queued' && 'Đang chờ xử lý...'}
                    {status === 'processing' && 'Đang tạo ảnh thử đồ...'}
                  </p>
                  <div className="w-48 h-2 bg-gray-200 rounded-full mt-4">
                    <div 
                      className="h-full bg-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    Thời gian xử lý: 30-60 giây
                  </p>
                </div>
              )}
              
              {status === 'completed' && result?.imageUrl && (
                <Image
                  src={result.imageUrl}
                  alt="Try-on result"
                  fill
                  className="object-cover"
                />
              )}
              
              {status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-red-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm">{result?.error || 'Có lỗi xảy ra'}</p>
                    <Button onClick={reset} variant="outline" className="mt-4">
                      Thử lại
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={handleClose}>
            Đóng
          </Button>
          <Button
            onClick={handleTryOn}
            disabled={!personImage || !hasConsent || isLoading}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Thử đồ ngay
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Phase 2: Backend Logging (Optional, Tuần 3)

Lưu metadata về try-on sessions (không lưu ảnh user):

```sql
-- backend/prisma migration
CREATE TABLE virtual_tryon_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  status VARCHAR(20) NOT NULL,          -- 'pending', 'completed', 'failed'
  processing_time_ms INTEGER,
  hf_space_used VARCHAR(100),           -- 'yisol/IDM-VTON'
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Analytics fields
  device_type VARCHAR(20),              -- 'mobile', 'desktop'
  resulted_in_purchase BOOLEAN DEFAULT FALSE
);

-- Index for analytics
CREATE INDEX idx_tryon_product ON virtual_tryon_sessions(product_id);
CREATE INDEX idx_tryon_user ON virtual_tryon_sessions(user_id);
```

---

## Limitations & Considerations

### Hugging Face Spaces Limitations

| Aspect | Details |
|--------|---------|
| **Queue Time** | 30 giây - 5 phút khi đông |
| **Rate Limit** | Không official limit, nhưng có thể bị throttle |
| **Uptime** | 99%+ nhưng spaces có thể sleep khi không dùng |
| **Cold Start** | 10-30 giây nếu space đang sleep |
| **Image Size** | Max ~5MB per image |
| **Quality** | Rất tốt với IDM-VTON (ECCV2024) |

### Privacy Considerations (Quan trọng cho Lingerie!)

```
┌─────────────────────────────────────────────────────────────┐
│                    PRIVACY FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User uploads photo ──► Frontend (Vercel)               │
│                                │                            │
│  2. Photo sent to ────────────► Hugging Face Space         │
│                                │                            │
│  3. HF processes ─────────────► Generated image returned   │
│                                │                            │
│  4. Original photo ───────────► NOT STORED (HF policy)     │
│                                                             │
│  ⚠️  Ảnh được gửi qua internet đến HF servers              │
│  ⚠️  HF có thể log requests (check their privacy policy)   │
│  ✓  Ảnh không được lưu lâu dài                             │
│  ✓  Không lưu trên Railway/Vercel                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Cần có trong UI:**
1. Consent checkbox trước khi upload
2. Giải thích rõ ảnh được gửi đến đâu
3. Khuyến cáo không upload ảnh nhạy cảm
4. Option để blur/crop mặt trước khi gửi

---

## Alternatives nếu Hugging Face không đủ

### Nếu cần scale up (Trả phí)

| Service | Pricing | Khi nào dùng |
|---------|---------|--------------|
| **Replicate.com** | $0.0023/giây GPU | Cần API ổn định hơn |
| **Modal.com** | $0.0016/giây | Cần custom model |
| **RunPod** | $0.2-0.5/giờ | Cần dedicated GPU |
| **FASHN API** | $7.50/tháng | Production ready |

### Nếu chấp nhận chất lượng thấp hơn (100% Free)

**Client-side overlay approach:**
- MediaPipe detect body → position garment image on top
- Không cần GPU, chạy hoàn toàn trên browser
- Chất lượng: Basic overlay, không phải AI generation

---

## Summary

| Câu hỏi | Trả lời |
|---------|---------|
| 12GB VRAM là gì? | Bộ nhớ GPU, không phải RAM máy tính |
| Có thể deploy AI model lên Railway/Vercel? | Không, cần GPU |
| Giải pháp miễn phí? | Hugging Face Spaces (ZeroGPU) |
| Chất lượng? | Rất tốt (IDM-VTON từ ECCV2024) |
| Hạn chế? | Queue time 30s-5min khi đông |
| Privacy? | Ảnh gửi qua HF, không lưu lâu dài |

---

## Quick Start Checklist

- [ ] Cài đặt `@gradio/client` trong frontend
- [ ] Tạo component VirtualTryOnModal
- [ ] Implement HuggingFace client service
- [ ] Thêm button "Thử đồ ảo" vào trang sản phẩm
- [ ] Thêm Privacy consent dialog
- [ ] Test với IDM-VTON Space
- [ ] (Optional) Thêm MediaPipe pose guide
- [ ] (Optional) Backend logging for analytics
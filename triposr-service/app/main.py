import base64
import io
import os
import time
from typing import Optional

import numpy as np
import rembg
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from PIL import Image

from tsr.system import TSR
from tsr.utils import remove_background, resize_foreground


TRIPOSR_MODEL_ID = os.getenv("TRIPOSR_MODEL_ID", "stabilityai/TripoSR")
TRIPOSR_DEVICE = os.getenv("TRIPOSR_DEVICE", "cuda:0")
TRIPOSR_CHUNK_SIZE = int(os.getenv("TRIPOSR_CHUNK_SIZE", "8192"))
TRIPOSR_MAX_IMAGE_BYTES = int(os.getenv("TRIPOSR_MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))
DEFAULT_MC_RESOLUTION = int(os.getenv("TRIPOSR_DEFAULT_MC_RESOLUTION", "256"))

app = FastAPI()


class GenerateRequest(BaseModel):
    image: str = Field(..., description="Base64 hoặc data URI của ảnh đầu vào")
    mcResolution: int = Field(DEFAULT_MC_RESOLUTION, ge=64, le=512)
    backgroundRemoved: bool = True
    foregroundRatio: float = Field(0.85, ge=0.5, le=0.95)
    bakeTexture: bool = False
    textureResolution: int = Field(2048, ge=512, le=4096)
    returnPreview: bool = True


class GenerateResponse(BaseModel):
    success: bool
    glbBase64: Optional[str] = None
    previewPngBase64: Optional[str] = None
    processingTimeMs: Optional[int] = None
    error: Optional[str] = None


class ModelState:
    def __init__(self) -> None:
        self.model: Optional[TSR] = None
        self.device = "cpu"
        self.rembg_session = None
        self.ready = False


state = ModelState()


def _load_model() -> None:
    device = TRIPOSR_DEVICE
    if not torch.cuda.is_available():
        device = "cpu"

    model = TSR.from_pretrained(
        TRIPOSR_MODEL_ID,
        config_name="config.yaml",
        weight_name="model.ckpt",
    )
    model.renderer.set_chunk_size(TRIPOSR_CHUNK_SIZE)
    model.to(device)

    state.model = model
    state.device = device
    state.rembg_session = rembg.new_session()
    state.ready = True


@app.on_event("startup")
def startup_event() -> None:
    _load_model()


@app.get("/api/health")
def health() -> dict:
    return {
        "success": True,
        "ready": state.ready,
        "device": state.device,
        "cuda": torch.cuda.is_available(),
        "modelId": TRIPOSR_MODEL_ID,
    }


def _decode_image(image_data: str) -> Image.Image:
    if image_data.startswith("data:"):
        image_data = image_data.split(",", 1)[1]

    raw = base64.b64decode(image_data)
    if len(raw) > TRIPOSR_MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Ảnh quá lớn")

    return Image.open(io.BytesIO(raw))


def _prepare_image(image: Image.Image, background_removed: bool, foreground_ratio: float) -> Image.Image:
    if background_removed:
        return image.convert("RGB")

    assert state.rembg_session is not None
    image = remove_background(image, state.rembg_session)
    image = resize_foreground(image, foreground_ratio)
    image = np.array(image).astype(np.float32) / 255.0
    image = image[:, :, :3] * image[:, :, 3:4] + (1 - image[:, :, 3:4]) * 0.5
    image = Image.fromarray((image * 255.0).astype(np.uint8))
    return image


def _run_inference(payload: GenerateRequest) -> GenerateResponse:
    if not state.ready or state.model is None:
        return GenerateResponse(success=False, error="Model chưa sẵn sàng")

    start = time.time()
    image = _decode_image(payload.image)
    image = _prepare_image(image, payload.backgroundRemoved, payload.foregroundRatio)

    with torch.no_grad():
        scene_codes = state.model([image], device=state.device)
        meshes = state.model.extract_mesh(
            scene_codes,
            not payload.bakeTexture,
            resolution=payload.mcResolution,
        )

    mesh = meshes[0]
    glb_bytes = mesh.export(file_type="glb")
    if isinstance(glb_bytes, str):
        glb_bytes = glb_bytes.encode("utf-8")

    preview_base64 = None
    if payload.returnPreview:
        render_images = state.model.render(scene_codes, n_views=1, return_type="pil")
        preview_image = render_images[0][0]
        buffer = io.BytesIO()
        preview_image.save(buffer, format="PNG")
        preview_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    elapsed_ms = int((time.time() - start) * 1000)
    return GenerateResponse(
        success=True,
        glbBase64=base64.b64encode(glb_bytes).decode("utf-8"),
        previewPngBase64=preview_base64,
        processingTimeMs=elapsed_ms,
    )


@app.post("/api/generate", response_model=GenerateResponse)
def generate(payload: GenerateRequest) -> GenerateResponse:
    try:
        return _run_inference(payload)
    except HTTPException:
        raise
    except Exception as exc:
        return GenerateResponse(success=False, error=str(exc))

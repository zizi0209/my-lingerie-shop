import os
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
import torch

MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL_NAME",
    "sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
)
DEVICE = os.getenv("EMBEDDING_DEVICE", "cpu")
BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "32"))

app = FastAPI(title="Embedding Worker")


class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_items=1)


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int
    model: str


model = SentenceTransformer(MODEL_NAME, device=DEVICE)


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": DEVICE,
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest) -> EmbedResponse:
    texts = [text.strip() for text in request.texts if text.strip()]
    if not texts:
        raise HTTPException(status_code=400, detail="Danh sách text không hợp lệ")

    with torch.inference_mode():
        embeddings = model.encode(
            texts,
            batch_size=BATCH_SIZE,
            normalize_embeddings=True,
        )

    embedding_list = embeddings.tolist()
    dimension = len(embedding_list[0]) if embedding_list else 0

    return EmbedResponse(
        embeddings=embedding_list,
        dimension=dimension,
        model=MODEL_NAME,
    )

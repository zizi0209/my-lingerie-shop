FROM python:3.11-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
  PIP_DISABLE_PIP_VERSION_CHECK=1 \
  PYTHONDONTWRITEBYTECODE=1 \
  TMPDIR=/var/tmp

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libgomp1 \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /var/tmp

COPY requirements.txt .

RUN python -m venv /opt/venv \
  && /opt/venv/bin/pip install --upgrade pip \
  && /opt/venv/bin/pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.2.2 \
  && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY app.py .

RUN mkdir -p /cache/huggingface \
  && chown -R 65532:65532 /cache

FROM gcr.io/distroless/python3-debian12

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  HF_HOME=/cache/huggingface \
  TRANSFORMERS_CACHE=/cache/huggingface

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app/app.py /app/app.py
COPY --from=builder /usr/lib/x86_64-linux-gnu/libgomp.so.1 /usr/lib/x86_64-linux-gnu/
COPY --from=builder --chown=65532:65532 /cache /cache

ENV PATH="/opt/venv/bin:${PATH}"

USER 65532:65532

EXPOSE 8081

CMD ["-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8081"]

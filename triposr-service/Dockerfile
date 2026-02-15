ARG CUDA_VERSION=12.1.1
ARG UBUNTU_VERSION=22.04

FROM nvidia/cuda:${CUDA_VERSION}-cudnn8-runtime-ubuntu${UBUNTU_VERSION} AS base

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    git \
    curl \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
  && ln -sf /usr/bin/python3 /usr/local/bin/python \
  && ln -sf /usr/bin/pip3 /usr/local/bin/pip \
  && curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared \
  && chmod +x /usr/local/bin/cloudflared \
  && rm -rf /var/lib/apt/lists/*

RUN git clone --depth=1 https://github.com/VAST-AI-Research/TripoSR.git /opt/triposr

ENV PYTHONPATH=/opt/triposr

FROM nvidia/cuda:${CUDA_VERSION}-cudnn8-devel-ubuntu${UBUNTU_VERSION} AS builder

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-dev \
    python3-pip \
    python3-venv \
    git \
    curl \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    build-essential \
  && ln -sf /usr/bin/python3 /usr/local/bin/python \
  && ln -sf /usr/bin/pip3 /usr/local/bin/pip \
  && rm -rf /var/lib/apt/lists/*

COPY --from=base /opt/triposr /opt/triposr
COPY requirements.txt /tmp/requirements.txt

RUN python -m venv /opt/venv

ENV PATH=/opt/venv/bin:$PATH \
    PYTHONPATH=/opt/triposr \
    TORCH_CUDA_ARCH_LIST=8.6

RUN pip install --upgrade pip setuptools \
  && pip install --no-cache-dir torch==2.2.2 torchvision==0.17.2 \
  && export CMAKE_PREFIX_PATH="$(python -c "import torch; print(torch.utils.cmake_prefix_path)")" \
  && pip install --no-cache-dir -r /tmp/requirements.txt \
  && if [ -f /opt/triposr/requirements.txt ]; then pip install --no-cache-dir -r /opt/triposr/requirements.txt; fi \
  && pip install --no-cache-dir git+https://github.com/tatsy/torchmcubes.git

FROM base

ENV PATH=/opt/venv/bin:$PATH

COPY --from=builder /opt/venv /opt/venv

COPY app ./app
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8000

CMD ["/start.sh"]

# TripoSR build status

## Tình trạng hiện tại
- Docker build `triposr-service` chưa hoàn tất.
- Lần build gần nhất bị lỗi Docker Desktop API: `500 Internal Server Error` khi ping `dockerDesktopLinuxEngine`.
- Trước đó build bị timeout 900s trong bước cài dependency (đang chạy `pip install`), không có lỗi build rõ ràng.

## Thay đổi đã thực hiện
- `triposr-service/requirements.txt`: bỏ `torch==2.2.2`, `torchvision==0.17.2`, `git+https://github.com/tatsy/torchmcubes.git`.
- `triposr-service/Dockerfile`: cài `torch` + `torchvision` trước, set `CMAKE_PREFIX_PATH` bằng `python -c "import torch; print(torch.utils.cmake_prefix_path)"`, rồi cài `requirements.txt`, rồi cài `torchmcubes`.

## Lý do thay đổi
- Build lỗi khi cài `torchmcubes` do không tìm thấy `TorchConfig.cmake`. Việc cài `torch` trước và set `CMAKE_PREFIX_PATH` giúp `torchmcubes` tìm thấy Torch CMake config.

## Việc cần làm sau khi restart
1. Mở Docker Desktop.
2. Chạy lại build:
   ```bash
   docker build -t triposr-service "E:\\my-lingerie-shop\\triposr-service"
   ```
   Nếu vẫn timeout, tăng timeout lên 1200–1500s.
3. Chạy container:
   ```bash
   docker run -d --name triposr --gpus all -p 8000:8000 triposr-service
   ```
4. Healthcheck:
   ```bash
   curl http://localhost:8000/api/health
   ```
5. Cập nhật backend `.env`:
   ```
   TRIPOSR_ENDPOINT=http://localhost:8000
   TRIPOSR_API_MODE=fastapi
   ```

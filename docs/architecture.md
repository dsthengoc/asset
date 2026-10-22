# Kiến trúc

- `server.js`: Node HTTP server loopback, phục vụ frontend và proxy tới một `COMFY_URL` cố định. Chỉ cho các route ComfyUI cần thiết, chặn Origin khác, giới hạn request JSON 64 KB/multipart 12 MB, timeout upstream 30 giây. Không có database hoặc secret cloud.
- `public/app.js`: điều phối tạo/sửa, polling history, duyệt kết quả, phiên bản, import/export project. Không tự chạy thêm lượt AI; mỗi lượt do người dùng yêu cầu.
- `public/editor.js`: pixel buffer Canvas, bút/tẩy/fill/picker, mask, undo/redo. Mask là mảng nhị phân độc lập với alpha ảnh.
- `public/pixel.js`: median-cut palette, flood fill, ghép mask chính xác, builder workflow ComfyUI.
- `test/`: kiểm thử thuật toán và proxy HTTP bằng upstream giả lập.
- `scripts/browser-smoke.mjs`: kiểm thử Chromium với phản hồi AI giả lập.

## Vòng lặp AI

Tạo: CheckpointLoaderSimple → CLIPTextEncode (+ LoRA tùy chọn) → EmptyLatentImage 512² → KSampler → VAEDecode → SaveImage.

Sửa: ảnh sprite đang chỉnh và mask được upscale nearest lên 512² rồi upload vào ComfyUI bằng tên UUID. LoadImage/LoadImageMask(red) → VAEEncodeForInpaint → KSampler (denoise 0.85) → decode/save. Mask trắng là vùng sửa. Kết quả thu về được đưa lại kích thước sprite, lượng tử hóa rồi ghép qua mask gốc. Không tin rằng model tự giữ nguyên vùng ngoài mask.

Chỉ khi chấp nhận kết quả, metadata generation được thay và một phiên bản mới được lưu. Reject phục hồi đúng snapshot trước lượt chạy. Bản xem trước khóa thao tác chỉnh sửa để tránh mất nét vẽ đồng thời.

## Lưu trữ

Project JSON v1 chứa `format: pixel-loop`, `current` (RGBA + mask + kích thước), ảnh gốc PNG data URL, settings, generation và tối đa 30 phiên bản. Khi import kiểm tra kích thước, số lượng phần tử và giá trị byte/mask trước khi đưa vào Canvas. Không thực thi workflow trong project import. Node backend không ghi project lên ổ đĩa; người dùng chủ động tải xuống.

ComfyUI giữ file upload và ảnh output theo cơ chế riêng. Người dùng quản lý dung lượng thư mục input/output của ComfyUI.

## Khả năng mở rộng

Muốn thêm model khác, viết graph builder riêng và kiểm chứng node/schema của model đó. Không dùng graph SD 1.5 cho SDXL/Flux. Muốn animation/spritesheet, cần thêm mô hình frame và kiểm thử tính nhất quán trước khi mở rộng editor.

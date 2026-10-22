# Pixel Loop

Công cụ tạo và chỉnh asset pixel 2D bằng AI local: **prompt → ComfyUI → chuẩn hóa → vẽ tay → AI sửa vùng → duyệt kết quả → xuất PNG**.

## Chạy trên Windows — RTX 5060 8 GB, RAM 32 GB

1. Cài Node.js **22 trở lên** từ https://nodejs.org .
2. Cài [ComfyUI NVIDIA portable](https://docs.comfy.org/installation/comfyui_portable_windows). Dùng bản PyTorch/CUDA hỗ trợ RTX 50 series; chạy một workflow mẫu trong ComfyUI để xác nhận GPU hoạt động.
3. Tải checkpoint **SD 1.5** từ nhà phát hành đáng tin cậy, kiểm tra giấy phép và checksum nếu có. Đặt vào `ComfyUI/models/checkpoints`. LoRA pixel art phải tương thích SD 1.5, đặt trong `ComfyUI/models/loras`. Không dùng SDXL/Flux với workflow mặc định. Repo không kèm trọng số.
4. Khởi động ComfyUI, giữ địa chỉ mặc định `127.0.0.1:8188`.
5. Trong thư mục repo chạy:

```powershell
npm start
```

Mở trình duyệt trên máy tại `http://127.0.0.1:3000`. Ứng dụng không cần dependency runtime; không cần `npm install` để sử dụng. Có thể chạy `start-windows.bat` thay cho lệnh trên.

Nhấn **Kết nối ComfyUI**, chọn checkpoint và LoRA, nhập mô tả, nhấn tạo ảnh. Khi thêm model mới, refresh hoặc khởi động lại ComfyUI. Nếu dùng địa chỉ/cổng khác:

```powershell
$env:COMFY_URL = 'http://127.0.0.1:8188'
$env:PORT = '3000'
npm start
```

Backend chỉ nghe loopback. ComfyUI chạy ở máy khác chỉ nên dùng trong mạng tin cậy. Không cần bật CORS ComfyUI vì trình duyệt đi qua backend. Máy cloud không tự truy cập được GPU trên PC của bạn. Sau khi tải đủ model và phần mềm, luồng ứng dụng hoạt động offline.

## Tạo và chỉnh asset

- Tạo ảnh 512×512 hoặc tải PNG/JPEG/WebP (tối đa 20 MB/20 megapixel).
- Chuẩn hóa thành 32×32, 64×64 hoặc 128×128; giữ tỷ lệ, thêm khoảng trống.
- Chọn palette 8–64 màu và ngưỡng alpha. Palette dùng median-cut, không dithering; hiển thị nearest-neighbor.
- Vẽ trên ảnh bên phải: bút 1 pixel, tẩy, tô vùng, lấy màu. Click ô palette để chọn màu. Undo/redo lưu tối đa 80 trạng thái; đổi thông số chuẩn hóa tạo lại từ ảnh gốc và có thể Undo.
- Chọn **Vẽ vùng AI sửa**, vẽ mask hồng, nhập prompt mô tả phần thay thế, nhấn **AI sửa vùng chọn**. Ảnh hiện tại (bao gồm nét vẽ tay) và mask được gửi tới ComfyUI. Xem trước rồi chấp nhận hoặc bỏ.
- Kết quả AI được chuẩn hóa rồi ghép qua mask tại kích thước sprite. Pixel ngoài mask giữ nguyên tuyệt đối. Mask quá nhỏ có thể khiến AI khó tạo chi tiết; chọn vùng đủ rộng để có ngữ cảnh.
- **Phiên bản** lưu tối đa 30 mốc tạo, sửa tay/mask và sửa AI. Khôi phục có thể Undo. Undo/redo là lịch sử thao tác riêng, không được lưu vào project.
- **Lưu project** tải `.project.json` chứa ảnh gốc, ảnh hiện tại, mask, phiên bản và thông số. **Mở project** khôi phục dữ liệu. Giới hạn file project 40 MB. Metadata JSON xuất riêng chỉ chứa thông số, không thay thế project.
- Xuất PNG đúng kích thước đang chỉnh. Vẽ tay và ghép AI có thể làm số màu vượt giới hạn palette đã chọn; số màu thực tế luôn hiện trên ảnh.

Ứng dụng cảnh báo khi đóng trang đang có ảnh. Dữ liệu trong RAM không tự lưu; hãy tải project xuống. ComfyUI cũng lưu ảnh AI qua SaveImage. **Dừng chờ** bỏ chờ kết quả và yêu cầu xóa đúng tác vụ khỏi hàng đợi; không ngắt tác vụ đang chạy để tránh ảnh hưởng công việc khác. Thời gian chờ tối đa 15 phút không tự dừng GPU.

## Giới hạn chất lượng

Prompt/LoRA không bảo đảm pixel art đẹp. Bộ chuẩn hóa bảo đảm lưới, palette lúc xử lý và alpha nhị phân; không tự sửa bố cục, cụm pixel, xóa nền hay loại quầng RGB ở mép. Ảnh có nền đục cần tẩy thủ công hoặc tạo nền trong suốt trước. Alpha cứng không phù hợp khói/ánh sáng. SD 1.5 inpainting dùng các node lõi ComfyUI, chất lượng phụ thuộc checkpoint/LoRA và mask. Chưa đo tốc độ/VRAM trên RTX 5060.

## Phát triển và kiểm thử

```sh
npm test
```

Các kiểm thử Node không cần cài dependency: palette/alpha, flood fill, bảo toàn pixel ngoài mask, graph LoRA/inpainting và backend proxy với ComfyUI giả lập.

Kiểm thử trình duyệt:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

Nếu máy đã có Chromium, đặt `CHROMIUM_PATH` tới executable thay cho tải trình duyệt. Bài kiểm thử tự khởi động server, chạy upload, vẽ, undo/redo, project roundtrip, AI sửa vùng giả lập, accept/reject và xuất PNG. Artifact được ghi vào thư mục tạm của hệ điều hành. Không tải model hoặc chạy inference trong kiểm thử tự động.

Kiểm chứng AI thực tế trên Windows: kết nối ComfyUI, tạo sprite với seed 42, sửa bằng bút, vẽ mask, yêu cầu thay chi tiết, chấp nhận kết quả, xuất 64×64. Đánh giá độ dễ đọc của hình, mép và mức dùng VRAM. Phần này chưa được xác minh trong cloud.

Xem [kiến trúc](docs/architecture.md) để phát triển thêm. Phạm vi v1 là sprite đơn; animation, spritesheet, tác vụ hàng loạt và nhiều người dùng nằm ngoài phiên bản này.

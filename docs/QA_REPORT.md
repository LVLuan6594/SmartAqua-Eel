# Kiểm tra SmartAqua Eel — 26/10/2026

| Kiểm tra | Kết quả |
|---|---|
| Vitest | 123 test đạt, 29 tệp; báo cáo `artifacts/eel-tests.json` |
| TypeScript và Vite production build | Đạt; có cảnh báo bundle chính trên 500 kB |
| ESLint | Đạt |
| `check:data` và `data:validate` | Đạt; không có lỗi liên kết; đủ 103 mã xã/phường |
| Kiểm tra HTTP backend JSON cổng 8081 | health, snapshot, bể theo ID, kho công khai trả 200; gửi dataset cũ trả 400 |
| Trình duyệt localhost cổng 5174 | Đăng nhập admin, GIS chọn Vị Thủy, 103 lựa chọn xã/phường, nguồn công khai và thẻ cụm nuôi hiển thị |
| Ảnh TraiLuon | Dùng 4 ảnh người dùng bổ sung; giữ nguyên tệp gốc, chỉ gắn nhãn minh họa |
| Responsive sidebar | Desktop 304px, tablet 1024px có rail 80px; điện thoại 390px và 320px không tràn ngang menu; tìm BE-001 ra đúng cụm/hộ/bể, chọn bể tự đóng menu |
| Thu hoạch theo bể | Đã kiểm tra biểu mẫu trong hồ sơ P001 trên mobile; test xác nhận chỉ có vụ của bể đang chọn, ghi nhiều đợt và xác nhận kết thúc vụ |
| AI ảnh mẫu | Đã chạy nút dùng ảnh mẫu và phân tích trên trình duyệt; trả kịch bản phù đầu/đỏ đầu/nghi xuất huyết, có 4 liên kết nguồn, không có lỗi console ở phiên kiểm tra |
| Popup vùng trên GIS | Desktop: nhấp điểm Vị Thủy hiện 3 hộ, 9 bể, 188 m² bể và 900 m² vùng; nút xem hộ/bể mở đúng vùng. Test kiểm tra thiếu tọa độ, thiếu diện tích, phạm vi và số liệu sau sửa hồ sơ |
| Polygon hành chính | Vị Thủy hiển thị đúng hình dạng ranh giới xã; bấm polygon mở tổng 1 vùng, 3 hộ, 9 bể, 188 m². Test đối chiếu nguyên tọa độ polygon với dữ liệu 103 xã/phường, không dùng hình chữ nhật cụm |
| Dự báo theo hồ sơ | Unit/UI test tại vùng, hộ, bể và đường dẫn cũ; kiểm tra phạm vi, phép cộng cấp cha/con, trừ phần đã thu, thiếu đầu vào, mốc quá hạn và các kịch bản |

Test gồm các bộ kiểm tra nghiệp vụ hiện có và kiểm tra dataset chỉ lươn, quan hệ, phạm vi người dùng, gateway HTTP, độ phủ nguồn. Đây không phải bộ kiểm thử tự động toàn bộ các trang trên mọi thiết bị.

## Dữ liệu và giới hạn

- Seed mô phỏng: 8 cụm/HTX, 24 hộ, 72 bể, 144 vụ, 82 phiếu thu hoạch; không phải điều tra thực tế.
- Kho công khai: 13 nguồn, 14 quan sát, 103 dòng độ phủ. 80 địa bàn chưa thấy trong tập nguồn thu thập; không suy ra không có nuôi lươn. Chưa có bảng thống kê đồng nhất đầy đủ 103 xã/phường.
- Bản đồ hành chính là dữ liệu tham chiếu; tọa độ và hình học cụm/bể là mô phỏng.
- Gateway API thật gọi GET/PUT dataset và POST reset, có báo lỗi đồng bộ. Cần backend thực hiện auth, phân quyền và kiểm soát ghi đồng thời; Express JSON đi kèm chỉ phục vụ demo.
- Auth mock nằm tại trình duyệt. AI chat theo quy tắc, dự báo bằng công thức mô phỏng; AI ảnh đối chiếu nội dung tệp mẫu, chưa có mô hình chẩn đoán lươn. Ảnh mẫu được giữ khi tái tạo seed.
- Build hiện chưa chia nhỏ bundle chính; các tile bản đồ nền cần kết nối mạng.

## Lệnh kiểm tra lại

```powershell
npm test
npm run check:data
npm run data:validate
npm run build
npm run lint
```

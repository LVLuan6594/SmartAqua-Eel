# SmartAqua Eel — Demo quản lý nuôi lươn Cần Thơ

Hệ thống chỉ quản lý **lươn đồng**. Giữ luồng xã/phường → HTX/tổ hợp tác → cụm nuôi → hộ → bể → vụ → nhật ký → thu hoạch → báo cáo/GIS.

## Dữ liệu

- Danh mục và bản đồ đủ **103 xã/phường hiện tại** của Cần Thơ.
- Hồ sơ mô phỏng tại 8 địa bàn có nguồn đề cập hoạt động nuôi lươn: 24 hộ, 72 bể, 144 vụ gồm lịch sử 2025 và vụ 2026. Toàn bộ tên hộ, tổ hợp tác, tọa độ và giao dịch là giả lập.
- Chỉ một đối tượng SP1 / EEL / Lươn đồng. Diện tích bể nhập/hiển thị bằng m², areaHa dùng để tương thích các phép tổng hợp.
- **Dữ liệu công khai được lưu riêng**: 13 nguồn, 14 quan sát; bảng độ phủ 103 đơn vị. 18 địa bàn có nguồn nêu tên hiện tại, 3 địa bàn có nguồn lịch sử đã đối chiếu, 2 trường hợp cần rà soát ánh xạ và 80 địa bàn chưa thấy trong tập nguồn thu thập. Không coi chưa có nguồn là không có nuôi.
- Chưa tìm thấy bảng chỉ tiêu nuôi lươn đồng nhất cho đủ 103 xã/phường. Không chia số tổng thành phố thành hồ sơ hộ hoặc diện tích xã.
- Các số 4.000 tấn (15/4/2026) và trên 1.600 tấn / 372 hộ (18/4/2026) là **tồn đọng chưa tiêu thụ**, khác thời điểm/cơ quan báo cáo, không phải sản lượng đã thu hoạch.
- Dữ liệu tôm/cá, phụ lục cá tra, hình học OSM thủy sản chung và lịch sử nghiệp vụ cũ đã được gỡ khỏi bộ dữ liệu đang dùng. Giữ adapter và thuật toán không gian để tái sử dụng sau.

Nguồn, kỳ số liệu và giới hạn: [báo cáo tra cứu](docs/eel-public-data-research.md). Tệp máy đọc: src/data/eel-public-data.json.

## Chạy demo

Yêu cầu Node.js 20.19+ hoặc 22+, npm.

~~~powershell
npm install
npm run dev
~~~

Mở http://localhost:5173. Mặc định dùng mock JSON tại trình duyệt và đăng nhập demo. Bốn tài khoản có sẵn trong màn đăng nhập; chi tiết tại docs/AUTH_CONFIGURATION.md. start-demo.bat khởi động cả Vite và backend demo.

~~~powershell
npm run test
npm run check:data
npm run data:validate
npm run build
npm run lint
~~~

## Lưu trữ và tích hợp

Sao chép .env.example thành .env nếu cần chọn chế độ rồi khởi động lại Vite:

| VITE_DATA_MODE | Nguồn và cách ghi |
|---|---|
| mock (mặc định) | src/data/data.json + localStorage riêng của demo lươn, không tải dữ liệu nghiệp vụ từ server |
| json-server | Backend Express đi kèm; /api/data; lưu data/runtime/data.json, sao lưu trước khi ghi |
| api | DatasetGateway gọi GET/PUT /dataset và POST /dataset/reset dưới VITE_API_BASE_URL; mọi thao tác store dùng cùng gateway |

VITE_AUTH_MODE chọn mock hoặc api độc lập với dữ liệu. Backend demo không triển khai xác thực; chưa dùng để triển khai sản xuất. API thật cần tuân thủ [hợp đồng](docs/api-contracts.md), xác thực và phân quyền phía máy chủ.

Dữ liệu cũ không tự nạp vào demo lươn: datasetId khác, khóa lưu trình duyệt/tài khoản/lịch sử hội thoại mới, kiểm tra import/hydrate. Các thay đổi nghiệp vụ phản ánh vào facade canonical theo cùng store.

## Tái tạo dữ liệu

~~~powershell
npm run data:public:build
npm run data:mock:generate
# Chỉ khi muốn xóa thay đổi đang có ở backend:
node scripts/generate-eel-demo.mjs --reset-runtime
~~~

data:public:build dựng JSON và báo cáo từ các dữ kiện đã đối chiếu trong script; không tự thu thập tin mới. data:mock:generate dựng lại seed và snapshot GIS mô phỏng, không ghi đè runtime trừ khi có --reset-runtime.

AI chat truy vấn dữ liệu theo quy tắc; dự báo dùng công thức mô phỏng. Phân tích ảnh có kịch bản **phù đầu, đỏ đầu, nghi xuất huyết** cho `AI_PhuDau_DoDau.jpg`. Có nút dùng ảnh mẫu hoặc tải chính tệp đó lên; đối chiếu nội dung tệp, đổi tên vẫn nhận được, ảnh khác không bị gán cùng bệnh. Kết quả giữ trạng thái chưa xác nhận, có nguồn tham khảo và có thể lưu vào nhật ký sức khỏe đúng bể/vụ. Xem [mô tả kịch bản](docs/eel-image-analysis-demo.md).

Sidebar có tìm kiếm mục/cụm/hộ/bể, chế độ gọn trên tablet và menu kéo phủ trên điện thoại. Thu hoạch nằm trong tab của từng bể theo luồng **cụm → hộ → bể → thu hoạch**, không có mục thu hoạch độc lập trên sidebar. Đường dẫn cũ `/harvests?pond=P001` chuyển về `/ponds/P001?tab=harvests`; nếu chưa chọn bể thì về danh sách vùng nuôi.

GIS hiển thị điểm vùng nuôi/trang trại từ `aquacultureAreas.lat/lng`. Nhấp điểm để mở popup số hộ, số bể, tổng diện tích bể, diện tích vùng; mở thêm HTX, vụ và tọa độ hoặc đi đến hồ sơ. Từ zoom 11, lớp địa bàn có hồ sơ nuôi dùng **nguyên polygon ranh giới xã/phường thực**, không dùng ô chữ nhật quanh điểm. Nhấp polygon xem tổng theo địa bàn. Hình học bể mô phỏng là lớp tùy chọn, mặc định tắt, hiện từ zoom 14. Số liệu lấy từ store theo quyền tài khoản. Xem [mô tả GIS](docs/gis-data-coverage.md).

Dự báo nằm trong tab **Dự báo sản lượng** của từng vùng, hộ và bể, không có mục dự báo riêng trên sidebar. Công thức mô phỏng dùng số lượng thả, giả định tỷ lệ sống 80%, cỡ thu 200 g/con và hệ số kịch bản; trừ phần đã thu của từng vụ. Chỉ cộng vụ đang nuôi/đang thu hoạch thuộc hồ sơ, không sinh số mặc định khi thiếu đầu vào. Xem [hợp đồng API](docs/api-contracts.md).

Ảnh người dùng bổ sung tại `public/images/TraiLuon01.jpg`, `TraiLuon02.jpeg`, `TraiLuon03.png`, `TraiLuon04.jpg` được dùng cho nền đăng nhập và thẻ cụm/hộ/bể. Đây là ảnh minh họa; không xác nhận ảnh thuộc các hộ hoặc tọa độ mô phỏng.


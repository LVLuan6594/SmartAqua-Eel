# Kiến trúc demo nuôi lươn Cần Thơ

React/TypeScript/Vite, MUI, Leaflet, Recharts. Bốn vai trò admin, manager, coop, farmer. Route tại src/App.tsx, giao diện tại src/features, logic nghiệp vụ tại src/services và src/domain.

## Hai loại dữ liệu độc lập

1. **Nghiệp vụ mô phỏng**: src/data/data.json, seed backend data/seeds/data.json và runtime data/runtime/data.json. Một species EEL, datasetId cantho-eel-demo-v1. Khóa ngoại giữ areaId/farmerId/pondId/cycleId để thay backend không phải đổi chuỗi nghiệp vụ. ponds biểu diễn bể nuôi, areaM2 và areaHa nhất quán.
2. **Số liệu công khai**: src/data/eel-public-data.json, có sourceId, period, scope, qualifier, đơn vị, URL, mức rà soát và bảng coverage 103 mã. Không sinh phiếu thu hoạch hay tài khoản từ số liệu tổng hợp.

## Luồng đọc/ghi

JSON hoặc DatasetGateway → demoStore → application services/selectors → UI.
Mock adapter canonical đọc cùng demoStore, cache theo tham chiếu db; hook tổng hợp chạy lại khi db đổi. Không cache seed tĩnh thành một kho khác. Ranh giới hành chính tải GeoJSON, định danh ogis:<mã>.

Các thao tác vụ, nhật ký và thu hoạch giữ quan hệ. store.transaction tạo một phiên bản dataset nhất quán. Với nguồn HTTP, các snapshot được gửi tuần tự để tránh đảo thứ tự ghi trong một trình duyệt. UI hiển thị lỗi đồng bộ, cho thử lại/xuất bản cục bộ. Không có khóa đa người dùng hoặc optimistic locking ở backend demo.

## Chế độ nguồn

- mock: JSON + localStorage. Không âm thầm hydrate dữ liệu cũ qua /api/data.
- json-server: HttpDatasetGateway GET/POST /data, POST /demo/reset.
- api: HttpDatasetGateway GET/PUT /dataset, POST /dataset/reset.
- Bộ interface CRUD cũ được giữ; json-server endpoint data/<collection> phù hợp Express; API riêng có thể triển khai các resource endpoint.

Hợp đồng snapshot giúp mọi màn hình hiện có gọi backend mà không đọc tệp trực tiếp. Để tối ưu quy mô lớn, chuyển từng application service sang resource mutation, cache và paging; không coi snapshot toàn dataset là kiến trúc production đa người dùng.

## GIS và AI

GIS dùng ranh giới tham chiếu 103 xã/phường. Bể/cụm demo dựng từ store đang hoạt động và lọc quyền. Bản đồ không hiển thị dữ liệu OSM thủy sản chung thành cơ sở lươn. Không có tọa độ hộ lươn công khai đã xác minh.

Giữ thuật toán không gian, đo đạc, clipping và trình xem chi tiết. AI chat/dự báo mô phỏng; ảnh chưa có bộ tham chiếu lươn, không phân loại bệnh.

## Ranh giới triển khai

Mock auth là tiện ích demo. Backend Express lưu JSON, chưa xác thực/phân quyền server. Trước khi dùng thật cần Auth API, quyền theo địa bàn, giao dịch server, concurrency/versioning, validation, database, audit, upload và kiểm thử triển khai.


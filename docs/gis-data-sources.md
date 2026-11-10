# Nguồn dữ liệu GIS thực – SmartAqua GIS V3

> Tài liệu lịch sử về quy trình thu thập GIS. Phiên bản demo lươn chỉ dùng ranh giới 103 xã/phường bên dưới làm tham chiếu. Các lớp OSM thủy sản, phụ lục PDF cá và vùng nuôi cũ đã được làm rỗng, không được bật trong giao diện. Lớp cụm/bể hiện tại có tọa độ **mô phỏng**, gắn nhãn riêng và dựng từ store nghiệp vụ. Xem [độ phủ hiện tại](gis-data-coverage.md); các số đếm và lệnh nhập dữ liệu cũ bên dưới không mô tả bộ dữ liệu đang chạy.

> Màn hình `/gis` được nâng cấp để hiển thị dữ liệu không gian **có thật, có nguồn gốc và được phép phân phối lại** cho TP. Cần Thơ mới (sau Nghị quyết 1668/NQ-UBTVQH15). Nguyên tắc bất biến: **không bịa hình học**. Khi một khu vực không có dữ liệu xác minh, hệ thống hiển thị trạng thái "chưa có dữ liệu không gian xác minh" thay vì vẽ đối tượng giả.

## 1. Ranh giới hành chính (TP. Cần Thơ & 103 xã/phường)

| Thuộc tính | Giá trị |
|---|---|
| Nguồn | `ThangLeQuoc/vietnamese-provinces-database` (nhánh `master`) |
| Đường dẫn | `json/geojson/92_can_tho/` |
| Giấy phép | MIT |
| Tham chiếu gốc | Bản đồ Đơn vị hành chính Việt Nam 2025 – NXB Tài nguyên, Môi trường và Bản đồ Việt Nam (Bộ Nông nghiệp & Môi trường) |
| Căn cứ pháp lý | Nghị quyết 1668/NQ-UBTVQH15 (16/06/2025) |
| Hệ toạ độ | EPSG:4326 (WGS84) |
| Độ chính xác toạ độ | 6 chữ số thập phân |

**Sản phẩm xuất ra** (`public/geojson/can-tho/`):

- `city-boundary.geojson` – 1 feature, địa giới thành phố (mã `92`, diện tích 6.360,83 km²).
- `communes-103.geojson` – 103 feature (31 phường, 72 xã), thuộc tính chuẩn hoá: `code`, `name`, `nameEn`, `fullName`, `codeName`, `type` (`ward`/`commune`/`special`), `areaKm2`, `parentCode`, `parentName`, `gisServerId`, `postalCode`, `slug`.
- `gis-manifest.json` – manifest nguồn gốc cho mọi lớp (nguồn, giấy phép, thời điểm truy xuất, CRS, số lượng, cờ `verified`).

Cập nhật lại bằng:

```powershell
node scripts/fetch-gis-data.mjs            # giữ nguyên độ chi tiết
node scripts/fetch-gis-data.mjs --simplify 0.00035   # tuỳ chọn: làm mảnh (Douglas-Peucker)
```

## 2. Đối tượng nuôi trồng & vùng nước (xác minh)

| Thuộc tính | Giá trị |
|---|---|
| Nguồn | OpenStreetMap contributors |
| Truy xuất | Overpass API (nhập một lần có kiểm soát) |
| Giấy phép | ODbL 1.0 – bắt buộc ghi nguồn |
| Ghi nguồn | © OpenStreetMap contributors (ODbL) |
| Hệ toạ độ | EPSG:4326 (WGS84) |

**Sản phẩm xuất ra** (`public/geojson/aquaculture/`):

- `verified-aquaculture.geojson` – đối tượng có tag `aquaculture=*` hoặc `landuse=aquaculture`.
- `verified-water.geojson` – mặt nước tự nhiên `natural=water` (không gồm ao nuôi đã phân loại).

Mỗi feature giữ thông tin gốc: `osmType`, `osmId`, `osmUrl`, `name`, `aquaculture`, `produce`, `water`, `landuse`, `centroid`, mã và tên xã/phường chứa nó (`communeCode`, `communeName`), `license`.

Dữ liệu thô được lưu để tái lập: `scripts/gis-sources/osm-can-tho-water-aquaculture.json`.
Dựng lại lớp (lọc theo ranh giới thành phố + gán xã/phường) bằng:

```powershell
node scripts/build-gis-layers.mjs
```

## 3. Lớp dữ liệu mô phỏng (tách riêng)

`public/geojson/demo-features.geojson` (vùng nuôi, ao, HTX minh hoạ của bản trình diễn) **không** phải dữ liệu thực. Lớp này chỉ được nạp vào bản đồ khi người dùng bật, mặc định **tắt**, và mọi đối tượng đều gắn nhãn "minh hoạ".

## 4. Hạn chế đã biết (minh bạch)

- Lớp nuôi trồng/vùng nước phụ thuộc mức độ đóng góp của cộng đồng OSM nên **không đầy đủ**.
- Không sử dụng dữ liệu viễn thám có bản quyền hạn chế (ví dụ sản phẩm thương mại/không rõ điều khoản) để tránh rủi ro pháp lý khi phân phối lại.
- Toạ độ xã/phường và vùng nuôi là ranh giới tham chiếu/đối tượng cộng đồng vẽ, không phải số liệu đo đạc địa chính.

Xem thêm: [`gis-data-coverage.md`](./gis-data-coverage.md).

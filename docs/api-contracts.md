# Hợp đồng backend cho SmartAqua Eel

## Snapshot gateway đang được frontend sử dụng

Base URL cấu hình bằng VITE_API_BASE_URL. Chọn VITE_DATA_MODE=api:

| Endpoint | Phương thức | Nội dung |
|---|---|---|
| /dataset | GET | Trả trực tiếp DemoDB đúng schema nuôi lươn |
| /dataset | PUT | Body DemoDB; lưu snapshot trong một giao dịch; trả 204 hoặc JSON |
| /dataset/reset | POST | Trả DemoDB hoặc {data: DemoDB} |
| /eel-public-data | GET | Trả metadata, sources, observations, coverage, unresolvedMentions |
| /auth/login | POST | {username,password}; trả {user}, cookie phiên |
| /auth/session | GET | Trả {user} |
| /auth/logout | POST | Hủy phiên |

HTTP gửi credentials:include. dataset.metadata phải có datasetId=cantho-eel-demo-v1, speciesScope=eel-only, schemaVersion=2. species chỉ có SP1/code EEL. Mọi cycle phải thuộc bể và SP1; mọi nhật ký/thu hoạch thuộc cycle hợp lệ. Chỉ tiêu công khai không nằm trong harvests.

Frontend có localStorage cache; lỗi HTTP hiện ở banner và trang Dữ liệu & kết nối, không hiển thị đã đồng bộ. Snapshot gửi nối tiếp trong một phiên trình duyệt. Backend thật cần version/ETag hoặc giao dịch chống ghi đè giữa nhiều người dùng; demo hiện chưa hỗ trợ điều đó.

## Backend JSON đi kèm

VITE_DATA_MODE=json-server dùng GET/POST /api/data và POST /api/demo/reset. Backend lưu data/runtime/data.json. GET /api/eel-public-data phục vụ kho nguồn công khai. Đây là backend demo, không có Auth API.

Ngoài snapshot còn có GET/POST /api/data/:collection, GET/PUT/DELETE /api/data/:collection/:id. ApiRepository xử lý list trực tiếp hoặc {items}, và mutation trực tiếp hoặc {item}. Factory json-server trỏ đúng đường dẫn data/<collection>.

## Từ điển nghiệp vụ

- administrativeUnits: 103 mã xã/phường; id hiện bằng code.
- cooperatives.unitId → administrativeUnits.id.
- aquacultureAreas.coopId/unitId → HTX/địa bàn.
- farmers.areaId → vùng; farmer.coopId/unitId dẫn xuất.
- ponds.farmerId/areaId → hộ/vùng. ponds là **bể nuôi lươn**, areaM2 là m², areaHa=areaM2/10000.
- farmingCycles.pondId/speciesId/seedBatchId → bể/lươn/lô giống.
- feedDiaries, medicationDiaries, environmentObservations, growthObservations, healthEvents: cycleId.
- harvests: cycleId, pondId, date, quantityKg, batchNo, status. Nhiều đợt thu cho một vụ.
- aquacultureZones, zoneCommuneLinks: liên kết cụm demo với mã xã; không coi hình học mô phỏng là ranh giới đo đạc.

Tên và mã bảng ponds giữ ổn định để tương thích logic có sẵn. Không đổi đơn vị bằng cách chỉ đổi nhãn.

## Nguồn công khai

Observation gồm sourceId, scope, period, communeCodes, metrics[{name,value,unit,qualifier}], note, verificationStatus. scope phân biệt city, commune, group, household_case, historical_* và research_sample.

null thể hiện thiếu thông tin. Không chuyển số hộ thành tài khoản, không biến tồn đọng thành harvest, không chia số tổng thành phố xuống xã, không coi một tổ hợp tác là toàn xã. Cần rà soát riêng các nguồn khác kỳ hoặc sai/thiếu cấp địa bàn.

## Triển khai thật

Bắt buộc kiểm tra quyền từ danh tính server, xác thực đầu vào, giới hạn tải, transaction, khóa cạnh tranh, audit và phục hồi dữ liệu. VITE_AUTH_MODE=mock không cung cấp bảo mật. Backend demo chưa đáp ứng các điều kiện này.

## Dự báo trong từng hồ sơ

Khi `VITE_AI_MODE=api`, frontend gửi `POST /ai/production` dưới `VITE_API_BASE_URL`, có cookie phiên. Body gồm `scope:{kind:'area'|'farmer'|'pond',id}`, `scenarioId`, tùy chọn `asOf` (YYYY-MM-DD), `survivalRatePercent`, `targetWeightGrams`. Không có yêu cầu sản lượng chung không xác định phạm vi.

Response theo `ProductionForecastResponse`: scope, scopeName, asOf, isMock, counts, totals, assumptions, cycles và points. `points.period` là YYYY-MM; actual là đã thu đến ngày dự báo, forecast là phần còn lại được xếp theo mốc thu từng vụ; low/high là dải kịch bản. `totals.recordedKg` lũy kế trong phạm vi có thể dài hơn cửa sổ biểu đồ. Dự kiến thiếu đầu vào trả null kèm ghi chú, không gán 0 hoặc giá trị sản lượng chung.

Mock hiện dùng số lượng thả × tỷ lệ sống giả định (80%) × cỡ thu giả định (200 g) × hệ số − lượng đã thu của vụ, tối thiểu 0. Vụ hoàn tất/chuẩn bị không tạo dự kiến; vụ quá mốc thu được đánh dấu và xếp phần còn lại vào tháng hiện tại. Các giả định này phục vụ trình diễn, chưa phải mô hình nuôi lươn được xác thực.

`POST /ai/growth` nhận cycleId, scenarioId và scope; bể/vụ phải thuộc đúng phạm vi. Backend phải kiểm tra quyền trên scope và các bể, không tin chỉ kiểm tra phía frontend. Express JSON đi kèm chưa triển khai các endpoint AI thật.

Giao diện: `/areas/:id?tab=forecast`, `/areas/:areaId/farms/:farmerId?tab=forecast`, `/ponds/:id?tab=forecast`. `/ai/predict?pond=...`, `?farmer=...` hoặc `?area=...` chỉ chuyển về tab hồ sơ; không có tham số thì về danh sách vùng.


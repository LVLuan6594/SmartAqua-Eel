# Quan hệ dữ liệu demo nuôi lươn

Áp dụng cho dataset `cantho-eel-demo-v1`, schema 2, ngày 26/10/2026.

| Bảng | Quy mô seed | Quan hệ |
|---|---|---|
| administrativeUnits | 103 | id = mã xã/phường hiện tại |
| cooperatives | 8 | unitId → đơn vị hành chính |
| aquacultureAreas | 8 | coopId/unitId → HTX và địa bàn |
| farmers | 24 | areaId → cụm nuôi |
| ponds | 72 bể lươn | farmerId/areaId → hộ và cụm; areaHa = areaM2 / 10000 |
| species | 1 | SP1, EEL, Lươn đồng |
| farmingCycles | 144 | pondId → bể; speciesId luôn SP1; 72 vụ 2025 và 72 vụ 2026 |
| harvests | 82 | cycleId → vụ; quantityKg > 0 |
| Nhật ký thức ăn, môi trường, tăng trưởng | 864 mỗi nhóm | cycleId → vụ |
| gisFeatures | 80 | entityId → 8 cụm và 72 bể, hình học mô phỏng |
| aquacultureZones / zoneCommuneLinks | 8 / 8 | zone → cụm, HTX và mã xã |

Canonical adapter đọc từ snapshot store hiện tại. Hộ được ánh xạ thành facility `mock:FAC-<farmerId>`; bể liên kết facility và hộ. Khi thay đổi dữ liệu, bộ nhớ đệm canonical và lớp GIS cập nhật theo cùng snapshot. Các bộ đếm dùng phạm vi tài khoản đang đăng nhập.

Tất cả hồ sơ sản xuất, HTX, hộ, vị trí và phiếu thu hoạch trong seed đều mô phỏng. Danh mục hành chính là dữ liệu tham chiếu. Không tạo tài khoản hoặc tọa độ hộ thực từ báo chí.

Kho `eel-public-data.json` độc lập gồm `sources`, `observations`, `coverage` đủ 103 đơn vị và `unresolvedMentions`. Mỗi quan sát giữ nguồn, kỳ, cấp địa bàn, chỉ tiêu và mức xác minh. Không cộng số khác kỳ; tồn đọng chưa tiêu thụ không được coi là thu hoạch. `null` là thiếu thông tin.

Các adapter PDF/OSM và loại quan hệ tổng quát được giữ để phát triển sau, nhưng dữ liệu cũ đã làm rỗng. Validator phía client/server từ chối dataset cũ, loài khác và liên kết nghiệp vụ mồ côi. Xem [hợp đồng API](api-contracts.md).

# Từ điển dữ liệu (canonical)

> Bản demo lươn ngày 26/10/2026 dùng `cantho-eel-demo-v1`, schema 2. Bảng `ponds` biểu diễn **bể lươn**, `species` chỉ có SP1/EEL; `areaM2` là m², `areaHa=areaM2/10000`. Danh mục hành chính gồm 103 mã thật; hồ sơ sản xuất, tên và tọa độ là mô phỏng. Các trường nguồn PDF dưới đây là hợp đồng adapter được giữ lại, hiện không có bản ghi PDF. Số liệu báo chí lưu riêng trong `eel-public-data.json`, không nhập thành `Harvest`. Xem [quan hệ hiện hành](data-relationships.md).

> Nguồn định nghĩa: `src/domain/entities/*`, `src/domain/relationships/*`,
> `src/domain/sources.ts`. Mọi entity kế thừa `id`, `source`, `verificationStatus`,
> `sourceRef?`.

## Envelope chung

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | string | Id canonical có namespace (xem `data-architecture.md`) |
| `source` | `DataSourceType` | Loại nguồn gốc |
| `verificationStatus` | `verified \| needs_review \| unresolved` | Mức xác minh |
| `sourceRef` | `{id,type,page?,recordRef?}` | Tham chiếu bản ghi nguồn để truy vết |

## Đơn vị hành chính — `AdministrativeUnit`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `code` | string | Mã hành chính (khoá nghiệp vụ) |
| `name`,`nameEn`,`fullName` | string | Tên |
| `type` | `city\|ward\|commune\|special\|mock` | Loại đơn vị |
| `parentCode`,`parentName` | string\|null | Cấp trên |
| `areaKm2` | number\|null | Diện tích |
| `geometry` | Geometry\|null | Ranh giới |

## Vùng nuôi — `AquacultureZone`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `zoneId` | string | Khoá vùng (giữ nguyên mã nguồn) |
| `code`,`name` | string | Mã/nhãn |
| `aquacultureType` | string | Hình thức nuôi |
| `species` | string[] | Loài |
| `geometryStatus` | `verified\|digitized\|derived\|unavailable\|synthetic` | Nguồn hình học |
| `dataStatus` | `verified\|partial\|mock` | Chất lượng nghiệp vụ |
| `totalAreaHa` | number\|null | Diện tích |
| `communeCodes` | string[] | Xã/phường giao cắt (dẫn xuất) |
| `areaIds`,`coopIds` | string[] | Liên kết dữ liệu mô phỏng |
| `geometry` | Geometry\|null | Ranh giới (có thể không tồn tại) |

## Hợp tác xã — `Cooperative`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `code`,`name` | string | Mã/tên |
| `scopeCommuneCodes` | string[] | Địa bàn |
| `zoneIds`,`areaIds`,`facilityIds` | string[] | Phạm vi quản lý |
| `status`,`contact` | string\|null | Trạng thái/liên hệ |

## Cơ sở / hộ nuôi — `AquacultureFacility`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `codeOriginal` | string\|null | Mã gốc (vd `92-01-000001`) |
| `facilityType` | `household\|enterprise\|cooperative\|unknown` | Loại |
| `displayName` | string | Nhãn (đã khử định danh) |
| `addressSource`,`addressCurrent` | string\|null | Địa chỉ nguồn/hiện tại |
| `communeCode`,`communeName` | string\|null | Đơn vị hành chính |
| `mappingMethod` | `coordinate\|address\|unresolved` | Cách xác định đơn vị |
| `lat`,`lng` | number\|null | Điểm đại diện |
| `coordinateConfidence` | `high\|medium\|low\|none` | Độ tin cậy toạ độ |
| `pondIds` | string[] | Ao thuộc cơ sở |
| `pondCountSource` | number | Số ao theo hồ sơ nguồn |
| `species`,`areaM2Total` | | Loài, tổng diện tích |
| `pondsWithArea`,`pondsWithCoordinates` | number | Độ phủ |
| `sourceIndex`,`sourcePage` | number\|null | Vị trí trong nguồn |

## Nông dân — `Farmer`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `code`,`name` | string | Mã/tên |
| `accountId` | string\|null | Tài khoản (chỉ khi có xác nhận) |
| `facilityId`,`cooperativeId` | string\|null | Liên kết |
| `pondIds` | string[] | Ao được giao |
| `linkStatus` | `linked\|unlinked\|needs_review` | Trạng thái liên kết |
| `status` | string | Trạng thái |

## Ao nuôi — `Pond`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `code`,`name` | string\|null | Mã gốc/tên |
| `facilityId`,`farmerId` | string\|null | Liên kết |
| `communeCode` | string\|null | Địa bàn |
| `zoneIds` | string[] | Vùng chứa ao (dẫn xuất) |
| `areaM2`,`areaHa`,`areaUnit` | | Diện tích + đơn vị |
| `lat`,`lng`,`geometry` | | Điểm đại diện / ranh giới |
| `geometryScope` | `representative_point\|pond_boundary\|null` | Loại hình học |
| `coordConfidence` | `high\|medium\|low\|none` | Độ tin cậy |
| `status`,`duplicateOf` | | Trạng thái, mã trùng |

## Vụ nuôi — `FarmingCycle`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `code` | string | Mã vụ |
| `pondId` | string | Ao (bắt buộc) |
| `speciesId`,`speciesName` | string\|null | Loài |
| `stockingDate`,`stockingQuantity` | | Ngày/số lượng thả |
| `seedBatchId`,`seedSource` | string\|null | Nguồn giống |
| `status` | string | Trạng thái |
| `expectedHarvestDate`,`endDate` | string\|null | Mốc thời gian |

## Nhật ký — `FarmingDiary`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `cycleId` | string | Vụ (bắt buộc) |
| `category` | `feed\|medication\|environment\|growth\|health\|activity` | Nhóm |
| `date` | string | Ngày |
| `values` | Record<string,number> | Giá trị đo (ph, temperature, oxygen, averageGrams…) |
| `productId`,`amountKg`,`summary`,`notes` | | Chi tiết |

## Thu hoạch — `Harvest`

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `cycleId` | string | Vụ |
| `pondId` | string\|null | Ao |
| `date` | string | Ngày |
| `quantityKg` | number | Sản lượng (kg, > 0) |
| `batchNo` | number\|null | Đợt |
| `status`,`updatedBy` | | Trạng thái, người cập nhật |

## Quan hệ (relationships)

| Quan hệ | Ý nghĩa |
|---|---|
| `ZoneAdministrativeUnit` | Vùng × xã/phường (nhiều–nhiều, giao diện tích) |
| `CooperativeFacilityRelation` | HTX × cơ sở (chỉ khi có xác nhận) |
| `FacilityPondRelation` | Cơ sở × ao |
| `FarmerPondAssignment` | Nông dân × ao (vai trò, thời gian) |
| `ZonePondRelation` | Ao × vùng (khai báo hoặc suy từ điểm) |
| `UserPondAssignment` | Tài khoản × ao (vai trò `admin\|manager\|coop\|farmer`) |

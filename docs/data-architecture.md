# Dữ liệu nuôi lươn

Tài liệu hiện hành: [kiến trúc](architecture.md), [hợp đồng API và các bảng](api-contracts.md), [nguồn công khai](eel-public-data-research.md).

Luồng nghiệp vụ: xã/phường → HTX/tổ hợp tác → cụm → hộ → bể → vụ → nhật ký/thu hoạch. Giữ các khóa cũ để tái sử dụng logic; ponds là bể lươn, SP1/EEL là đối tượng duy nhất.

JSON seed, store, gateway và facade canonical đọc cùng dataset hiện tại. Namespace canonical mock:<id> dành cho hồ sơ mô phỏng và ogis:<mã> dành cho địa bàn tham chiếu; loại trùng theo id. Nguồn PDF/OSM nghiệp vụ cũ rỗng và không tham gia số liệu.

Kho số liệu công khai độc lập, không dùng làm sổ nhật ký/thu hoạch. Nguồn báo chí, trường hợp hộ và mẫu nghiên cứu giữ thời kỳ, cấp địa bàn, đơn vị và mức độ rà soát riêng.

Diện tích: areaM2 m² và areaHa=areaM2/10000. Thu hoạch: quantityKg kg. Không cộng lượng tồn đọng hoặc diện tích tự nhiên xã thành quy mô bể.


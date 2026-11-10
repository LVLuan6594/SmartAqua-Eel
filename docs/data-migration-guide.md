# Vận hành dữ liệu demo lươn

- npm run data:public:build: dựng kho nguồn công khai và báo cáo từ các dữ kiện đã đối chiếu trong scripts/build-eel-public-data.mjs. Không tự tải tin mới.
- npm run data:mock:generate: dựng lại src/data/data.json, data/seeds/data.json và snapshot hình học demo. Ghi đè các seed này; không đổi runtime.
- node scripts/generate-eel-demo.mjs --reset-runtime: dựng lại và thay thế runtime. Chỉ dùng khi muốn bỏ thay đổi backend.
- npm run data:validate / npm run data:report / npm run check:data: kiểm tra hoặc báo cáo, không thay dữ liệu.
- npm run data:export: xuất runtime hiện tại.
- npm run data:restore -- <path>: khôi phục runtime từ JSON lươn đúng marker và quan hệ.
- data:migrate / data:rollback là công cụ schema cũ được giữ để tái sử dụng; không dùng để nạp lại dataset tôm/cá.

Trình duyệt dùng khóa smart-aqua-eel-demo-v1; dữ liệu đa loài cũ không được hydrate/import. Không đưa các bản sao lưu tôm/cá cũ trở lại seed.

Các script nhập PDF/dựng OSM cũ không được dùng trong pipeline lươn. Muốn tích hợp nguồn mới, thêm adapter riêng và ghi provenance; chưa có nguồn tọa độ hộ thì giữ null.


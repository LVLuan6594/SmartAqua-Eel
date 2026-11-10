# Khởi động demo nuôi lươn trên Windows

Cài Node.js 20.19+ hoặc 22+, mở F:\SmartAquaDemoEel và chạy start-demo.bat hoặc npm install rồi npm run dev. Mở địa chỉ Vite in ra (mặc định http://localhost:5173).

Mặc định là mock JSON + localStorage; bản dựng preview cũng cho đăng nhập demo khi không chọn API. Bốn tài khoản được hiển thị ở màn đăng nhập.

Nếu muốn lưu JSON máy chủ: sao chép .env.example thành .env, đổi VITE_DATA_MODE=json-server và khởi động lại. Backend chạy cổng 8080. API thật dùng VITE_DATA_MODE=api và VITE_API_BASE_URL theo docs/api-contracts.md.

Xem Dữ liệu công khai để tra nguồn và độ phủ đủ 103 xã/phường; các màn nghiệp vụ là hồ sơ lươn mô phỏng riêng.


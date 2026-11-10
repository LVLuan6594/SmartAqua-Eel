# Kịch bản ảnh lươn phù đầu, đỏ đầu

Ngày đối chiếu tài liệu: 26/10/2026. Ảnh mẫu `public/images/AI_PhuDau_DoDau.jpg` do người dùng cung cấp, 792 × 664 px. Không tải thêm ảnh hoặc sao chép bài viết từ các trang tham khảo.

## Trải nghiệm demo

Mở **Phân tích ảnh → Dùng ảnh mẫu → Bắt đầu phân tích**, hoặc tải chính tệp mẫu từ thiết bị. Kết quả là “Phù đầu, đỏ đầu — nghi bệnh xuất huyết”, đối tượng lươn đồng, trạng thái chưa xác nhận.

Kịch bản được đọc từ `src/data/mock/image-disease-scenarios.json`. Dịch vụ so sánh nội dung byte với tệp ảnh mẫu tại cùng ứng dụng; đổi tên tệp vẫn nhận đúng mẫu. Ảnh cắt, nén lại hoặc ảnh khác chưa có mẫu trả chưa có nhận định. Đây là mô phỏng minh bạch, không có mô hình nhận diện hoặc phần trăm độ tin cậy. Không dùng tên tệp làm bằng chứng bệnh.

Ảnh cho thấy mảng đỏ ở vùng đầu/quanh hàm của một số con. Mức độ phù, tổn thương nội tạng, tình trạng ăn và tác nhân vi khuẩn không xác định từ ảnh. Vì vậy kết quả tách dấu hiệu nhìn thấy khỏi nguyên nhân cần kiểm tra; không coi phù đầu và xuất huyết là một bệnh đã được xác nhận.

Có thể lưu nhận định vào nhật ký sức khỏe bằng cách chọn đúng bể/vụ và xác nhận kết quả mô phỏng. Lưu đường dẫn ảnh mẫu, nội dung và nguồn; không ghi blob ảnh vào localStorage. Quyền ghi áp dụng theo vai trò và phạm vi bể.

## Tài liệu tham khảo

- [Đặng Thị Hoàng Oanh và Nguyễn Đức Hiền, Đại học Cần Thơ, 2012](https://ctujsvn.ctu.edu.vn/index.php/ctujsvn/article/view/1280): nghiên cứu phân lập và thử khả năng gây bệnh xuất huyết của Aeromonas hydrophila trên lươn đồng. Căn cứ cho hướng kiểm tra vi khuẩn; không xác nhận tác nhân của ảnh mẫu.
- [Green Bio — Phù đầu, đỏ đầu, xuất huyết](https://tapdoangreenbio.vn/luon-bi-phu-dau-do-dau-xuat-huyet/): tài liệu doanh nghiệp phân biệt sưng/phù đầu với các biểu hiện đỏ, xuất huyết và đề cập Edwardsiella/Aeromonas. Không chuyển các nhận định thương mại thành chẩn đoán chắc chắn.
- [Báo Vĩnh Long, 11/10/2022](https://baovinhlong.com.vn/kinh-te/nong-nghiep/202210/nha-nong-tim-hieu-phong-tru-benh-xuat-huyet-tren-luon-3139106/): mô tả biểu hiện sưng đỏ đầu và diễn biến bệnh để tham khảo quan sát đàn.
- [BIO-PHARMACHEMIE — Kiểm soát lươn bị xuất huyết](https://www.biopharmachemie.com/thong-tin-ky-thuat/cham-soc-phong-tri-benh-tren-ca/kiem-soat-luon-bi-xuat-huyet-khi-nuoi-thuong-pham.html): tài liệu doanh nghiệp nêu các hướng môi trường, dinh dưỡng và nhiễm khuẩn. Demo dùng cho gợi ý kiểm tra, không sao chép quảng cáo thuốc hoặc liều điều trị.

UI hiển thị các liên kết nguồn ngay trong kết quả. Khi có mô hình thật, chọn `VITE_AI_IMAGE_MODE=api`, cấu hình `VITE_AI_IMAGE_ENDPOINT`; adapter gửi multipart `image` và ngữ cảnh pondId/cycleId nếu có. Backend trả `ImageAnalysisResult`, giữ nguồn, thời gian và mức xác minh.

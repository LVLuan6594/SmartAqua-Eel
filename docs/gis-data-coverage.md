# GIS demo lươn

Ranh giới tham chiếu giữ đủ 103 xã/phường (31 phường, 72 xã). Các hình học nuôi trồng chung từ OSM và phụ lục cá tra đã bỏ khỏi dữ liệu hoạt động.

8 cụm có điểm tọa độ mô phỏng; 72 bể có hình học mô phỏng tùy chọn. Không hiển thị hình chữ nhật giả làm ranh giới vùng nuôi. Điểm bể nằm trong xã được khai báo; không phải tọa độ hộ ngoài thực địa.

## Điểm vùng nuôi / trang trại

- Lấy điểm từ `aquacultureAreas.lat/lng`, không phụ thuộc tệp hình học đã xuất. Chỉ vẽ khi cả hai giá trị hợp lệ; bỏ qua giá trị trống, không hữu hạn hoặc ngoài khoảng vĩ độ/kinh độ.
- Lớp điểm xanh xuất hiện từ mức toàn thành phố. Nhấp mở popup; danh sách vùng có nút định vị và mở cùng popup. Có thể bật/tắt riêng điểm vùng và hình học bể.
- Popup cộng số hộ, số bể và diện tích từ hồ sơ đang có trong phạm vi tài khoản. Tổng diện tích bể dùng m², chuyển từ ha nếu thiếu m². Thiếu diện tích thì ghi rõ số bể có số liệu, không mặc định thiếu thành 0. Diện tích vùng khai báo hiển thị riêng, không coi là tổng diện tích bể.
- Có thể mở thêm HTX, vụ đang hoạt động, tọa độ; nút **Xem hộ & bể nuôi** mở chuỗi nghiệp vụ của vùng, **Mở hồ sơ** đến trang vùng tương ứng.
- Bộ lọc xã/phường áp dụng cả điểm, polygon địa bàn và lớp bể mô phỏng. Hình học bể là lớp tùy chọn mặc định tắt, hiện từ zoom 14. Không tự suy vị trí hộ từ báo chí hoặc tự vẽ cho vùng thiếu tọa độ.
- Trong seed hiện tại, Vị Thủy có 3 hộ, 9 bể, tổng 188 m² bể và 900 m² vùng. Các giá trị này là mô phỏng; sau chỉnh sửa hồ sơ popup đọc lại dữ liệu mới.

Độ phủ bằng chứng công khai: xem eel-public-data-research.md và trang /public-data. Có nguồn nêu địa bàn không có nghĩa đã có ranh giới bể, danh sách đầy đủ hộ hoặc số liệu cùng kỳ.

Các thuật toán point-in-polygon, bounds, clipping và đo vẫn giữ. Không suy ra vùng sản xuất thực bằng cách gom các điểm bể demo.

## Polygon địa bàn có hồ sơ nuôi

Từ zoom 11, tô những xã/phường có hồ sơ nghiệp vụ nuôi lươn trong phạm vi xem. Hình học được lấy nguyên từ `communes-103.geojson`, không tạo hình vuông, hình tròn hoặc buffer quanh điểm cụm. Polygon thể hiện **địa bàn có hồ sơ nuôi**, không xác nhận toàn bộ diện tích xã là diện tích đang nuôi.

Bấm polygon mở tổng số vùng, hộ, bể và tổng diện tích bể của xã/phường. Dữ liệu tổng hợp vẫn tuân theo quyền xem; bản ghi có mã xã hợp lệ nhưng chưa có tọa độ vẫn được cộng theo địa bàn. Bấm nút xem vùng để mở danh sách trong xã/phường. Tên, tọa độ và số liệu sản xuất của seed vẫn là mô phỏng, độc lập với hình học hành chính.


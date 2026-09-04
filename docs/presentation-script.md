# Kịch bản thuyết trình — Hệ thống Quản trị Kinh doanh (~15 phút)

Thứ tự trình bày: **Kiệt** (Slide 1–19) → **Long** (Slide 20–36) → **Lý** (Slide 37–51, kết thúc).
Ghi chú: câu *in nghiêng* là hành động/chuyển slide; phần còn lại là lời nói.

---

## PHẦN 1 — NGUYỄN TUẤN KIỆT (Slide 1–19, ~5 phút)
*Mở đầu: giới thiệu, bài toán, kiến trúc, dữ liệu, cơ chế giao tiếp phân tán.*

**[Slide 1 — Trang bìa]**
Em xin kính chào thầy và các bạn. Nhóm em gồm 4 thành viên, hôm nay xin trình bày đồ án môn Ứng dụng phân tán, với đề tài **Hệ thống Quản trị Kinh doanh** — một hệ thống được xây dựng theo kiến trúc microservices. Em là Tuấn Kiệt, đại diện nhóm mở đầu phần trình bày với bối cảnh bài toán và tổng quan kiến trúc; sau đó bạn Long và bạn Lý sẽ trình bày các phần tiếp theo.

**[Slide 2 — Nội dung]**
Bài trình bày của nhóm em gồm 11 phần. Nhóm em sẽ đi từ bài toán thực tế của doanh nghiệp, đến cách thiết kế kiến trúc và dữ liệu, rồi các cơ chế cốt lõi của một hệ phân tán như quy trình duyệt, ký điện tử và xử lý bất đồng bộ. Cuối cùng là phần demo, triển khai và kiểm thử. *Chúng ta bắt đầu với phần đầu tiên — bài toán.*

**[Slide 3 — Divider 01: Bài toán & Yêu cầu]**
Trước tiên, em xin nói rõ bài toán mà hệ thống cần giải quyết, để thầy và các bạn thấy vì sao nhóm em chọn hướng thiết kế như vậy.

**[Slide 4 — Bối cảnh doanh nghiệp]**
Khách hàng của chúng ta là công ty ABC — một doanh nghiệp logistics, chuyên khai thác cảng, vận chuyển, lưu kho và bốc xếp. Đặc điểm của họ là mỗi tháng phát sinh rất nhiều loại hồ sơ: hợp đồng, phụ lục hợp đồng, bảng giá, sản lượng thực tế, rồi bảng thanh toán. Điều quan trọng là các hồ sơ này không do một người xử lý, mà đi qua nhiều phòng ban khác nhau — kinh doanh, khai thác, kế toán, pháp chế, và ban giám đốc.

**[Slide 5 — Vấn đề hiện trạng]**
Hiện tại họ làm thủ công qua email, Excel và giấy tờ. Cách này gây ra bốn vấn đề lớn: thông tin bị phân tán ở nhiều nơi; khó kiểm soát một hồ sơ đang ở trạng thái nào và ai đang giữ; đặc biệt khó truy vết lịch sử thay đổi khi có tranh chấp; và rất dễ sai lệch khi giá hoặc sản lượng thay đổi giữa chừng. Từ những vấn đề đó, ban lãnh đạo yêu cầu một hệ thống tập trung, quản lý trọn vòng đời hồ sơ — từ khách hàng, hợp đồng, cho đến phê duyệt và ký điện tử.

**[Slide 6 — Yêu cầu chức năng]**
Về mặt chức năng, nhóm em chia thành hai nhóm. Nhóm nghiệp vụ lõi gồm: quản lý khách hàng và dịch vụ, hợp đồng và phụ lục, bảng giá nhiều phiên bản, sản lượng, và bảng thanh toán. Nhóm xuyên suốt — áp dụng cho mọi hồ sơ — gồm: quy trình phê duyệt có thể cấu hình, ký điện tử, thông báo bất đồng bộ, nhật ký truy vết, và phân quyền theo vai trò.

**[Slide 7 — Yêu cầu kỹ thuật]**
Về mặt kỹ thuật, đề bài yêu cầu khá cao: phải theo kiến trúc microservices với tối thiểu 4 service nghiệp vụ cộng một API Gateway; mỗi service có cơ sở dữ liệu riêng; dùng PostgreSQL, Redis và Kafka; triển khai được bằng cả Docker Compose lẫn Kubernetes; và bảo mật bằng JWT. Em xin khẳng định là nhóm em đã đáp ứng đầy đủ tất cả các yêu cầu này, và sẽ minh chứng dần trong bài.

**[Slide 8 — Divider 02: Kiến trúc & Công nghệ]**
*Chuyển tiếp.* Vậy nhóm em đã thiết kế kiến trúc như thế nào để đáp ứng những yêu cầu đó? Mời thầy và các bạn sang phần kiến trúc.

**[Slide 9 — Kiến trúc tổng thể]**
Đây là bức tranh tổng thể của hệ thống. Mọi truy cập từ người dùng đều đi qua **API Gateway** — đây là cửa ngõ duy nhất, chịu trách nhiệm xác thực JWT, giới hạn tần suất gọi, và chống trùng lặp yêu cầu. Từ Gateway, request được điều phối tới các microservice bên trong. Điểm em muốn nhấn mạnh là các service giao tiếp với nhau theo **hai cách**: gọi REST trực tiếp cho những lệnh cần kết quả ngay, và trao đổi **sự kiện qua Kafka** cho những luồng bất đồng bộ. Ngoài ra, việc ký điện tử được tách riêng cho một dịch vụ mock-esign, hoạt động theo cơ chế gọi lại — callback.

**[Slide 10 — 9 service chạy độc lập]**
Đi vào chi tiết, hệ thống gồm 9 service chạy hoàn toàn độc lập. Ngoài Gateway và Identity lo phần xác thực, có 6 service nghiệp vụ: customer quản lý khách hàng, contract quản lý hợp đồng, pricing quản lý bảng giá, billing lo sản lượng và thanh toán, workflow là bộ máy phê duyệt, và notification lo thông báo cùng nhật ký. Cuối cùng là mock-esign giả lập dịch vụ ký. Mỗi service có một trách nhiệm rõ ràng, đúng theo nguyên tắc "mỗi service một nghiệp vụ" của microservices.

**[Slide 11 — Công nghệ sử dụng]**
Về công nghệ: phía backend, nhóm em dùng FastAPI với SQLAlchemy và PostgreSQL, mỗi service một database riêng; Redis cho cache và giới hạn tần suất; Kafka cho luồng bất đồng bộ; xác thực bằng JWT với 7 vai trò. Phía frontend dùng React, Vite và TypeScript. Toàn bộ đóng gói bằng Docker Compose để chạy dev, và có manifest để triển khai lên Kubernetes.

**[Slide 12 — Quyết định thiết kế]**
Trong quá trình làm, nhóm em có mấy quyết định thiết kế then chốt. Thứ nhất, mỗi service một database riêng để cô lập dữ liệu và độc lập triển khai. Thứ hai, dùng Kafka kèm Outbox Pattern để đảm bảo không mất sự kiện. Thứ ba — và em nghĩ đây là điểm hay nhất — quy trình duyệt được cấu hình bằng dữ liệu chứ không hard-code. Bạn Long sẽ nói kỹ hơn về điểm này. Cuối cùng là zero-trust nội bộ: mỗi service vẫn tự kiểm tra JWT dù đã qua Gateway.

**[Slide 13 — Divider 03: Thiết kế dữ liệu]**
*Chuyển tiếp.* Tiếp theo, em nói ngắn gọn về cách nhóm em tổ chức cơ sở dữ liệu.

**[Slide 14 — Database-per-Service]**
Nhóm em áp dụng mô hình **Database-per-Service**. Tức là dù dùng chung một cụm PostgreSQL, mỗi service vẫn có một database riêng, và không dùng khóa ngoại xuyên service, mà liên kết với nhau bằng mã nghiệp vụ. Cách này giúp cô lập lỗi và cho phép mỗi service tiến hóa độc lập. Có một chi tiết quan trọng em muốn nhấn mạnh: khi lập bảng thanh toán, hệ thống **copy cứng đơn giá** tại thời điểm tính — nghĩa là sau này bảng giá có thay đổi thì hồ sơ đã lập vẫn giữ nguyên con số cũ, đảm bảo tính lịch sử.

**[Slide 15 — Sơ đồ ERD]**
Đây là sơ đồ ERD thể hiện các thực thể chính. Ta thấy: khách hàng gắn với hợp đồng và bảng giá; hợp đồng có phụ lục và phát sinh bảng thanh toán; bảng giá có nhiều version, mỗi version gồm nhiều dòng giá; và workflow quản lý quy trình duyệt cùng các bước.

**[Slide 16 — Divider 04: Giao tiếp trong hệ phân tán]**
*Chuyển tiếp.* Phần cuối của em cũng là phần cốt lõi nhất của một hệ phân tán — đó là các service giao tiếp với nhau như thế nào.

**[Slide 17 — Hai kiểu giao tiếp]**
Như đã nói, nhóm em dùng hai kiểu giao tiếp. **Đồng bộ qua REST** dành cho các lệnh cần kết quả ngay lập tức — ví dụ khi người dùng bấm gửi duyệt hồ sơ, hay khi billing cần lấy thông tin hợp đồng và giá. **Bất đồng bộ qua Kafka** dành cho việc lan truyền sự kiện — như gửi thông báo, ghi nhật ký, hay báo kết quả phê duyệt. Cách bất đồng bộ giúp các service rã kết nối, không phụ thuộc trực tiếp vào nhau, nên chịu lỗi tốt hơn nhiều.

**[Slide 18 — Outbox Pattern]**
Tuy nhiên, luồng bất đồng bộ có một rủi ro kinh điển: nếu ghi database thành công nhưng ngay lúc đó phát sự kiện lên Kafka bị lỗi, thì sự kiện sẽ mất, dẫn đến dữ liệu không nhất quán. Nhóm em giải quyết bằng **Outbox Pattern**: khi cập nhật dữ liệu, hệ thống ghi luôn một bản ghi sự kiện vào bảng outbox trong **cùng một transaction**. Sau đó một tiến trình relay đọc bảng outbox, phát lên Kafka rồi mới đánh dấu đã gửi. Nhờ vậy, việc "ghi dữ liệu" và "phát sự kiện" luôn đi cùng nhau, không bao giờ mất sự kiện.

**[Slide 19 — Sự kiện thật trên Kafka]**
Và đây là minh chứng thực tế trên hệ thống đang chạy: các sự kiện thật đang chảy qua Kafka — như StepAssigned, DocApproved — mỗi message đều có mã sự kiện và thời điểm rõ ràng, được phát qua Outbox và xử lý bởi các consumer một cách idempotent. *Đó là phần bài toán, kiến trúc và cơ chế nền tảng. Để trình bày tiếp về quy trình phê duyệt và demo hệ thống, em xin mời bạn Long.*

---

## PHẦN 2 — NGUYỄN THẾ THANH LONG (Slide 20–36, ~5 phút)
*Quy trình phê duyệt, ký điện tử, và demo giao diện.*

**[Slide 20 — Divider 05: Quy trình phê duyệt]**
Cảm ơn Kiệt. Em là Thanh Long. Phần của em sẽ đi vào trái tim của hệ thống — quy trình phê duyệt — và sau đó demo trực tiếp giao diện để thầy và các bạn hình dung rõ hơn.

**[Slide 21 — Workflow data-driven]**
Điểm nhóm em tâm đắc nhất là quy trình duyệt được **cấu hình hoàn toàn bằng dữ liệu**. Thay vì viết cứng "hợp đồng thì duyệt qua các bước A, B, C" bằng if-else trong code, nhóm em lưu định nghĩa quy trình vào database: mỗi loại hồ sơ có bao nhiêu bước, mỗi bước do vai trò nào và người nào phụ trách. Bộ máy workflow chỉ việc đọc dữ liệu đó để quyết định bước kế tiếp. Lợi ích rất lớn: muốn thêm một cấp duyệt hay đổi người phụ trách, ta chỉ sửa dữ liệu, không phải sửa và build lại code — đúng như yêu cầu "không hard-code" của đề bài.

**[Slide 22 — Cấu hình quy trình duyệt]**
Đây là màn hình quản trị, minh chứng cho điều em vừa nói. Hệ thống đang cấu hình sẵn ba quy trình khác nhau: hợp đồng duyệt qua 4 cấp — trưởng phòng kinh doanh, pháp chế, kế toán, rồi giám đốc; còn bảng giá và bảng thanh toán duyệt 2 cấp. Mỗi bước đều gắn với một vai trò và một người phụ trách cụ thể.

**[Slide 23 — Trình tự duyệt hợp đồng]**
Về luồng chạy thực tế: khi nhân viên kinh doanh gửi duyệt một hợp đồng, service contract sẽ gọi sang workflow để tạo một phiên duyệt. Hồ sơ lần lượt đi qua từng cấp. Đến khi cấp cuối cùng — giám đốc — duyệt xong, workflow phát ra sự kiện DocApproved qua Kafka, và service contract nhận được sự kiện đó sẽ tự động chuyển hợp đồng sang trạng thái Approved. Toàn bộ quá trình lan truyền kết quả này diễn ra bất đồng bộ, đúng tinh thần phân tán.

**[Slide 24 — Các quy tắc phê duyệt]**
Trong quy trình duyệt, nhóm em cài đặt nhiều quy tắc chặt chẽ. Quan trọng nhất: chỉ **đúng người được giao** ở bước hiện tại mới được xử lý — nghĩa là hệ thống không chỉ kiểm tra vai trò, mà kiểm tra đúng cá nhân được phân công, tránh trường hợp một quản lý duyệt hồ sơ của quản lý khác. Ngoài ra, không được duyệt nhảy bước hay duyệt lại bước đã xong; và khi từ chối hay yêu cầu chỉnh sửa thì bắt buộc phải nhập lý do.

**[Slide 25 — Divider 06: Ký điện tử]**
*Chuyển tiếp.* Sau khi một hồ sơ được duyệt xong, bước tiếp theo là ký điện tử — cũng là một luồng bất đồng bộ rất tiêu biểu.

**[Slide 26 — Luồng ký điện tử]**
Cụ thể với bảng thanh toán: khi được duyệt xong, workflow **tự động** gửi yêu cầu ký sang dịch vụ ký điện tử. Dịch vụ này không trả kết quả ngay, mà xử lý bất đồng bộ rồi gọi callback trả kết quả về sau. Khi hệ thống nhận được sự kiện Signed, bảng thanh toán mới chuyển sang trạng thái Issued — tức đã phát hành. Đây chính là mô hình tích hợp bên thứ ba trong thực tế, nơi ta không thể chờ đồng bộ mà phải xử lý theo sự kiện.

**[Slide 27 — Quản lý phiên ký]**
Một điểm thiết kế em muốn nhấn mạnh: trạng thái của phiên ký được **tách biệt hoàn toàn** với trạng thái phê duyệt, để tránh nhầm lẫn. Và nếu ký thất bại, hệ thống phản ánh rõ trạng thái đó và cho phép người dùng **gửi ký lại**, đảm bảo dịch vụ ký có lỗi tạm thời cũng không làm hỏng dữ liệu đã được duyệt.

**[Slide 28 — Divider 07: Demo giao diện]**
*Chuyển tiếp.* Bây giờ, để mọi thứ trực quan hơn, em xin demo nhanh giao diện của hệ thống qua các màn hình chính.

**[Slide 29 — Đăng nhập & Tổng quan]**
Người dùng đăng nhập bằng tài khoản gắn với vai trò của mình. Sau khi vào, trang tổng quan hiển thị nhanh các số liệu quan trọng: tổng số hợp đồng, số hồ sơ đang chờ chính mình duyệt, và danh sách thông báo gần đây. Giao diện thay đổi theo vai trò — ví dụ chỉ admin mới thấy menu quản trị.

**[Slide 30 — Khách hàng]**
Đây là màn quản lý khách hàng, tương ứng chức năng 4.1. Nó cho phép tạo mới, cập nhật, tạm ngưng khách hàng, và quản lý cả danh mục dịch vụ. Đây là dữ liệu gốc để lập hợp đồng và bảng giá.

**[Slide 31 — Hợp đồng & tiến trình duyệt]**
Màn chi tiết hợp đồng cho thấy đầy đủ thông tin, và quan trọng nhất là khối **tiến trình duyệt 4 cấp** bên dưới — mỗi bước hiển thị người duyệt, trạng thái và ý kiến. Đây chính là workflow mà em vừa trình bày, giờ được thể hiện trực quan ngay trên giao diện.

**[Slide 32 — Bảng giá]**
Màn bảng giá quản lý nhiều phiên bản. Ta thấy version đang áp dụng ở trạng thái Effective, còn version cũ là Superseded. Vì hệ thống chọn giá theo ngày, nên khi tính cho một kỳ trong quá khứ, nó vẫn lấy đúng giá tại thời điểm đó — giữ nguyên lịch sử.

**[Slide 33 — Sản lượng]**
Phòng khai thác dùng màn này để ghi nhận sản lượng thực tế, và có nút **khóa kỳ**. Đây là một ràng buộc nghiệp vụ quan trọng: chỉ sản lượng đã khóa mới được dùng để lập bảng thanh toán, tránh việc số liệu bị sửa sau khi đã tính tiền.

**[Slide 34 — Bảng thanh toán]**
Và đây là màn hình em muốn nhấn mạnh nhất — chi tiết bảng thanh toán. Kết quả tính của hệ thống khớp **chính xác** với bộ dữ liệu mẫu trong đề bài: tổng cộng hơn 50 triệu đồng, trạng thái Issued, và trạng thái ký điện tử là signed. Điều này chứng minh toàn bộ chuỗi nghiệp vụ — từ sản lượng, bảng giá, đến tính tiền và ký — đã chạy đúng.

**[Slide 35 — Hộp thư phê duyệt]**
Với người có vai trò duyệt, hệ thống cung cấp một hộp thư phê duyệt. Điểm hay là nó **chỉ hiển thị đúng các tác vụ được giao** cho người đang đăng nhập, và cho phép duyệt, từ chối, hoặc yêu cầu chỉnh sửa — kèm ô nhập lý do bắt buộc.

**[Slide 36 — Thông báo & Nhật ký]**
Cuối cùng là hai chức năng xuyên suốt: thông báo tự động khi có hồ sơ cần xử lý hoặc đã được duyệt; và nhật ký truy vết ghi lại đầy đủ ai làm gì, khi nào, trên hồ sơ nào — rất hữu ích khi cần đối chiếu hay xử lý tranh chấp. *Đó là phần quy trình duyệt và demo. Về các cơ chế kỹ thuật sâu hơn, phần triển khai và kiểm thử, em xin mời bạn Lý — trưởng nhóm.*

---

## PHẦN 3 — VŨ HUYỀN THIÊN LÝ (Slide 37–51, ~5 phút, kết thúc)
*Bài toán phân tán, triển khai, kiểm thử, phân công và kết luận.*

**[Slide 37 — Divider 08: Xử lý bài toán phân tán]**
Cảm ơn Long. Em là Thiên Lý. Phần của em sẽ đi sâu vào những bài toán khó nhất của một hệ phân tán mà nhóm đã xử lý, sau đó là triển khai, kiểm thử, và kết luận.

**[Slide 38 — 7 vấn đề phân tán & giải pháp]**
Đây là bảng tổng hợp bảy bài toán phân tán tiêu biểu cùng giải pháp của nhóm — em nghĩ đây là phần "ăn điểm" của đồ án. Em xin nêu vài cái đáng chú ý. Thứ nhất, chống double-submit: nếu người dùng bấm gửi hai lần, nhóm em dùng Idempotency-Key lưu trên Redis để chỉ tạo một quy trình. Thứ hai, race condition khi hai người cùng duyệt một bước: nhóm em dùng optimistic locking — chỉ một người thành công, người còn lại nhận lỗi 409. Thứ ba là Outbox chống mất sự kiện như Kiệt đã nói. Thứ tư, phân quyền theo đúng người được giao. Và thứ năm, giữ dữ liệu lịch sử bằng cách copy đơn giá. Mỗi bài toán đều có giải pháp cụ thể, đã được cài đặt và kiểm chứng trong code.

**[Slide 39 — Chặn sai quy tắc nghiệp vụ]**
Tất cả các quy tắc nghiệp vụ đều được kiểm soát chặt ở tầng service, không chỉ ở giao diện. Ví dụ trong hình: khi người dùng cố gửi duyệt một hợp đồng chưa đính kèm tài liệu, hệ thống chặn lại ngay và trả về mã lỗi rõ ràng. Nhờ enforce ở backend nên dù gọi API trực tiếp cũng không thể lách được quy tắc.

**[Slide 40 — Divider 09: Triển khai]**
*Chuyển tiếp.* Về triển khai, nhóm em đảm bảo hệ thống chạy được trên cả hai môi trường mà đề bài yêu cầu.

**[Slide 41 — Docker Compose]**
Ở môi trường phát triển, nhóm em đóng gói toàn bộ bằng Docker Compose. Chỉ với một lệnh `make up`, cả 14 container khởi động cùng lúc — gồm PostgreSQL, Redis, Kafka và 9 service — tất cả chạy độc lập và tự kết nối với nhau. Điều này giúp cả nhóm và người chấm dựng lại toàn bộ hệ thống chỉ trong vài phút.

**[Slide 42 — Kubernetes]**
Không dừng ở Docker, nhóm em còn viết đầy đủ manifest và **triển khai thành công lên Kubernetes** bằng minikube. Như trong hình, toàn bộ pod đều ở trạng thái Running. Việc chạy được trên Kubernetes chứng minh hệ thống đã sẵn sàng cho môi trường vận hành thực tế, nơi cần khả năng mở rộng và tự phục hồi.

**[Slide 43 — Divider 10: Kiểm thử & Truy vết]**
*Chuyển tiếp.* Để chứng minh hệ thống chạy đúng chứ không chỉ chạy được, nhóm em kiểm thử ở hai mức.

**[Slide 44 — Kiểm thử kịch bản]**
Mức thứ nhất là kiểm thử end-to-end theo đúng mười kịch bản nghiệp vụ mà đề bài đưa ra, từ SC-01 đến SC-10 — bao gồm cả các tình huống khó như race condition, service phụ bị lỗi, hay dữ liệu lịch sử. Kết quả là **14 trên 14 điểm kiểm tra đều đạt**, bao phủ trọn vẹn phụ lục kịch bản.

**[Slide 45 — Unit test]**
Mức thứ hai là unit test cho các business rule và state machine — tức phần logic cốt lõi quyết định một hồ sơ được chuyển trạng thái ra sao. Nhóm em có **31 test, tất cả đều đạt**, trên 4 service quan trọng. Bộ test này đảm bảo logic nghiệp vụ luôn đúng như thiết kế, kể cả khi code thay đổi về sau.

**[Slide 46 — Bao phủ yêu cầu]**
Tổng kết phần kiểm thử: nhóm em đã bao phủ đầy đủ mọi khía cạnh của đề bài — toàn bộ chức năng 4.1 đến 4.10 đều có minh chứng giao diện; các business rule được enforce ở service; mười kịch bản đều pass; và tất cả yêu cầu kỹ thuật ở mục 6, từ microservices, Gateway, đến Kubernetes và JWT, đều được đáp ứng.

**[Slide 47 — Divider 11: Phân công & Kết luận]**
*Chuyển tiếp.* Cuối cùng, em xin nói về phân công công việc và kết luận.

**[Slide 48 — Phân công công việc]**
Về phân công: em — Thiên Lý — phụ trách kiến trúc và phần lớn backend, cùng phần báo cáo và slide, đóng góp khoảng 35%. Bạn Kiệt và bạn Long phụ trách frontend, mỗi bạn 25%. Bạn Hoàng Danh phụ trách một phần backend, khoảng 15%. Cả nhóm đã phối hợp qua Git với quy trình review chéo.

**[Slide 49 — Kết luận]**
Để kết luận: nhóm em đã hiện thực đầy đủ nghiệp vụ quản trị kinh doanh trên một kiến trúc microservices hoàn chỉnh; giải quyết trọn vẹn các bài toán phân tán trọng tâm như Outbox, idempotency, optimistic locking, phân quyền theo ngữ cảnh và ký điện tử bất đồng bộ; triển khai thành công trên cả Docker Compose và Kubernetes; và kiểm chứng bằng bộ test tự động với 14 trên 14 kịch bản cùng 31 unit test đều đạt.

**[Slide 50 — Hướng phát triển]**
Trong tương lai, nếu phát triển tiếp, nhóm em định thay tiến trình Outbox relay bằng CDC với Debezium để hiệu quả hơn; thêm distributed tracing với OpenTelemetry để quan sát luồng xuyên service; bổ sung auto-scaling và lưu trữ bền trên Kubernetes; và tích hợp một dịch vụ ký điện tử thật thay cho bản giả lập.

**[Slide 51 — Cảm ơn]**
Đó là toàn bộ phần trình bày của nhóm em. Toàn bộ mã nguồn nhóm em đã công khai trên GitHub theo đường link trên màn hình, thầy và các bạn có thể tải về chạy thử. Thay mặt nhóm, em xin chân thành cảm ơn thầy và các bạn đã lắng nghe. Nhóm em rất sẵn lòng nhận các câu hỏi của thầy và các bạn ạ.

---

### Phân bổ thời gian
| Người | Slide | Thời lượng |
|---|---|---|
| Kiệt (mở đầu) | 1–19 | ~5 phút |
| Long | 20–36 | ~5 phút |
| Lý (kết thúc) | 37–51 | ~5 phút |

### Mẹo trình bày
- Slide chia phần (divider) chỉ nói 1 câu chuyển ý rồi qua nhanh, không dừng lâu.
- Slide ảnh: chỉ tay vào chi tiết đang nói, tránh đọc lại chữ trên slide.
- Ba câu bàn giao (slide 19 → 20, slide 36 → 37) nên nói rõ ràng, tự nhiên để chuyển người mượt.
- Nếu dư thời gian: nhấn thêm ở slide 18 (Outbox), 21 (workflow), 38 (bài toán phân tán) — đây là các điểm ăn điểm.
- Nếu thiếu thời gian: rút gọn phần demo (slide 30, 32, 33) — nói lướt, giữ kỹ slide 31 và 34.

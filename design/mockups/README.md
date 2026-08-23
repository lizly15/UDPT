# Mockups

Thay vì mockup tĩnh, dự án dùng **khung frontend thật** ở `../../frontend/` làm bản tham chiếu sống
(login/dashboard/customers đã chạy được với dữ liệu thật). Cách lấy hình cho Figma/report:

1. Chạy backend: `make up && python3 scripts/seed.py`.
2. Chạy UI: `cd frontend && npm install && npm run dev` → mở `http://localhost:3000`.
3. Chụp màn hình từng trang → lưu vào `report/screenshots/`.
4. Dựng lại trên Figma theo `../design-system.md` (token màu, component, badge trạng thái).

Khi 2 bạn FE hoàn thiện các màn còn lại (theo `docs/frontend-handover.md`), đây sẽ là bộ màn hình đầy đủ để dựng Figma.

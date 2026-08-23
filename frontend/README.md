# Frontend — Quản trị Kinh doanh (khung mẫu)

Vite + React + TypeScript + TailwindCSS. Đã có sẵn: API client (tự refresh token), Auth, Layout,
trang **Login** + **Dashboard** + **Customers** (màn hình mẫu). Các màn còn lại là `Placeholder`
→ 2 bạn FE hoàn thiện (xem `../docs/frontend-handover.md`).

## Chạy
```bash
cd frontend
cp .env.example .env      # VITE_API_BASE=http://localhost:8080/api
npm install
npm run dev               # mở http://localhost:3000
```
> Backend phải đang chạy (`make up` ở thư mục gốc) và đã `python3 scripts/seed.py`.

## Cấu trúc
```
src/
├── api/client.ts        # gọi API, tự gắn JWT + refresh 401 (DÙNG CHUNG, đừng sửa tùy tiện)
├── context/AuthContext  # login/logout/roles
├── components/          # Layout, StatusBadge, ... (component chung)
├── pages/               # từng màn hình
├── types.ts             # kiểu dữ liệu chung (thống nhất giữa 2 người)
└── App.tsx              # định tuyến
```

## Quy ước
- Gọi API chỉ qua `api` trong `src/api/client.ts`.
- Trạng thái dùng `<StatusBadge/>`.
- Ẩn nút theo quyền: `const { hasRole } = useAuth()`.
- Tạo/submit: truyền `crypto.randomUUID()` làm Idempotency-Key (xem `Customers.tsx`).

## Đăng nhập demo
`sale01`, `manager01`, `legal01`, `account01`, `director01`, `ops01` — mật khẩu `pass123`; `admin` / `admin123`.

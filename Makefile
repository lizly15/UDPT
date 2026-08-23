.PHONY: help up down build logs ps seed test smoke clean report

help:
	@echo "Các lệnh:"
	@echo "  make up      - Build & chạy toàn hệ thống (docker compose)"
	@echo "  make down    - Dừng & xóa container"
	@echo "  make build   - Build lại image"
	@echo "  make logs    - Xem log (SVC=tên service để lọc)"
	@echo "  make ps      - Trạng thái container"
	@echo "  make seed    - Nạp dữ liệu mẫu (Data sample.pdf)"
	@echo "  make smoke   - Chạy smoke-test SC-01..SC-10"
	@echo "  make clean   - Down + xóa volume dữ liệu"

up:
	@test -f .env || cp .env.example .env
	docker compose up -d --build

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f $(SVC)

ps:
	docker compose ps

seed:
	python3 scripts/seed.py

smoke:
	bash scripts/smoke-test.sh

clean:
	docker compose down -v

report:
	docker run --rm -v "$(PWD)/report":/data pandoc/core report.md -o report.html \
	  --standalone --embed-resources --css style.css --metadata title="Báo cáo Đồ án UDPT"
	@echo "Đã tạo report/report.html. Mở bằng trình duyệt rồi In -> Lưu PDF để có report.pdf."

package:
	@zip -r "DATH_UDPT_$(shell date +%Y%m%d).zip" . \
	  -x '*/node_modules/*' -x '*/__pycache__/*' -x '*.pyc' -x './frontend/dist/*' \
	  -x '*/.git/*' -x './*.zip' >/dev/null && echo "Đã đóng gói."

# Dockerfile generic dùng cho mọi FastAPI service.
# Build context = ./services ; truyền ARG SERVICE=<tên thư mục service>.
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

ARG SERVICE
# Cài dependencies TRƯỚC (tận dụng layer cache; đổi mã nguồn không phải cài lại pip)
COPY common/requirements.txt /app/common/requirements.txt
COPY ${SERVICE}/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Thư viện dùng chung + mã nguồn service
COPY common /app/common
COPY ${SERVICE} /app/service
ENV PYTHONPATH=/app:/app/service

WORKDIR /app/service
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

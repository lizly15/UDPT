# Triển khai trên Kubernetes (minikube)

## Yêu cầu
- `minikube` + `kubectl`.
- Đã build image bằng docker-compose (`make build` hoặc `docker compose build`).

## Cài minikube (macOS)
```bash
brew install minikube kubectl
minikube start --cpus=4 --memory=6144
```

## 1. Nạp image vào minikube
Image được build với tên `qtkd-<service>` (từ docker-compose). Nạp vào minikube:
```bash
for s in identity-service customer-service contract-service pricing-service \
         billing-service workflow-service notification-service mock-esign api-gateway; do
  minikube image load qtkd-$s:latest
done
```
> Hoặc build trực tiếp trong docker của minikube: `eval $(minikube docker-env) && docker compose build`.

## 2. Áp dụng manifest
```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-config.yaml
kubectl apply -f k8s/10-infra.yaml
kubectl -n qtkd rollout status deploy/postgres
kubectl apply -f k8s/20-app.yaml
kubectl -n qtkd get pods
```

## 3. Truy cập
```bash
minikube service api-gateway -n qtkd --url    # in ra URL gateway (NodePort 30080)
```
Đặt `VITE_API_BASE` của frontend trỏ vào URL đó + `/api`.

## 4. Seed dữ liệu
Sửa `BASE` trong `scripts/seed.py` thành URL gateway ở bước 3 rồi chạy `python3 scripts/seed.py`.

## Ghi chú
- Mỗi service là 1 Deployment + Service (ClusterIP); gateway dùng NodePort 30080.
- PostgreSQL dùng `emptyDir` (demo). Production nên thay bằng PVC/StatefulSet.
- Cùng cluster nên các service gọi nhau qua DNS nội bộ (vd `http://workflow-service:8006`).

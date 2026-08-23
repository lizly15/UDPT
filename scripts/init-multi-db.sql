-- Tạo database riêng cho từng service (chạy 1 lần khi khởi tạo volume Postgres).
-- Được postgres image thực thi qua psql nên không cần quyền execute (tránh lỗi bind-mount trên macOS).
CREATE DATABASE authdb;
CREATE DATABASE customerdb;
CREATE DATABASE contractdb;
CREATE DATABASE pricingdb;
CREATE DATABASE billingdb;
CREATE DATABASE workflowdb;
CREATE DATABASE notifdb;

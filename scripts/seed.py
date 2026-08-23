#!/usr/bin/env python3
"""Nạp bộ dữ liệu mẫu (Phụ lục A) qua API Gateway và chạy trọn luồng nghiệp vụ.

Chạy sau khi hệ thống đã UP:  python3 scripts/seed.py
Idempotent: bỏ qua các bản ghi đã tồn tại (409).
"""
import json
import time
import urllib.error
import urllib.request

BASE = "http://localhost:8080/api"


def api(method, path, token=None, body=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw


def login(u, p):
    _, d = api("POST", "/auth/login", body={"username": u, "password": p})
    return d["access_token"]


def drain_approvals(approvers, rounds=6):
    """Duyệt hết các bước đang chờ (mỗi approver duyệt task trong inbox của mình)."""
    for _ in range(rounds):
        acted = False
        for tok in approvers.values():
            _, inbox = api("GET", "/tasks/inbox", tok)
            if inbox:
                api("POST", f"/tasks/{inbox[0]['id']}/approve", tok, {"comment": "Đồng ý"})
                acted = True
        if not acted:
            break
        time.sleep(0.3)


def wait_for(path, token, field, targets, timeout=20):
    """Poll tới khi entity đạt trạng thái mong muốn (do consumer cập nhật bất đồng bộ)."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        _, d = api("GET", path, token)
        if d and d.get(field) in targets:
            return d
        time.sleep(0.5)
    return d


def main():
    print("== Đăng nhập ==")
    T = {u: login(u, "admin123" if u == "admin" else "pass123")
         for u in ["admin", "sale01", "manager01", "legal01", "account01", "director01", "ops01"]}
    approvers = {k: T[k] for k in ["manager01", "legal01", "account01", "director01"]}

    print("== A.1 Khách hàng ==")
    customers = [
        ("KH0001", "Samsung Electronics HCMC", "0312345678", "Logistics"),
        ("KH0002", "Vinamilk", "0300588569", "FMCG"),
        ("KH0003", "Thaco Logistics", "4000123456", "Logistics"),
        ("KH0004", "Nestlé Việt Nam", "0302012345", "FMCG"),
        ("KH0005", "Intel Products Vietnam", "0309876543", "Manufacturing"),
    ]
    for code, name, mst, typ in customers:
        s, _ = api("POST", "/customers", T["sale01"],
                   {"code": code, "name": name, "tax_code": mst, "customer_type": typ})
        print(f"  {code} {name}: {s}")

    print("== A.2 Dịch vụ ==")
    services = [
        ("DV001", "Bốc xếp Container 20ft", "Container"),
        ("DV002", "Bốc xếp Container 40ft", "Container"),
        ("DV003", "Lưu kho", "Ngày"),
        ("DV004", "Vận chuyển nội địa", "Chuyến"),
        ("DV005", "Kiểm đếm hàng hóa", "Lô hàng"),
        ("DV006", "Nâng hạ Container", "Lần"),
    ]
    for code, name, unit in services:
        api("POST", "/services", T["sale01"], {"code": code, "name": name, "unit": unit})
    print(f"  {len(services)} dịch vụ")

    print("== A.3 Hợp đồng (tạo -> submit -> duyệt -> active) ==")
    contracts = [
        ("HD2026001", "KH0001", "HĐ Samsung", "2026-07-01", "2026-12-31", 12_000_000_000),
        ("HD2026002", "KH0002", "HĐ Vinamilk", "2026-08-01", "2027-07-31", 8_000_000_000),
        ("HD2026003", "KH0005", "HĐ Intel", "2026-07-01", "2027-06-30", 25_000_000_000),
    ]
    for code, cust, title, ef, et, val in contracts:
        api("POST", "/contracts", T["sale01"],
            {"code": code, "customer_code": cust, "title": title, "value": val})
        api("PUT", f"/contracts/{code}", T["sale01"],
            {"effective_from": ef, "effective_to": et, "has_attachment": True})
        api("POST", f"/contracts/{code}/submit", T["sale01"])
        drain_approvals(approvers)
        wait_for(f"/contracts/{code}", T["sale01"], "status", {"Approved"})  # chờ consumer
        api("POST", f"/contracts/{code}/activate", T["sale01"])
        c = wait_for(f"/contracts/{code}", T["sale01"], "status", {"Active"})
        print(f"  {code}: {c['status'] if c else '?'}")

    print("== A.5/A.6 Bảng giá KH0001 (v1: Lưu kho 120k; v2: Lưu kho 150k từ 01/10) ==")
    api("POST", "/pricing/lists", T["sale01"],
        {"code": "PL-KH0001", "name": "Bảng giá Samsung", "customer_code": "KH0001"})
    v1 = {"effective_from": "2026-07-01", "effective_to": "2026-09-30", "items": [
        {"service_code": "DV001", "unit_price": 350000},
        {"service_code": "DV002", "unit_price": 550000},
        {"service_code": "DV003", "unit_price": 120000},
        {"service_code": "DV004", "unit_price": 2500000},
        {"service_code": "DV005", "unit_price": 80000},
    ]}
    _, ver1 = api("POST", "/pricing/lists/PL-KH0001/versions", T["sale01"], v1)
    if ver1 and "id" in ver1:
        api("POST", f"/pricing/versions/{ver1['id']}/submit", T["sale01"])
        drain_approvals(approvers)
        d = wait_for(f"/pricing/versions/{ver1['id']}", T["sale01"], "status",
                     {"Effective", "Superseded"})
        print(f"  version 1: {ver1['id'][:8]} -> {d['status'] if d else '?'}")
    v2 = {"effective_from": "2026-10-01", "effective_to": "2027-06-30", "items": [
        {"service_code": "DV001", "unit_price": 350000},
        {"service_code": "DV002", "unit_price": 550000},
        {"service_code": "DV003", "unit_price": 150000},
        {"service_code": "DV004", "unit_price": 2500000},
        {"service_code": "DV005", "unit_price": 80000},
    ]}
    _, ver2 = api("POST", "/pricing/lists/PL-KH0001/versions", T["sale01"], v2)
    if ver2 and "id" in ver2:
        api("POST", f"/pricing/versions/{ver2['id']}/submit", T["sale01"])
        drain_approvals(approvers)
        d = wait_for(f"/pricing/versions/{ver2['id']}", T["sale01"], "status", {"Effective"})
        print(f"  version 2: {ver2['id'][:8]} -> {d['status'] if d else '?'}")

    print("== A.7 Sản lượng tháng 08/2026 (KH0001) + khóa kỳ ==")
    volumes = [
        ("DV001", "2026-08-02", 12), ("DV001", "2026-08-05", 8),
        ("DV002", "2026-08-07", 10),
        ("DV003", "2026-08-09", 95), ("DV003", "2026-08-18", 80),
        ("DV004", "2026-08-20", 6),
        ("DV005", "2026-08-28", 25),
    ]
    for svc, date, qty in volumes:
        api("POST", "/volumes", T["ops01"],
            {"customer_code": "KH0001", "service_code": svc, "record_date": date, "quantity": qty})
    api("POST", "/volumes/lock", T["ops01"], {"customer_code": "KH0001", "period": "2026-08"})
    print(f"  {len(volumes)} bản ghi sản lượng, đã khóa kỳ 2026-08")

    print("== A.8 Bảng thanh toán 08/2026 (generate -> submit -> duyệt -> ký -> phát hành) ==")
    s, stmt = api("POST", "/payments/generate", T["account01"],
                  {"customer_code": "KH0001", "contract_code": "HD2026001", "period": "2026-08"})
    if stmt and "id" in stmt:
        api("POST", f"/payments/{stmt['id']}/submit", T["account01"])
        drain_approvals(approvers)
        final = wait_for(f"/payments/{stmt['id']}", T["account01"], "status",
                         {"Issued"}, timeout=25)  # duyệt -> ký -> phát hành (bất đồng bộ)
        print(f"  {stmt['code']}: total={float(final['total']):,.0f} -> {final['status']}")
        for ln in final["lines"]:
            print(f"    {ln['service_code']}: {float(ln['quantity']):.0f} x "
                  f"{float(ln['unit_price']):,.0f} = {float(ln['amount']):,.0f}")
    else:
        print(f"  generate: {s} {stmt}")

    print("\n✅ Seed hoàn tất.")


if __name__ == "__main__":
    main()

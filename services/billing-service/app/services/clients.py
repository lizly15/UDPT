"""Gọi các service khác (đồng bộ) khi lập/submit bảng thanh toán."""
import datetime as dt

import httpx

from common.errors import DomainError

from ..config import bl_settings


def get_contract(code: str, authorization: str) -> dict | None:
    try:
        r = httpx.get(f"{bl_settings.contract_url}/contracts/{code}",
                      headers={"Authorization": authorization}, timeout=10.0)
    except httpx.RequestError as exc:
        raise DomainError("CONTRACT_UNAVAILABLE", f"Không gọi được contract: {exc}", 502)
    if r.status_code == 404:
        return None
    if r.status_code >= 400:
        raise DomainError("CONTRACT_ERROR", r.text, 502)
    return r.json()


def get_effective_price(customer_code: str, service_code: str, on_date: dt.date,
                        authorization: str) -> float | None:
    try:
        r = httpx.get(
            f"{bl_settings.pricing_url}/pricing/effective",
            params={"customer_code": customer_code, "service_code": service_code,
                    "date": on_date.isoformat()},
            headers={"Authorization": authorization}, timeout=10.0,
        )
    except httpx.RequestError as exc:
        raise DomainError("PRICING_UNAVAILABLE", f"Không gọi được pricing: {exc}", 502)
    if r.status_code == 404:
        return None
    if r.status_code >= 400:
        raise DomainError("PRICING_ERROR", r.text, 502)
    return float(r.json()["unit_price"])


def create_workflow_instance(*, doc_id: str, doc_title: str, requested_by: str,
                             authorization: str) -> str:
    try:
        r = httpx.post(
            f"{bl_settings.workflow_url}/workflows/instances",
            json={"doc_type": "PAYMENT", "doc_id": doc_id,
                  "doc_title": doc_title, "requested_by": requested_by},
            headers={"Authorization": authorization}, timeout=10.0,
        )
    except httpx.RequestError as exc:
        raise DomainError("WORKFLOW_UNAVAILABLE", f"Không gọi được workflow: {exc}", 502)
    if r.status_code >= 400:
        raise DomainError("WORKFLOW_ERROR", r.text, 502)
    return r.json()["id"]

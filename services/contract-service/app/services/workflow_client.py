"""Gọi workflow-service (đồng bộ) để tạo workflow instance khi Submit hồ sơ."""
import httpx

from common.errors import DomainError

from ..config import ct_settings


def create_workflow_instance(*, doc_id: str, doc_title: str, requested_by: str,
                             authorization: str) -> str:
    try:
        resp = httpx.post(
            f"{ct_settings.workflow_url}/workflows/instances",
            json={"doc_type": "CONTRACT", "doc_id": doc_id,
                  "doc_title": doc_title, "requested_by": requested_by},
            headers={"Authorization": authorization},
            timeout=10.0,
        )
    except httpx.RequestError as exc:
        raise DomainError("WORKFLOW_UNAVAILABLE", f"Không gọi được workflow: {exc}", 502)
    if resp.status_code >= 400:
        raise DomainError("WORKFLOW_ERROR", f"Workflow trả lỗi: {resp.text}", 502)
    return resp.json()["id"]

"""Seed định nghĩa quy trình phê duyệt (data-driven) theo luồng ở Phụ lục A.9.

Nhân viên Kinh doanh (submit) -> Trưởng phòng KD -> Pháp chế -> Kế toán -> Giám đốc.
Mỗi loại hồ sơ có quy trình riêng, hoàn toàn cấu hình bằng dữ liệu.
"""
from sqlalchemy.orm import Session

from .models import WorkflowDefinition, WorkflowStepDef

# doc_type -> (tên, [(order, step_name, role, assignee_username)])
DEFINITIONS = {
    "CONTRACT": (
        "Quy trình duyệt hợp đồng",
        [
            (1, "Trưởng phòng Kinh doanh duyệt", "SALES_MANAGER", "manager01"),
            (2, "Pháp chế rà soát", "LEGAL", "legal01"),
            (3, "Kế toán kiểm tra", "ACCOUNTANT", "account01"),
            (4, "Giám đốc phê duyệt", "DIRECTOR", "director01"),
        ],
    ),
    "PRICELIST": (
        "Quy trình duyệt bảng giá",
        [
            (1, "Trưởng phòng Kinh doanh duyệt", "SALES_MANAGER", "manager01"),
            (2, "Giám đốc phê duyệt", "DIRECTOR", "director01"),
        ],
    ),
    "PAYMENT": (
        "Quy trình duyệt bảng thanh toán",
        [
            (1, "Kế toán đối soát", "ACCOUNTANT", "account01"),
            (2, "Giám đốc phê duyệt", "DIRECTOR", "director01"),
        ],
    ),
}


def seed_definitions(db: Session) -> None:
    for doc_type, (name, steps) in DEFINITIONS.items():
        if db.get(WorkflowDefinition, doc_type):
            continue
        db.add(WorkflowDefinition(doc_type=doc_type, name=name))
        db.flush()
        for order, step_name, role, username in steps:
            db.add(WorkflowStepDef(
                doc_type=doc_type, step_order=order, step_name=step_name,
                assignee_role=role, assignee_username=username,
            ))
    db.commit()

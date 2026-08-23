"""Seed role mặc định + tài khoản demo khớp với luồng phê duyệt trong đề bài."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.security import hash_password

from .models import Role, User

ROLES = {
    "SALES": "Nhân viên Kinh doanh",
    "SALES_MANAGER": "Trưởng phòng Kinh doanh",
    "OPERATIONS": "Nhân viên Khai thác",
    "ACCOUNTANT": "Kế toán",
    "LEGAL": "Pháp chế",
    "DIRECTOR": "Ban Giám đốc",
    "ADMIN": "Quản trị hệ thống",
}

# username, full_name, department, password, roles
USERS = [
    ("admin", "Quản trị viên", "IT", "admin123", ["ADMIN"]),
    ("sale01", "Nguyễn Văn Kinh Doanh", "Kinh doanh", "pass123", ["SALES"]),
    ("manager01", "Trần Thị Trưởng Phòng", "Kinh doanh", "pass123", ["SALES_MANAGER"]),
    ("legal01", "Lê Văn Pháp Chế", "Pháp chế", "pass123", ["LEGAL"]),
    ("account01", "Phạm Thị Kế Toán", "Kế toán", "pass123", ["ACCOUNTANT"]),
    ("director01", "Hoàng Văn Giám Đốc", "Ban Giám đốc", "pass123", ["DIRECTOR"]),
    ("ops01", "Đỗ Văn Khai Thác", "Khai thác", "pass123", ["OPERATIONS"]),
]


def seed_defaults(db: Session) -> None:
    for code, name in ROLES.items():
        if not db.get(Role, code):
            db.add(Role(code=code, name=name))
    db.flush()

    for username, full_name, dept, pwd, role_codes in USERS:
        exists = db.execute(select(User).where(User.username == username)).scalar_one_or_none()
        if exists:
            continue
        roles = [db.get(Role, rc) for rc in role_codes]
        db.add(
            User(
                username=username,
                full_name=full_name,
                department=dept,
                password_hash=hash_password(pwd),
                roles=[r for r in roles if r],
            )
        )
    db.commit()

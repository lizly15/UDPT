from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.deps import require_roles
from common.errors import ConflictError, NotFoundError
from common.security import hash_password

from ..database import get_db
from ..models import Role, User
from ..schemas import CreateUserRequest, UserOut

router = APIRouter(prefix="/users", tags=["users"])


def _to_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        username=u.username,
        full_name=u.full_name,
        department=u.department,
        is_active=u.is_active,
        roles=u.role_codes,
    )


@router.get("", response_model=list[UserOut], dependencies=[Depends(require_roles("ADMIN"))])
def list_users(db: Session = Depends(get_db)):
    users = db.execute(select(User)).scalars().all()
    return [_to_out(u) for u in users]


@router.post("", response_model=UserOut, dependencies=[Depends(require_roles("ADMIN"))])
def create_user(body: CreateUserRequest, db: Session = Depends(get_db)):
    if db.execute(select(User).where(User.username == body.username)).scalar_one_or_none():
        raise ConflictError("USERNAME_TAKEN", "Tên đăng nhập đã tồn tại")
    roles = []
    for rc in body.roles:
        role = db.get(Role, rc)
        if not role:
            raise NotFoundError("ROLE_NOT_FOUND", f"Role không tồn tại: {rc}")
        roles.append(role)
    user = User(
        username=body.username,
        full_name=body.full_name,
        department=body.department,
        password_hash=hash_password(body.password),
        roles=roles,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_out(user)


@router.get("/roles", dependencies=[Depends(require_roles("ADMIN"))])
def list_roles(db: Session = Depends(get_db)):
    return [{"code": r.code, "name": r.name} for r in db.execute(select(Role)).scalars().all()]

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from common.deps import CurrentUser, get_current_user

from ..database import get_db
from ..schemas import LoginRequest, RefreshRequest, TokenResponse, UserOut
from ..services import auth

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = auth.authenticate(db, body.username, body.password)
    return auth.issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    return auth.refresh_tokens(db, body.refresh_token)


@router.post("/logout")
def logout(authorization: str | None = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        auth.logout(authorization.split(" ", 1)[1])
    return {"status": "logged_out"}


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    from ..models import User

    u = db.get(User, user.user_id)
    return UserOut(
        id=u.id,
        username=u.username,
        full_name=u.full_name,
        department=u.department,
        is_active=u.is_active,
        roles=u.role_codes,
    )

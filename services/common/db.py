"""Khởi tạo SQLAlchemy engine/session dùng chung (sync, SQLAlchemy 2.0 style)."""
from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


def make_engine(database_url: str):
    return create_engine(database_url, pool_pre_ping=True, future=True)


def make_session_factory(engine) -> sessionmaker:
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def session_dependency(session_factory: sessionmaker):
    """Trả về một FastAPI dependency sinh Session, tự đóng sau request."""

    def _get_session() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    return _get_session

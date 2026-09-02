import os
import sys

_HERE = os.path.dirname(__file__)
_ROOT = os.path.abspath(os.path.join(_HERE, ".."))
_SERVICES = os.path.abspath(os.path.join(_ROOT, ".."))
for _p in (_ROOT, _SERVICES):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from common.db import Base
import app.models  # noqa: F401


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()

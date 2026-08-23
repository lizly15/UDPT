from common.config import get_base_settings
from common.db import make_engine, make_session_factory, session_dependency

settings = get_base_settings()
engine = make_engine(settings.database_url)
SessionLocal = make_session_factory(engine)
get_db = session_dependency(SessionLocal)

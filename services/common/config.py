"""Cấu hình cơ sở dùng chung, đọc từ biến môi trường (12-factor)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class BaseServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Định danh service
    service_name: str = "service"
    log_level: str = "INFO"

    # Database (mỗi service trỏ tới 1 database riêng trong cùng cụm Postgres)
    database_url: str = "postgresql+psycopg2://qtkd:qtkd@postgres:5432/postgres"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Kafka
    kafka_bootstrap_servers: str = "kafka:9092"

    # JWT (dùng chung secret để mọi service verify được token của identity-service)
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_ttl_min: int = 60
    refresh_token_ttl_days: int = 7


@lru_cache
def get_base_settings() -> BaseServiceSettings:
    return BaseServiceSettings()

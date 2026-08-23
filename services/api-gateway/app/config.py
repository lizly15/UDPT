from common.config import BaseServiceSettings


class GatewaySettings(BaseServiceSettings):
    identity_url: str = "http://identity-service:8001"
    customer_url: str = "http://customer-service:8002"
    contract_url: str = "http://contract-service:8003"
    pricing_url: str = "http://pricing-service:8004"
    billing_url: str = "http://billing-service:8005"
    workflow_url: str = "http://workflow-service:8006"
    notification_url: str = "http://notification-service:8007"
    rate_limit_per_min: int = 120


settings = GatewaySettings()

# Ánh xạ segment đầu của path -> service đích
ROUTE_MAP: dict[str, str] = {
    "auth": settings.identity_url,
    "users": settings.identity_url,
    "customers": settings.customer_url,
    "services": settings.customer_url,
    "contracts": settings.contract_url,
    "appendices": settings.contract_url,
    "pricing": settings.pricing_url,
    "volumes": settings.billing_url,
    "payments": settings.billing_url,
    "workflows": settings.workflow_url,
    "tasks": settings.workflow_url,
    "notifications": settings.notification_url,
    "audit": settings.notification_url,
}

# Endpoint không cần JWT
PUBLIC_PATHS = {"auth/login", "auth/refresh"}

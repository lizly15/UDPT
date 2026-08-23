from common.config import BaseServiceSettings


class BillingSettings(BaseServiceSettings):
    workflow_url: str = "http://workflow-service:8006"
    contract_url: str = "http://contract-service:8003"
    pricing_url: str = "http://pricing-service:8004"
    tax_rate: float = 0.0  # VAT; để 0 cho khớp bộ dữ liệu mẫu (A.8)


bl_settings = BillingSettings()

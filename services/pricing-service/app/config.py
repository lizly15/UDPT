from common.config import BaseServiceSettings


class PricingSettings(BaseServiceSettings):
    workflow_url: str = "http://workflow-service:8006"


pr_settings = PricingSettings()

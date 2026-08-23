from common.config import BaseServiceSettings


class ContractSettings(BaseServiceSettings):
    workflow_url: str = "http://workflow-service:8006"


ct_settings = ContractSettings()

from common.config import BaseServiceSettings


class WorkflowSettings(BaseServiceSettings):
    mock_esign_url: str = "http://mock-esign:8009"
    self_url: str = "http://workflow-service:8006"


wf_settings = WorkflowSettings()

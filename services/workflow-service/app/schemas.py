from pydantic import BaseModel


class CreateInstanceRequest(BaseModel):
    doc_type: str          # CONTRACT / PRICELIST / PAYMENT
    doc_id: str
    doc_title: str = ""
    requested_by: str = ""


class ActionRequest(BaseModel):
    comment: str = ""


class TaskOut(BaseModel):
    id: str
    instance_id: str
    step_order: int
    step_name: str
    assignee_role: str
    assignee_username: str
    status: str
    acted_by: str
    comment: str

    class Config:
        from_attributes = True


class InstanceOut(BaseModel):
    id: str
    doc_type: str
    doc_id: str
    doc_title: str
    requested_by: str
    status: str
    current_step_order: int
    tasks: list[TaskOut]

    class Config:
        from_attributes = True

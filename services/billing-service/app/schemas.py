import datetime as dt

from pydantic import BaseModel


class VolumeCreate(BaseModel):
    customer_code: str
    service_code: str
    record_date: dt.date
    quantity: float


class VolumeOut(BaseModel):
    id: str
    customer_code: str
    service_code: str
    record_date: dt.date
    period: str
    quantity: float
    locked: bool

    class Config:
        from_attributes = True


class LockRequest(BaseModel):
    customer_code: str
    period: str


class GenerateRequest(BaseModel):
    customer_code: str
    contract_code: str
    period: str  # YYYY-MM


class LineOut(BaseModel):
    service_code: str
    quantity: float
    unit_price: float
    amount: float

    class Config:
        from_attributes = True


class StatementOut(BaseModel):
    id: str
    code: str
    customer_code: str
    contract_code: str
    period: str
    status: str
    subtotal: float
    tax: float
    total: float
    workflow_instance_id: str
    lines: list[LineOut] = []

    class Config:
        from_attributes = True

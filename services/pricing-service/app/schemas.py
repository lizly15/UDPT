import datetime as dt

from pydantic import BaseModel, Field


class PriceListCreate(BaseModel):
    code: str = Field(min_length=2, max_length=30)
    name: str
    customer_code: str


class PriceItemIn(BaseModel):
    service_code: str
    unit_price: float


class VersionCreate(BaseModel):
    effective_from: dt.date
    effective_to: dt.date
    items: list[PriceItemIn]


class PriceItemOut(BaseModel):
    service_code: str
    unit_price: float

    class Config:
        from_attributes = True


class VersionOut(BaseModel):
    id: str
    price_list_code: str
    version_no: int
    effective_from: dt.date
    effective_to: dt.date
    status: str
    workflow_instance_id: str
    items: list[PriceItemOut] = []

    class Config:
        from_attributes = True


class PriceListOut(BaseModel):
    code: str
    name: str
    customer_code: str
    versions: list[VersionOut] = []

    class Config:
        from_attributes = True


class EffectivePrice(BaseModel):
    customer_code: str
    service_code: str
    date: dt.date
    unit_price: float
    version_id: str
    version_no: int

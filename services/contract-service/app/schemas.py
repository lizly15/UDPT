import datetime as dt

from pydantic import BaseModel, Field


class ContractCreate(BaseModel):
    code: str = Field(min_length=3, max_length=30)
    customer_code: str
    title: str = ""
    effective_from: dt.date | None = None
    effective_to: dt.date | None = None
    value: float = 0
    payment_terms: str = ""
    service_terms: str = ""
    has_attachment: bool = False


class ContractUpdate(BaseModel):
    title: str | None = None
    effective_from: dt.date | None = None
    effective_to: dt.date | None = None
    value: float | None = None
    payment_terms: str | None = None
    service_terms: str | None = None
    has_attachment: bool | None = None


class AppendixOut(BaseModel):
    id: str
    title: str
    content: str
    effective_date: dt.date | None
    status: str

    class Config:
        from_attributes = True


class ContractOut(BaseModel):
    code: str
    customer_code: str
    title: str
    effective_from: dt.date | None
    effective_to: dt.date | None
    value: float
    payment_terms: str
    service_terms: str
    has_attachment: bool
    status: str
    workflow_instance_id: str
    created_by: str
    appendices: list[AppendixOut] = []

    class Config:
        from_attributes = True


class AppendixCreate(BaseModel):
    title: str
    content: str = ""
    effective_date: dt.date | None = None

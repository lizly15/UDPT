from typing import Literal

from pydantic import BaseModel, Field


class CustomerBase(BaseModel):
    name: str
    tax_code: str = ""
    customer_type: str = ""
    address: str = ""
    representative: str = ""
    contact: str = ""


class CustomerCreate(CustomerBase):
    code: str = Field(min_length=2, max_length=20)


class CustomerUpdate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    code: str
    status: str

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    status: Literal["Active", "Inactive"]


class ServiceCreate(BaseModel):
    code: str = Field(min_length=2, max_length=20)
    name: str
    unit: str = ""


class ServiceOut(BaseModel):
    code: str
    name: str
    unit: str

    class Config:
        from_attributes = True

from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional
import re


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone: Optional[str] = None
    company_name: Optional[str] = None
    terms_accepted: bool = False

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Şifre en az 8 karakter olmalıdır")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Şifre en az 1 büyük harf içermelidir")
        if not re.search(r"\d", v):
            raise ValueError("Şifre en az 1 rakam içermelidir")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    phone: Optional[str] = None
    company_name: Optional[str] = None
    is_admin: bool = False
    is_verified: bool = False
    is_approved: bool = False
    terms_accepted_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str
    new_password: str


class AdminResetPassword(BaseModel):
    send_email: bool = False


class AdminResetPasswordOut(BaseModel):
    temporary_password: str
    user: UserOut


class CustomerCreate(BaseModel):
    name: str


class CustomerOut(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class CustomerBalance(CustomerOut):
    balances: dict


class TransactionCreate(BaseModel):
    customer_id: int
    type: str
    product_name: str
    quantity: float
    price: Optional[float] = 0
    date: Optional[datetime] = None


class TransactionOut(BaseModel):
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    type: str
    product_name: str
    quantity: float
    price: float
    date: datetime

    class Config:
        from_attributes = True


class SaleCreate(BaseModel):
    customer_name: str
    product_name: str
    quantity: float
    price: float
    date: Optional[datetime] = None


class SaleOut(BaseModel):
    id: int
    customer_name: str
    product_name: str
    quantity: float
    price: float
    date: datetime

    class Config:
        from_attributes = True


class DashboardRow(BaseModel):
    product_name: str
    total_purchased_quantity: float
    total_purchased_amount: float
    emanet_balance: float
    bought_emanet: float
    physical_stock: float
    sold_quantity: float
    sold_amount: float
    avg_buy_price: float
    avg_sell_price: float
    profit_loss: float


class UserDashboard(BaseModel):
    user: UserOut
    rows: list[DashboardRow]
    total_physical_stock: float
    total_emanet: float
    total_profit_loss: float


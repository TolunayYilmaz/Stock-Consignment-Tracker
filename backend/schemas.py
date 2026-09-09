from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_admin: bool = False
    is_verified: bool = False
    is_approved: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


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


import os
import secrets
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import email_service
import models
import schemas
import services
from auth import (
    create_access_token,
    get_current_admin,
    get_current_user,
    hash_password,
    verify_password,
)
from database import Base, engine, ensure_schema, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_schema()
    yield


app = FastAPI(
    title="Stock Consignment Tracker API",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _txn_out(t: models.Transaction) -> schemas.TransactionOut:
    out = schemas.TransactionOut.from_orm(t)
    if t.customer:
        out.customer_name = t.customer.name
    return out


# ---------- AUTH ----------
@app.post("/api/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")
    db_user = models.User(
        email=user.email,
        hashed_password=hash_password(user.password),
        is_admin=False,
        is_verified=False,
        is_approved=False,
        verification_token=secrets.token_urlsafe(32),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    email_service.send_verification_email(
        db_user.email,
        db_user.verification_token,
        str(request.base_url),
    )
    return db_user


@app.post("/api/token", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")
    if not db_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Lütfen e-postanızı doğrulayın. E-posta adresinize gönderdiğimiz doğrulama linkine tıklayın.",
        )
    if not db_user.is_approved:
        raise HTTPException(
            status_code=403,
            detail="Hesabınız yönetici onayı bekliyor. Onaylandıktan sonra giriş yapabilirsiniz.",
        )
    token = create_access_token({"sub": str(db_user.id)})
    return schemas.Token(access_token=token)


@app.get("/api/verify-email", response_model=schemas.UserOut)
def verify_email(token: str, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.verification_token == token).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Geçersiz veya kullanılmış doğrulama linki")
    db_user.is_verified = True
    db_user.verification_token = None
    db.commit()
    db.refresh(db_user)
    return db_user


@app.get("/api/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ---------- ADMIN ----------
@app.get("/api/admin/users", response_model=list[schemas.UserOut])
def admin_list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin),
):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


@app.patch("/api/admin/users/{user_id}/approve", response_model=schemas.UserOut)
def admin_approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    user.is_approved = True
    db.commit()
    db.refresh(user)
    return user


@app.delete("/api/admin/users/{user_id}", response_model=schemas.UserOut)
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Kendi hesabınızı silemezsiniz")
    # Cascade: kullanıcının tüm verilerini temizle (FK NOT NULL nedeniyle)
    db.query(models.Sale).filter(models.Sale.user_id == user.id).delete(synchronize_session=False)
    db.query(models.Transaction).filter(models.Transaction.user_id == user.id).delete(synchronize_session=False)
    db.query(models.Customer).filter(models.Customer.user_id == user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return user


@app.get("/api/admin/users/{user_id}/dashboard", response_model=schemas.UserDashboard)
def admin_user_dashboard(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """Belirli bir kullanıcının stok, ürün tipi ve işlem özetlerini döner. Read-only (SaaS, admin)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    rows = services.get_dashboard(db, user.id)

    total_physical_stock = round(sum(r["physical_stock"] for r in rows), 3)
    total_emanet = round(sum(r["emanet_balance"] for r in rows), 3)
    total_profit_loss = round(sum(r["profit_loss"] for r in rows), 2)

    return schemas.UserDashboard(
        user=user,
        rows=rows,
        total_physical_stock=total_physical_stock,
        total_emanet=total_emanet,
        total_profit_loss=total_profit_loss,
    )


# ---------- CUSTOMERS ----------
@app.get("/api/customers", response_model=list[schemas.CustomerBalance])
def list_customers(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    customers = (
        db.query(models.Customer)
        .filter(models.Customer.user_id == current_user.id)
        .order_by(models.Customer.name)
        .all()
    )
    # Tek sorguda tüm bakiyeler (N+1 yok)
    balances = services.all_emanet_balances(db, current_user.id)
    result = []
    for c in customers:
        c_bal = balances.get(c.id, {})
        result.append(
            schemas.CustomerBalance(
                id=c.id,
                name=c.name,
                created_at=c.created_at,
                balances={p: c_bal.get(p, 0.0) for p in services.PRODUCTS},
            )
        )
    return result


@app.post("/api/customers", response_model=schemas.CustomerOut)
def create_customer(data: schemas.CustomerCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    existing = (
        db.query(models.Customer)
        .filter(models.Customer.user_id == current_user.id, models.Customer.name == data.name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Bu müşteri zaten kayıtlı")
    customer = models.Customer(name=data.name, user_id=current_user.id)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@app.delete("/api/customers/{customer_id}", response_model=schemas.CustomerOut)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    customer = (
        db.query(models.Customer)
        .filter(models.Customer.id == customer_id, models.Customer.user_id == current_user.id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    has_txn = (
        db.query(models.Transaction)
        .filter(models.Transaction.customer_id == customer.id)
        .first()
    )
    if has_txn:
        raise HTTPException(status_code=400, detail="Bu müşterinin emanet/işlem kayıtları var; önce işlemleri silin")
    out = schemas.CustomerOut.from_orm(customer)
    db.delete(customer)
    db.commit()
    return out


# ---------- TRANSACTIONS ----------
@app.get("/api/transactions", response_model=list[schemas.TransactionOut])
def list_transactions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    txns = (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == current_user.id)
        .order_by(models.Transaction.date.desc())
        .all()
    )
    return [_txn_out(t) for t in txns]


@app.post("/api/transactions", response_model=schemas.TransactionOut)
def create_transaction(data: schemas.TransactionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    customer = (
        db.query(models.Customer)
        .filter(
            models.Customer.id == data.customer_id,
            models.Customer.user_id == current_user.id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=400, detail="Müşteri bulunamadı")
    txn = services.create_transaction(db, data, current_user.id)
    out = schemas.TransactionOut.from_orm(txn)
    out.customer_name = customer.name
    return out


@app.delete("/api/transactions/{transaction_id}", response_model=schemas.TransactionOut)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    txn = (
        db.query(models.Transaction)
        .filter(models.Transaction.id == transaction_id, models.Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    out = _txn_out(txn)
    db.delete(txn)
    db.commit()
    return out


# ---------- SALES ----------
@app.get("/api/sales", response_model=list[schemas.SaleOut])
def list_sales(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return (
        db.query(models.Sale)
        .filter(models.Sale.user_id == current_user.id)
        .order_by(models.Sale.date.desc())
        .all()
    )


@app.post("/api/sales", response_model=schemas.SaleOut)
def create_sale(data: schemas.SaleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sale = models.Sale(
        user_id=current_user.id,
        customer_name=data.customer_name,
        product_name=data.product_name,
        quantity=data.quantity,
        price=data.price,
        date=data.date or datetime.utcnow(),
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


@app.delete("/api/sales/{sale_id}", response_model=schemas.SaleOut)
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sale = (
        db.query(models.Sale)
        .filter(models.Sale.id == sale_id, models.Sale.user_id == current_user.id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Satış bulunamadı")
    out = schemas.SaleOut.from_orm(sale)
    db.delete(sale)
    db.commit()
    return out


# ---------- DASHBOARD ----------
@app.get("/api/dashboard", response_model=list[schemas.DashboardRow])
def dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return services.get_dashboard(db, current_user.id)

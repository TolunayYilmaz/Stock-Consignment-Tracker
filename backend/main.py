import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import services
from auth import create_access_token, get_current_user, hash_password, verify_password
from database import Base, engine, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")
    db_user = models.User(email=user.email, hashed_password=hash_password(user.password))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/token", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı")
    token = create_access_token({"sub": str(db_user.id)})
    return schemas.Token(access_token=token)


@app.get("/api/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ---------- CUSTOMERS ----------
@app.get("/api/customers", response_model=list[schemas.CustomerBalance])
def list_customers(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    customers = db.query(models.Customer).order_by(models.Customer.name).all()
    result = []
    for c in customers:
        result.append(
            schemas.CustomerBalance(
                id=c.id,
                name=c.name,
                created_at=c.created_at,
                balances=services.customer_emanet_balances(db, c.id),
            )
        )
    return result


@app.post("/api/customers", response_model=schemas.CustomerOut)
def create_customer(data: schemas.CustomerCreate, db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    existing = db.query(models.Customer).filter(models.Customer.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu müşteri zaten kayıtlı")
    customer = models.Customer(name=data.name)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


# ---------- TRANSACTIONS ----------
@app.get("/api/transactions", response_model=list[schemas.TransactionOut])
def list_transactions(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    txns = db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()
    return [_txn_out(t) for t in txns]


@app.post("/api/transactions", response_model=schemas.TransactionOut)
def create_transaction(data: schemas.TransactionCreate, db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    customer = db.query(models.Customer).filter(models.Customer.id == data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Müşteri bulunamadı")
    txn = services.create_transaction(db, data)
    out = schemas.TransactionOut.from_orm(txn)
    out.customer_name = customer.name
    return out


# ---------- SALES ----------
@app.get("/api/sales", response_model=list[schemas.SaleOut])
def list_sales(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    return db.query(models.Sale).order_by(models.Sale.date.desc()).all()


@app.post("/api/sales", response_model=schemas.SaleOut)
def create_sale(data: schemas.SaleCreate, db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    sale = models.Sale(
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


# ---------- DASHBOARD ----------
@app.get("/api/dashboard", response_model=list[schemas.DashboardRow])
def dashboard(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    return services.get_dashboard(db)

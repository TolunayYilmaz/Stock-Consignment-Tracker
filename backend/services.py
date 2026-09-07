from sqlalchemy import func
from sqlalchemy.orm import Session

import models


PRODUCTS = ["Arpa", "Buğday", "Mısır", "Yağlık Ayçekirdeği", "Çerezlik Çekirdek"]

# Transaction types
TYPE_NORMAL = "Normal Alış"
TYPE_EMANET = "Emanet"
TYPE_EMANETTEN_ALIS = "Emanetten Alış"


def create_transaction(db: Session, data) -> models.Transaction:
    # Emanet ise fiyat her zaman 0 olmalı
    price = 0.0 if data.type == TYPE_EMANET else (data.price or 0.0)
    txn = models.Transaction(
        customer_id=data.customer_id,
        type=data.type,
        product_name=data.product_name,
        quantity=data.quantity,
        price=price,
        date=data.date,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


def customer_emanet_balances(db: Session, customer_id: int) -> dict:
    """Müşterinin her üründeki kalan emaneti: Emanet - Emanetten Alış"""
    result = {}
    for product in PRODUCTS:
        emanet = (
            db.query(func.coalesce(func.sum(models.Transaction.quantity), 0.0))
            .filter(
                models.Transaction.customer_id == customer_id,
                models.Transaction.product_name == product,
                models.Transaction.type == TYPE_EMANET,
            )
            .scalar()
        )
        emanetten_alis = (
            db.query(func.coalesce(func.sum(models.Transaction.quantity), 0.0))
            .filter(
                models.Transaction.customer_id == customer_id,
                models.Transaction.product_name == product,
                models.Transaction.type == TYPE_EMANETTEN_ALIS,
            )
            .scalar()
        )
        result[product] = (emanet or 0.0) - (emanetten_alis or 0.0)
    return result


def get_dashboard(db: Session):
    """Ürün bazlı özet ve kâr/zarar hesaplama."""
    rows = []

    for product in PRODUCTS:
        # Normal Alış + Emanetten Alış (satın alınan)
        bought_quantity = (
            db.query(func.coalesce(func.sum(models.Transaction.quantity), 0.0))
            .filter(
                models.Transaction.product_name == product,
                models.Transaction.type.in_([TYPE_NORMAL, TYPE_EMANETTEN_ALIS]),
            )
            .scalar()
        )
        bought_amount = (
            db.query(func.coalesce(func.sum(models.Transaction.quantity * models.Transaction.price), 0.0))
            .filter(
                models.Transaction.product_name == product,
                models.Transaction.type.in_([TYPE_NORMAL, TYPE_EMANETTEN_ALIS]),
            )
            .scalar()
        )

        # Emanet - Emanetten Alış (satın alınmayan emanet = emanet balansı)
        emanet_qty = (
            db.query(func.coalesce(func.sum(models.Transaction.quantity), 0.0))
            .filter(models.Transaction.product_name == product, models.Transaction.type == TYPE_EMANET)
            .scalar()
        )
        emanetten_alis_qty = (
            db.query(func.coalesce(func.sum(models.Transaction.quantity), 0.0))
            .filter(models.Transaction.product_name == product, models.Transaction.type == TYPE_EMANETTEN_ALIS)
            .scalar()
        )
        emanet_balance = (emanet_qty or 0.0) - (emanetten_alis_qty or 0.0)

        # Güncel fiziksel depo stoğu: (tüm normal alış + tüm emanet) - tüm satışlar
        total_bought_incl_emanet = (
            db.query(func.coalesce(func.sum(models.Transaction.quantity), 0.0))
            .filter(models.Transaction.product_name == product)
            .scalar()
        )
        sold_quantity = (
            db.query(func.coalesce(func.sum(models.Sale.quantity), 0.0))
            .filter(models.Sale.product_name == product)
            .scalar()
        )
        physical_stock = (total_bought_incl_emanet or 0.0) - (sold_quantity or 0.0)

        # Satışlar
        sold_amount = (
            db.query(func.coalesce(func.sum(models.Sale.quantity * models.Sale.price), 0.0))
            .filter(models.Sale.product_name == product)
            .scalar()
        )

        # Ortalama alış fiyatı (SADECE satın alınanlar: normal + emanetten alış)
        avg_buy_price = (bought_amount or 0.0) / bought_quantity if bought_quantity else 0.0
        avg_sell_price = (sold_amount or 0.0) / sold_quantity if sold_quantity else 0.0

        # Kâr/zarar = (ort satış - ort alış) * satılan toplam
        profit_loss = (avg_sell_price - avg_buy_price) * (sold_quantity or 0.0)

        rows.append(
            {
                "product_name": product,
                "total_purchased_quantity": round(bought_quantity or 0.0, 3),
                "total_purchased_amount": round(bought_amount or 0.0, 2),
                "emanet_balance": round(emanet_balance, 3),
                "bought_emanet": round(emanetten_alis_qty or 0.0, 3),
                "physical_stock": round(physical_stock, 3),
                "sold_quantity": round(sold_quantity or 0.0, 3),
                "sold_amount": round(sold_amount or 0.0, 2),
                "avg_buy_price": round(avg_buy_price, 2),
                "avg_sell_price": round(avg_sell_price, 2),
                "profit_loss": round(profit_loss, 2),
            }
        )
    return rows

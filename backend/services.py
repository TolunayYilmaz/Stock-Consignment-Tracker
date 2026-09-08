from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

import models


PRODUCTS = ["Arpa", "Buğday", "Mısır", "Yağlık Ayçekirdeği", "Çerezlik Çekirdek"]

# Transaction types
TYPE_NORMAL = "Normal Alış"
TYPE_EMANET = "Emanet"
TYPE_EMANETTEN_ALIS = "Emanetten Alış"


def create_transaction(db: Session, data, user_id: int) -> models.Transaction:
    # Emanet ise fiyat her zaman 0 olmalı
    price = 0.0 if data.type == TYPE_EMANET else (data.price or 0.0)
    txn = models.Transaction(
        user_id=user_id,
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


def all_emanet_balances(db: Session, user_id: int) -> dict:
    """Tek GROUP BY sorgusuyla tüm müşterilerin ürün bazlı emanet bakiyeleri.

    Dönen yapı: {customer_id: {product_name: kalan_emanet}}
    Emanet - Emanetten Alış.
    """
    rows = db.execute(
        select(
            models.Transaction.customer_id,
            models.Transaction.product_name,
            models.Transaction.type,
            func.sum(models.Transaction.quantity),
        )
        .where(
            models.Transaction.user_id == user_id,
            models.Transaction.type.in_([TYPE_EMANET, TYPE_EMANETTEN_ALIS]),
        )
        .group_by(
            models.Transaction.customer_id,
            models.Transaction.product_name,
            models.Transaction.type,
        )
    ).all()

    balances = defaultdict(lambda: defaultdict(float))
    for customer_id, product, txn_type, qty in rows:
        qty = qty or 0.0
        if txn_type == TYPE_EMANET:
            balances[customer_id][product] += qty
        else:
            balances[customer_id][product] -= qty
    return balances


def get_dashboard(db: Session, user_id: int):
    """Ürün bazlı özet ve kâr/zarar hesaplama (tek tek sorgular yerine toplu gruplama)."""
    # 1) Tüm işlemler tek sorguda ürün + tip bazında gruplanır
    txn_rows = db.execute(
        select(
            models.Transaction.product_name,
            models.Transaction.type,
            func.sum(models.Transaction.quantity),
            func.sum(models.Transaction.quantity * models.Transaction.price),
        )
        .where(models.Transaction.user_id == user_id)
        .group_by(models.Transaction.product_name, models.Transaction.type)
    ).all()

    # (product, type) -> (qty, amount)
    txn_agg = {}
    for product, txn_type, qty, amount in txn_rows:
        txn_agg[(product, txn_type)] = (qty or 0.0, amount or 0.0)

    # 2) Tüm satışlar tek sorguda ürün bazında gruplanır
    sale_rows = db.execute(
        select(
            models.Sale.product_name,
            func.sum(models.Sale.quantity),
            func.sum(models.Sale.quantity * models.Sale.price),
        )
        .where(models.Sale.user_id == user_id)
        .group_by(models.Sale.product_name)
    ).all()

    sale_agg = {product: (qty or 0.0, amount or 0.0) for product, qty, amount in sale_rows}

    get = lambda product, txn_type: txn_agg.get((product, txn_type), (0.0, 0.0))

    rows = []
    for product in PRODUCTS:
        # Normal Alış + Emanetten Alış (satın alınan)
        bought_qty_n, bought_amt_n = get(product, TYPE_NORMAL)
        bought_qty_e, bought_amt_e = get(product, TYPE_EMANETTEN_ALIS)
        bought_quantity = bought_qty_n + bought_qty_e
        bought_amount = bought_amt_n + bought_amt_e

        # Emanet - Emanetten Alış (emanet balansı)
        emanet_qty, _ = get(product, TYPE_EMANET)
        emanetten_alis_qty, _ = get(product, TYPE_EMANETTEN_ALIS)
        emanet_balance = emanet_qty - emanetten_alis_qty

        # Güncel fiziksel depo stoğu: (tüm alışlar + tüm emanet) - tüm satışlar
        total_bought = bought_quantity + emanet_qty
        sold_quantity, sold_amount = sale_agg.get(product, (0.0, 0.0))
        physical_stock = total_bought - sold_quantity

        # Ortalama alış fiyatı (SADECE satın alınanlar: normal + emanetten alış)
        avg_buy_price = bought_amount / bought_quantity if bought_quantity else 0.0
        avg_sell_price = sold_amount / sold_quantity if sold_quantity else 0.0

        # Kâr/zarar = (ort satış - ort alış) * satılan toplam
        profit_loss = (avg_sell_price - avg_buy_price) * sold_quantity

        rows.append(
            {
                "product_name": product,
                "total_purchased_quantity": round(bought_quantity, 3),
                "total_purchased_amount": round(bought_amount, 2),
                "emanet_balance": round(emanet_balance, 3),
                "bought_emanet": round(emanetten_alis_qty, 3),
                "physical_stock": round(physical_stock, 3),
                "sold_quantity": round(sold_quantity, 3),
                "sold_amount": round(sold_amount, 2),
                "avg_buy_price": round(avg_buy_price, 2),
                "avg_sell_price": round(avg_sell_price, 2),
                "profit_loss": round(profit_loss, 2),
            }
        )
    return rows
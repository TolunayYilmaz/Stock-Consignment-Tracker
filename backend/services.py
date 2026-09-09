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
    price = 0.0 if data.type == TYPE_EMANET else (data.price or 0.0)
    txn = models.Transaction(
        user_id=user_id,
        customer_id=data.customer_id,
        type=data.type,
        product_name=data.product_name,
        quantity=data.quantity,
        price=price,
        date=data.date,
        harvest_year=data.harvest_year,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


def all_emanet_balances(db: Session, user_id: int, harvest_year: int = None) -> dict:
    """Tek GROUP BY sorgusuyla tüm müşterilerin ürün bazlı emanet bakiyeleri.

    Dönen yapı: {customer_id: {product_name: kalan_emanet}}
    Emanet - Emanetten Alış.

    harvest_year belirtildiğinde sadece o hasat yılına ait işlemler dahil edilir.
    """
    conditions = [
        models.Transaction.user_id == user_id,
        models.Transaction.type.in_([TYPE_EMANET, TYPE_EMANETTEN_ALIS]),
    ]
    if harvest_year is not None:
        conditions.append(models.Transaction.harvest_year == harvest_year)

    rows = db.execute(
        select(
            models.Transaction.customer_id,
            models.Transaction.product_name,
            models.Transaction.type,
            func.sum(models.Transaction.quantity),
        )
        .where(*conditions)
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


def get_dashboard(db: Session, user_id: int, harvest_year: int = None):
    """Ürün bazlı özet ve kâr/zarar hesaplama.

    Hasat yılı bazlı filtreleme:
    - harvest_year=None (Tümü): Tüm veriler filtre olmadan kullanılır.
    - harvest_year belirtildiğinde: Sadece o yıla ait harvey_year etiketli işlemler toplanır.
    """
    txn_conditions = [models.Transaction.user_id == user_id]
    if harvest_year is not None:
        txn_conditions.append(models.Transaction.harvest_year == harvest_year)

    txn_rows = db.execute(
        select(
            models.Transaction.product_name,
            models.Transaction.type,
            func.sum(models.Transaction.quantity),
            func.sum(models.Transaction.quantity * models.Transaction.price),
        )
        .where(*txn_conditions)
        .group_by(models.Transaction.product_name, models.Transaction.type)
    ).all()

    txn_agg = {}
    for product, txn_type, qty, amount in txn_rows:
        txn_agg[(product, txn_type)] = (qty or 0.0, amount or 0.0)

    sale_conditions = [models.Sale.user_id == user_id]
    if harvest_year is not None:
        sale_conditions.append(models.Sale.harvest_year == harvest_year)

    sale_rows = db.execute(
        select(
            models.Sale.product_name,
            func.sum(models.Sale.quantity),
            func.sum(models.Sale.quantity * models.Sale.price),
        )
        .where(*sale_conditions)
        .group_by(models.Sale.product_name)
    ).all()

    sale_agg = {product: (qty or 0.0, amount or 0.0) for product, qty, amount in sale_rows}

    get = lambda product, txn_type: txn_agg.get((product, txn_type), (0.0, 0.0))

    rows = []
    for product in PRODUCTS:
        bought_qty_n, bought_amt_n = get(product, TYPE_NORMAL)

        emanet_qty, _ = get(product, TYPE_EMANET)
        emanetten_alis_qty, _ = get(product, TYPE_EMANETTEN_ALIS)
        emanet_balance = emanet_qty - emanetten_alis_qty

        physical_stock = (bought_qty_n + emanet_qty) - sale_agg.get(product, (0.0, 0.0))[0]

        bought_quantity = bought_qty_n + emanetten_alis_qty
        bought_amount = bought_amt_n + get(product, TYPE_EMANETTEN_ALIS)[1]
        avg_buy = bought_amount / bought_quantity if bought_quantity else 0.0

        sold_quantity, sold_amount = sale_agg.get(product, (0.0, 0.0))
        avg_sell = sold_amount / sold_quantity if sold_quantity else 0.0

        profit_loss = sold_amount - sold_quantity * avg_buy

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
                "avg_buy_price": round(avg_buy, 2),
                "avg_sell_price": round(avg_sell, 2),
                "profit_loss": round(profit_loss, 2),
            }
        )
    return rows

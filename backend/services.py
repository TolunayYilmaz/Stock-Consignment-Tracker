import math
import time
import requests
from collections import defaultdict
from datetime import datetime, timedelta

from bs4 import BeautifulSoup
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


# =====================================================================
# CANLI BORSA FİYATLARI — Gerçek Web Scraping (Karaman / Konya / Polatlı)
# =====================================================================
# Tüm kazıma işlemleri sıkı try/except ile sarılır; site erişilemezse veya
# HTML değişirse 500 hatası yerine boş/varsayılan değerler döner.

MARKET_PRODUCTS = ["Buğday", "Arpa", "Mısır"]

_BOURSES = {
    "karaman": {"name": "Karaman Ticaret Borsası", "url": "https://www.karamantb.org.tr/"},
    "konya": {
        "name": "Konya Ticaret Borsası",
        "url": "https://www.ktb.org.tr/api/v1/Alpha.WebPanel/OnlineKullaniciBulten/GetAnlikBulten/{date}",
    },
    "polatli": {
        "name": "Polatlı Ticaret Borsası",
        "url": "https://bulten.polatliborsa.org.tr/BultenGunluk.ashx",
    },
}

_HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
}
_HTTP_TIMEOUT = 10


def _safe_float(val, default=None):
    """Türkçe formatlı sayıyı (ör. '16,6020', '70.000') float'a çevirir."""
    if val is None:
        return default
    s = str(val).strip()
    if not s or s in ("----", "-", "—", "0"):
        return default
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        v = float(s)
        return v if math.isfinite(v) else default
    except (TypeError, ValueError):
        return default


def _weighted_avg(items):
    """[(fiyat, ağırlık)] ikililerinden ağırlıklı ortalamayı hesaplar."""
    total_v = 0.0
    total_w = 0.0
    for price, weight in items:
        if price is not None and weight is not None and weight > 0:
            total_v += price * weight
            total_w += weight
    return round(total_v / total_w, 4) if total_w > 0 else None


def _default_market_prices(product_results=None):
    """Buğday/Arpa/Mısır için boş (ulaşılamaz) cevap üretir."""
    product_results = product_results or {}
    prices = []
    for product in MARKET_PRODUCTS:
        row = product_results.get(product, {})
        available = bool(row.get("price_avg") is not None)
        prices.append(
            {
                "product": product,
                "price_min": row.get("price_min"),
                "price_max": row.get("price_max"),
                "price_avg": row.get("price_avg"),
                "change_pct": row.get("change_pct"),
                "unit": "₺/kg",
                "quantity": row.get("quantity"),
                "available": available,
            }
        )
    return prices


# ---------------- KARAMAN ----------------
def _scrape_karaman():
    """Karaman TB ana sayfasındaki canlı fiyat widget'ından (price-component) kazır."""
    resp = requests.get(_BOURSES["karaman"]["url"], headers=_HTTP_HEADERS, timeout=_HTTP_TIMEOUT)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    section = soup.select_one("section.price-component")
    if section is None:
        section = soup

    date_el = soup.select_one(".price-text .date")
    bulletin_date = date_el.get_text(strip=True) if date_el else datetime.utcnow().strftime("%d.%m.%Y")

    widgets = []
    for box in section.select(".swiper-slide"):
        title_el = box.select_one(".title")
        if title_el is None:
            continue
        title = title_el.get_text(strip=True).upper()
        sales_el = box.select_one(".sales-price")
        buying_el = box.select_one(".buying-price")
        pa = _safe_float(sales_el.get_text(strip=True)) if sales_el else None
        pb = _safe_float(buying_el.get_text(strip=True)) if buying_el else None
        prices = [p for p in (pa, pb) if p is not None]
        if not prices:
            widgets.append({"title": title, "min": None, "max": None})
        else:
            widgets.append({"title": title, "min": min(prices), "max": max(prices)})

    found = {}
    for w in widgets:
        t = w["title"]
        product = None
        if "ARPA" in t:
            product = "Arpa"
        elif "MISIR" in t:
            product = "Mısır"
        elif "BUĞDAY" in t:
            # Makarnalık tercih edilir; ilk bulunan buğday satırı kullanılır.
            product = "Buğday"
        if product and product not in found:
            found[product] = w

    results = {}
    for product in MARKET_PRODUCTS:
        w = found.get(product)
        if w and w["min"] is not None:
            results[product] = {
                "price_min": round(w["min"], 4),
                "price_max": round(w["max"], 4),
                "price_avg": round((w["min"] + w["max"]) / 2, 4),
                "change_pct": None,
                "quantity": None,
            }

    return _default_market_prices(results), {
        "date": bulletin_date,
        "source": "karamantb.org.tr",
    }


# ---------------- KONYA ----------------
def _konya_fetch(day):
    resp = requests.get(
        _BOURSES["konya"]["url"].format(date=day.strftime("%Y-%m-%d")),
        headers=_HTTP_HEADERS,
        timeout=_HTTP_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


def _konya_aggregate(rows, kind):
    """KTB API satırlarından ürün bazlı min/max/ortalama/tonajı üretir."""
    if not rows:
        return None, None, None, None
    matched = []
    for r in rows:
        g = (r.get("GrupAdi") or "").strip().lower()
        if kind == "arpa":
            ok = g == "arpa"
        elif kind == "misir":
            ok = g == "mısır"
        else:  # buğday (tüm çeşitler)
            ok = "buğday" in g
        if ok:
            matched.append(r)
    if not matched:
        return None, None, None, None

    mins, maxs, weighted = [], [], []
    miktar_total = 0.0
    for r in matched:
        mn = _safe_float(r.get("MinFiyat"))
        mx = _safe_float(r.get("MaxFiyat"))
        ort = _safe_float(r.get("GrupOrtFiyat"))
        miktar = _safe_float(r.get("Miktar"))
        if mn is not None:
            mins.append(mn)
        if mx is not None:
            maxs.append(mx)
        if ort is not None and miktar is not None and miktar > 0:
            weighted.append((ort, miktar))
            miktar_total += miktar
    return (
        min(mins) if mins else None,
        max(maxs) if maxs else None,
        _weighted_avg(weighted),
        miktar_total,
    )


def _scrape_konya():
    today = datetime.utcnow().date()
    days = [today - timedelta(days=i) for i in range(7) if (today - timedelta(days=i)).weekday() < 5]

    current_rows = None
    used_date = None
    for day in days:
        try:
            data = _konya_fetch(day)
            if data:
                current_rows = data
                used_date = day
                break
        except Exception:
            continue

    prev_rows = None
    if used_date:
        for i in range(1, 10):
            pd = used_date - timedelta(days=i)
            if pd.weekday() < 5:
                try:
                    prev_rows = _konya_fetch(pd)
                    if prev_rows:
                        break
                    prev_rows = None
                except Exception:
                    continue

    results = {}
    for product, kind in (("Buğday", "buğday"), ("Arpa", "arpa"), ("Mısır", "misir")):
        if not current_rows:
            results[product] = {"price_min": None, "price_max": None, "price_avg": None, "change_pct": None, "quantity": None}
            continue
        mn, mx, avg, miktar = _konya_aggregate(current_rows, kind)
        prev_avg = None
        if prev_rows:
            _, _, prev_avg, _ = _konya_aggregate(prev_rows, kind)
        change_pct = None
        if avg is not None and prev_avg and prev_avg > 0:
            change_pct = round(((avg - prev_avg) / prev_avg) * 100, 2)
        results[product] = {
            "price_min": round(mn, 4) if mn is not None else None,
            "price_max": round(mx, 4) if mx is not None else None,
            "price_avg": round(avg, 4) if avg is not None else None,
            "change_pct": change_pct,
            "quantity": f"{miktar:.0f}" if miktar else None,
        }

    return _default_market_prices(results), {
        "date": used_date.strftime("%Y-%m-%d") if used_date else today.strftime("%Y-%m-%d"),
        "source": "ktb.org.tr (Anlık Bülten)",
    }


# ---------------- POLATLI ----------------
def _polatli_fetch(day):
    resp = requests.get(
        _BOURSES["polatli"]["url"],
        params={"tarih": day.strftime("%d.%m.%Y")},
        headers=_HTTP_HEADERS,
        timeout=_HTTP_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("Bulten") or []


def _polatli_aggregate(rows, keyword):
    """Polatlı ashx satırlarından ürün bazlı min/max/ortalama/tonajı üretir."""
    if not rows:
        return None, None, None, None
    mins, maxs, weighted = [], [], []
    miktar_total = 0.0
    for r in rows:
        if (r.get("OrtFiyat") or "0") == "0":
            continue  # kategori satırları fiyatsızdır
        name = (r.get("UrunAdi") or "").upper()
        if keyword not in name:
            continue
        mn = _safe_float(r.get("MinFiyat"))
        mx = _safe_float(r.get("MaxFiyat"))
        ort = _safe_float(r.get("OrtFiyat"))
        miktar = _safe_float(r.get("Miktar"))
        if mn is not None:
            mins.append(mn)
        if mx is not None:
            maxs.append(mx)
        if ort is not None and miktar is not None and miktar > 0:
            weighted.append((ort, miktar))
            miktar_total += miktar
    return (
        min(mins) if mins else None,
        max(maxs) if maxs else None,
        _weighted_avg(weighted),
        miktar_total,
    )


def _scrape_polatli():
    today = datetime.utcnow().date()
    days = [today - timedelta(days=i) for i in range(7) if (today - timedelta(days=i)).weekday() < 5]

    current_rows = None
    used_date = None
    for day in days:
        try:
            data = _polatli_fetch(day)
            if data:
                current_rows = data
                used_date = day
                break
        except Exception:
            continue

    prev_rows = None
    if used_date:
        for i in range(1, 10):
            pd = used_date - timedelta(days=i)
            if pd.weekday() < 5:
                try:
                    prev_rows = _polatli_fetch(pd)
                    if prev_rows:
                        break
                    prev_rows = None
                except Exception:
                    continue

    results = {}
    for product, keyword in (("Buğday", "BUĞDAY"), ("Arpa", "ARPA"), ("Mısır", "MISIR")):
        if not current_rows:
            results[product] = {"price_min": None, "price_max": None, "price_avg": None, "change_pct": None, "quantity": None}
            continue
        mn, mx, avg, miktar = _polatli_aggregate(current_rows, keyword)
        prev_avg = None
        if prev_rows:
            _, _, prev_avg, _ = _polatli_aggregate(prev_rows, keyword)
        change_pct = None
        if avg is not None and prev_avg and prev_avg > 0:
            change_pct = round(((avg - prev_avg) / prev_avg) * 100, 2)
        results[product] = {
            "price_min": round(mn, 4) if mn is not None else None,
            "price_max": round(mx, 4) if mx is not None else None,
            "price_avg": round(avg, 4) if avg is not None else None,
            "change_pct": change_pct,
            "quantity": f"{miktar:.0f}" if miktar else None,
        }

    return _default_market_prices(results), {
        "date": used_date.strftime("%d.%m.%Y") if used_date else today.strftime("%d.%m.%Y"),
        "source": "bulten.polatliborsa.org.tr",
    }


_SCRAPERS = {
    "karaman": _scrape_karaman,
    "konya": _scrape_konya,
    "polatli": _scrape_polatli,
}


# =====================================================================
# STALE-WHILE-REVALIDATE ÖNBELLEK (İç Anadolu Borsa Fiyatları)
# =====================================================================
# Vercel Serverless'ta aynı Python instance'ı kısa süre yaşar; sonsuz
# döngü yerine isteğe bağlı yenileme (BackgroundTasks) kullanılır.
#
# Durumlar:
#   empty -> cache'te yok          -> istek sahibi bekler, senkron kazınır
#   fresh -> < 2 saatlik           -> cache'ten dön (arka plan YOK)
#   stale -> >= 2 saatlik          -> eski veriyi ANINDA dön + arka planda yenile
# Yenileme başarısız olursa eski (stale) kayıt olduğu gibi kalır.

CACHE_TTL_SECONDS = 2 * 60 * 60  # 2 saat (saniye)

# bourse -> {"data": {...}, "updated_at": epoch_float}
price_cache = {}


def _build_prices_payload(bourse, prices, meta) -> dict:
    """Scraper çıktısını (prices, meta) API yanıtına dönüştürür."""
    return {
        "bourse": bourse,
        "bourse_name": _BOURSES.get(bourse, {}).get("name", bourse),
        "date": meta.get("date", ""),
        "updated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": meta.get("source", ""),
        "prices": prices,
    }


def fetch_and_update_cache_task(bourse: str) -> None:
    """Arka plan görevi: güncel scraping yapar, SADECE price_cache[bourse]'ü günceller.

    İstek sahibini asla beklemez; bot tespitini önlemek için gerçek tarayıcı
    User-Agent header'ı (_HTTP_HEADERS) kullanılır. Hata olursa cache'e
    dokunulmaz (eski veri korunur) ve görev sessizce sonlanır.
    """
    bourse = (bourse or "karaman").strip().lower()
    scraper = _SCRAPERS.get(bourse)
    if not scraper:
        return
    try:
        prices, meta = scraper()
        price_cache[bourse] = {
            "data": _build_prices_payload(bourse, prices, meta),
            "updated_at": time.time(),
        }
    except Exception:
        # Yenileme başarısızsa eski kayıt geçerliliğini korur.
        return


def cache_status(bourse: str) -> str:
    """'empty' | 'fresh' | 'stale' döner."""
    bourse = (bourse or "karaman").strip().lower()
    entry = price_cache.get(bourse)
    if not entry:
        return "empty"
    age = time.time() - float(entry.get("updated_at", 0))
    return "fresh" if age < CACHE_TTL_SECONDS else "stale"


def get_cached_data(bourse: str) -> dict:
    """Cache'teki hazır yanıtı döner (yoksa boş varsayılanı üretir)."""
    bourse = (bourse or "karaman").strip().lower()
    entry = price_cache.get(bourse)
    if entry and entry.get("data"):
        return entry["data"]
    meta = {"date": datetime.utcnow().strftime("%Y-%m-%d"), "source": ""}
    return _build_prices_payload(bourse, _default_market_prices(), meta)


def get_market_prices(bourse: str) -> dict:
    """Canlı borsa fiyatlarını döner (cache boş iken senkron / blocking kazıma).

    - bourse: 'karaman' | 'konya' | 'polatli'
    - Sadece ilk kullanıcı (cache boş) bekler; sonrası cache'ten anında döner.
    - Siteye ulaşılamazsa / HTML değişirse 500 hata değil, boş veri döner.
    """
    bourse = (bourse or "karaman").strip().lower()

    try:
        fetch_and_update_cache_task(bourse)
    except Exception:
        pass

    return get_cached_data(bourse)

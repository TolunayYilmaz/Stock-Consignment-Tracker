from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/stok")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_schema():
    """Tabloları ve eksik kolonları idempotent şekilde oluşturur (multi-tenant)."""
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        # Admin yetkisi
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE")
        )
        # Multi-tenant: her satırın sahibi (User)
        conn.execute(
            text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)")
        )
        conn.execute(
            text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)")
        )
        conn.execute(
            text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)")
        )
        # Eski global unique (name) constraint'i kaldır: artık (user_id, name) bazlı
        conn.execute(text("ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_name_key"))
        # Performans: tenant bazlı sorgularda kullanılacak indexler
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_customers_user_id ON customers(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_user_id ON transactions(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sales_user_id ON sales(user_id)"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
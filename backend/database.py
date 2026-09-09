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
        # E-posta doğrulama + yönetici onayı
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE")
        )
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE")
        )
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR")
        )
        # İletişim bilgileri (telefon + opsiyonel şirket adı)
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR")
        )
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR")
        )
        # Şifre sıfırlama token'ı ve son kullanma tarihi
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR")
        )
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expiry TIMESTAMP")
        )
        # KVKK / Kullanıcı Sözleşmesi onay tarihi
        conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP")
        )
        # Sistem hesabı dışarıda kilitli kalmasın (çok-tenant güvenlik baypası)
        conn.execute(
            text(
                "UPDATE users SET is_verified = TRUE, is_approved = TRUE "
                "WHERE email IN ('tolunay894@gmail.com', 'mock@test.com')"
            )
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
        # Hasat yılı bazlı filtreleme: harvest_year sütunu
        conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS harvest_year INTEGER"))
        conn.execute(text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS harvest_year INTEGER"))
        # Mevcut kayıtları tarih yılına göre geriye dönük doldur
        conn.execute(text(
            "UPDATE transactions SET harvest_year = EXTRACT(YEAR FROM date)::integer "
            "WHERE harvest_year IS NULL AND date IS NOT NULL"
        ))
        conn.execute(text(
            "UPDATE sales SET harvest_year = EXTRACT(YEAR FROM date)::integer "
            "WHERE harvest_year IS NULL AND date IS NOT NULL"
        ))
        conn.execute(text(
            "ALTER TABLE transactions ALTER COLUMN harvest_year SET DEFAULT EXTRACT(YEAR FROM now())::integer"
        ))
        conn.execute(text(
            "ALTER TABLE sales ALTER COLUMN harvest_year SET DEFAULT EXTRACT(YEAR FROM now())::integer"
        ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_transactions_harvest_year ON transactions(harvest_year)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sales_harvest_year ON sales(harvest_year)"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
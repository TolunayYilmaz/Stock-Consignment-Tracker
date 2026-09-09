-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — stok-emanet
-- ----------------------------------------------------------------------------
-- ÖNEMLİ NOT:
-- Bu uygulama Supabase Auth kullanmaz; kimlik doğrulama FastAPI'nin kendi
-- HS256 JWT'siyle yapılır (backend/auth.py). Dolayısıyla RLS politikaları
-- Supabase `auth.uid()` (uuid) yerine, uygulamanın integer `user_id`
-- sütunlarıyla uyumlu oturum değişkenlerine (GUC) dayanır:
--
--     app.current_user_id  => giriş yapan kullanıcının users.id değeri (integer)
--     app.user_is_admin    => giriş yapan kullanıcının is_admin bayrağı (boolean)
--
-- Backend, her korunan istekte bu değerleri set eder (backend/auth.py
-- -> get_current_user). Bu script'i çalıştırmadan önce backend'in dağıtılması
-- ve auth.py'nin güncel olması gerekir; aksi halde politikalar veriyi sıfıra
-- düşürür (yalnızca RLS'e tabi roller için).
--
-- KAPSAM:
-- RLS yalnızca `bypassrls` özelliği OLMAYAN rolleri kısıtlar. Uygulamanın
-- DATABASE_URL içindeki bağlantı kullanıcısı süper kullanıcı/servis rolü ise
-- RLS'i zaten baypas eder (mevcut davranış değişmez; uygulama katmanı
-- main.py/services.py'deki user_id filtreleriyle izolasyonu sağlar).
-- RLS, Supabase anon/authenticated rolleri ve postgREST/JWT erişimini
-- gerçekten korumak için devreye alınır.
--
-- ÇALIŞTIRMA: Supabase SQL Editor veya psql üzerinden güvenle çalıştırın.
-- Script idempotenttir: tekrar koşmak hata üretmez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) YARDIMCI FONKSİYONLAR (oturum değişkenlerini güvenle okur)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_current_user_id()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::integer
$$;

CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.user_is_admin', true), '')::boolean, false)
$$;

-- ----------------------------------------------------------------------------
-- 1) CUSTOMERS
-- ----------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_owner_select ON public.customers;
CREATE POLICY customers_owner_select ON public.customers
  FOR SELECT
  USING (user_id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS customers_owner_insert ON public.customers;
CREATE POLICY customers_owner_insert ON public.customers
  FOR INSERT
  WITH CHECK (user_id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS customers_owner_update ON public.customers;
CREATE POLICY customers_owner_update ON public.customers
  FOR UPDATE
  USING (user_id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS customers_owner_delete ON public.customers;
CREATE POLICY customers_owner_delete ON public.customers
  FOR DELETE
  USING (user_id = public.app_current_user_id() OR public.app_is_admin());

-- ----------------------------------------------------------------------------
-- 2) TRANSACTIONS
-- ----------------------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_owner_select ON public.transactions;
CREATE POLICY transactions_owner_select ON public.transactions
  FOR SELECT
  USING (user_id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS transactions_owner_insert ON public.transactions;
CREATE POLICY transactions_owner_insert ON public.transactions
  FOR INSERT
  WITH CHECK (user_id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS transactions_owner_update ON public.transactions;
CREATE POLICY transactions_owner_update ON public.transactions
  FOR UPDATE
  USING (user_id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS transactions_owner_delete ON public.transactions;
CREATE POLICY transactions_owner_delete ON public.transactions
  FOR DELETE
  USING (user_id = public.app_current_user_id() OR public.app_is_admin());

-- ----------------------------------------------------------------------------
-- 3) SALES
-- ----------------------------------------------------------------------------
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_owner_select ON public.sales;
CREATE POLICY sales_owner_select ON public.sales
  FOR SELECT
  USING (user_id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS sales_owner_insert ON public.sales;
CREATE POLICY sales_owner_insert ON public.sales
  FOR INSERT
  WITH CHECK (user_id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS sales_owner_update ON public.sales;
CREATE POLICY sales_owner_update ON public.sales
  FOR UPDATE
  USING (user_id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS sales_owner_delete ON public.sales;
CREATE POLICY sales_owner_delete ON public.sales
  FOR DELETE
  USING (user_id = public.app_current_user_id() OR public.app_is_admin());

-- ----------------------------------------------------------------------------
-- 4) USERS
--   - SELECT  : kullanıcı yalnızca kendisini, admin herkesi görebilir.
--   - INSERT  : kayıt (register) herkese açık endpoint'tir.
--   - UPDATE  : kullanıcı kendisini, admin herkesi güncelleyebilir.
--   - DELETE  : yalnızca admin kullanıcı silebilir.
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_owner_select ON public.users;
CREATE POLICY users_owner_select ON public.users
  FOR SELECT
  USING (id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS users_public_insert ON public.users;
CREATE POLICY users_public_insert ON public.users
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS users_owner_update ON public.users;
CREATE POLICY users_owner_update ON public.users
  FOR UPDATE
  USING (id = public.app_current_user_id() OR public.app_is_admin())
  WITH CHECK (id = public.app_current_user_id() OR public.app_is_admin());

DROP POLICY IF EXISTS users_admin_delete ON public.users;
CREATE POLICY users_admin_delete ON public.users
  FOR DELETE
  USING (public.app_is_admin());

-- ----------------------------------------------------------------------------
-- 5) DOĞRULAMA (opsiyonel)
-- ----------------------------------------------------------------------------
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN ('users', 'customers', 'transactions', 'sales');
--
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('users', 'customers', 'transactions', 'sales')
-- ORDER BY tablename, policyname;
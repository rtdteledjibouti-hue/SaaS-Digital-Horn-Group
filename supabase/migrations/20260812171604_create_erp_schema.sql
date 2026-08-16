/*
# ERP/CRM Schema - Invoicing & Management

## Overview
Creates the full database schema for a multi-user SaaS invoicing and management app (ERP/CRM).
Covers: users with roles (admin/accountant/commercial), clients (CRM), products with stock tracking,
quotes (devis) with line items, invoices (factures) with line items, payments, expenses, and company settings.

## New Tables
1. `profiles` — extends auth.users with role (admin/accountant/commercial), full_name, avatar.
2. `company_settings` — single-row company profile (name, logo, legal info, invoice counter).
3. `clients` — CRM customers with contact details and balance.
4. `products` — catalog of products/services with stock tracking.
5. `stock_logs` — entries/exits log for stock movements.
6. `quotes` — devis (draft proposals) with status and totals.
7. `quote_items` — line items for quotes.
8. `invoices` — factures with sequential numbering, status, totals, due date.
9. `invoice_items` — line items for invoices.
10. `payments` — encaissements linked to invoices with method and amount.
11. `expenses` — categorized charges with date and amount.

## Security
- RLS enabled on every table.
- Policies scoped to `authenticated` users (sign-in required app).
- All tables owned by a user_id (default auth.uid()) so each org sees only their own data.
- profiles: each user reads/updates only their own profile row.
- company_settings: owner-scoped.
- All business tables (clients, products, quotes, invoices, payments, expenses, stock_logs): owner-scoped via user_id.
- Child tables (quote_items, invoice_items) scoped through parent ownership.

## Important Notes
1. `user_id` columns default to `auth.uid()` so client inserts omitting the owner still satisfy RLS.
2. Invoice numbering uses a per-owner counter stored in company_settings (invoice_seq).
3. Stock auto-decrement is handled in app logic on invoice validation.
4. Amounts stored as numeric(12,2) for currency precision.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'commercial' CHECK (role IN ('admin','accountant','commercial')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ COMPANY SETTINGS ============
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Mon Entreprise',
  logo_url text,
  address text,
  phone text,
  email text,
  legal_id text,
  tax_rate numeric(5,2) DEFAULT 0,
  currency text DEFAULT 'FCFA',
  invoice_prefix text DEFAULT 'FAC',
  invoice_seq integer DEFAULT 0,
  quote_prefix text DEFAULT 'DEV',
  quote_seq integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_company" ON company_settings;
CREATE POLICY "select_own_company" ON company_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_company" ON company_settings;
CREATE POLICY "insert_own_company" ON company_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_company" ON company_settings;
CREATE POLICY "update_own_company" ON company_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_company" ON company_settings;
CREATE POLICY "delete_own_company" ON company_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ CLIENTS ============
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  country text DEFAULT 'Côte d''Ivoire',
  notes text,
  balance numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_clients" ON clients;
CREATE POLICY "select_own_clients" ON clients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_clients" ON clients;
CREATE POLICY "insert_own_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_clients" ON clients;
CREATE POLICY "update_own_clients" ON clients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_clients" ON clients;
CREATE POLICY "delete_own_clients" ON clients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ PRODUCTS ============
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  stock numeric(12,2) DEFAULT 0,
  low_stock_threshold numeric(12,2) DEFAULT 5,
  is_service boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_products" ON products;
CREATE POLICY "select_own_products" ON products FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_products" ON products;
CREATE POLICY "insert_own_products" ON products FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_products" ON products;
CREATE POLICY "update_own_products" ON products FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_products" ON products;
CREATE POLICY "delete_own_products" ON products FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ STOCK LOGS ============
CREATE TABLE IF NOT EXISTS stock_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in','out','adjust')),
  quantity numeric(12,2) NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_stock_logs" ON stock_logs;
CREATE POLICY "select_own_stock_logs" ON stock_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_stock_logs" ON stock_logs;
CREATE POLICY "insert_own_stock_logs" ON stock_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_stock_logs" ON stock_logs;
CREATE POLICY "delete_own_stock_logs" ON stock_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ QUOTES ============
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  number text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','refused','converted','cancelled')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  subtotal numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_quotes" ON quotes;
CREATE POLICY "select_own_quotes" ON quotes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_quotes" ON quotes;
CREATE POLICY "insert_own_quotes" ON quotes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_quotes" ON quotes;
CREATE POLICY "update_own_quotes" ON quotes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_quotes" ON quotes;
CREATE POLICY "delete_own_quotes" ON quotes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ QUOTE ITEMS ============
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_quote_items" ON quote_items;
CREATE POLICY "select_own_quote_items" ON quote_items FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_quote_items" ON quote_items;
CREATE POLICY "insert_own_quote_items" ON quote_items FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_quote_items" ON quote_items;
CREATE POLICY "update_own_quote_items" ON quote_items FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_quote_items" ON quote_items;
CREATE POLICY "delete_own_quote_items" ON quote_items FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()));

-- ============ INVOICES ============
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  number text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','paid','partial','overdue','cancelled')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ INVOICE ITEMS ============
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_invoice_items" ON invoice_items;
CREATE POLICY "select_own_invoice_items" ON invoice_items FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_invoice_items" ON invoice_items;
CREATE POLICY "insert_own_invoice_items" ON invoice_items FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_invoice_items" ON invoice_items;
CREATE POLICY "update_own_invoice_items" ON invoice_items FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_invoice_items" ON invoice_items;
CREATE POLICY "delete_own_invoice_items" ON invoice_items FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

-- ============ PAYMENTS ============
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  method text NOT NULL CHECK (method IN ('cash','transfer','check','mobile_money')),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ EXPENSES ============
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('fuel','suppliers','rent','utilities','salaries','marketing','other')),
  description text,
  amount numeric(12,2) NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_expenses" ON expenses;
CREATE POLICY "select_own_expenses" ON expenses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_expenses" ON expenses;
CREATE POLICY "insert_own_expenses" ON expenses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_expenses" ON expenses;
CREATE POLICY "update_own_expenses" ON expenses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_expenses" ON expenses;
CREATE POLICY "delete_own_expenses" ON expenses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- ============ TRIGGER: auto-create profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'role', 'admin'));
  INSERT INTO public.company_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

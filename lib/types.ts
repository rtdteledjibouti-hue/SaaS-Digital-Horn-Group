export type UserRole = 'admin' | 'accountant' | 'commercial';
export type Plan = 'starter' | 'business' | 'enterprise';
export type PlanStatus = 'active' | 'pending_payment' | 'past_due' | 'canceled';

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'converted' | 'cancelled';
export type PaymentMethod = 'cash' | 'transfer' | 'check' | 'mobile_money';
export type ExpenseCategory = 'fuel' | 'suppliers' | 'rent' | 'utilities' | 'salaries' | 'marketing' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  plan: Plan;
  plan_status: PlanStatus;
}

export interface CompanySettings {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  legal_id: string | null;
  tax_rate: number;
  currency: string;
  invoice_prefix: string;
  invoice_seq: number;
  quote_prefix: string;
  quote_seq: number;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  notes: string | null;
  balance: number;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  stock: number;
  low_stock_threshold: number;
  is_service: boolean;
  created_at: string;
}

export interface StockLog {
  id: string;
  user_id: string;
  product_id: string;
  type: 'in' | 'out' | 'adjust';
  quantity: number;
  note: string | null;
  created_at: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Quote {
  id: string;
  user_id: string;
  client_id: string | null;
  number: string | null;
  status: QuoteStatus;
  issue_date: string;
  expiry_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  quote_items?: QuoteItem[];
  clients?: Pick<Client, 'id' | 'name'> | null;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string | null;
  quote_id: string | null;
  number: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  notes: string | null;
  created_at: string;
  invoice_items?: InvoiceItem[];
  clients?: Pick<Client, 'id' | 'name'> | null;
}

export interface Payment {
  id: string;
  user_id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  payment_date: string;
  note: string | null;
  created_at: string;
  invoices?: Pick<Invoice, 'id' | 'number' | 'total'> | null;
}

export interface Expense {
  id: string;
  user_id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  expense_date: string;
  created_at: string;
}

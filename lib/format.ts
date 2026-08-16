import type {
  InvoiceStatus,
  QuoteStatus,
  PaymentMethod,
  ExpenseCategory,
  UserRole,
} from './types';

export function formatCurrency(amount: number, currency = 'FDJ'): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  return `${formatted} ${currency}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value || 0);
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: 'Brouillon',
  pending: 'En attente',
  paid: 'Payée',
  partial: 'Partiel',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
  converted: 'Converti',
  cancelled: 'Annulé',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  transfer: 'Virement',
  check: 'Chèque',
  mobile_money: 'Mobile Money',
};

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  fuel: 'Carburant',
  suppliers: 'Achats fournisseurs',
  rent: 'Loyer',
  utilities: 'Charges diverses',
  salaries: 'Salaires',
  marketing: 'Marketing',
  other: 'Autre',
};

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrateur',
  accountant: 'Comptable',
  commercial: 'Commercial',
};

export const invoiceStatusVariants: Record<InvoiceStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/15 text-warning border-warning/30',
  paid: 'bg-success/15 text-success border-success/30',
  partial: 'bg-accent/15 text-accent border-accent/30',
  overdue: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground',
};

export const quoteStatusVariants: Record<QuoteStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-warning/15 text-warning border-warning/30',
  accepted: 'bg-success/15 text-success border-success/30',
  refused: 'bg-destructive/15 text-destructive border-destructive/30',
  converted: 'bg-primary/15 text-primary border-primary/30',
  cancelled: 'bg-muted text-muted-foreground',
};

export function isOverdue(invoice: { status: string; due_date: string | null }): boolean {
  if (!invoice.due_date || invoice.status === 'paid' || invoice.status === 'cancelled') return false;
  return new Date(invoice.due_date) < new Date();
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

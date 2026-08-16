'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Printer, Trophy } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, PieChart, Pie, Legend, LineChart, Line, Area, AreaChart } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { formatCurrency, formatDate, expenseCategoryLabels, invoiceStatusLabels } from '@/lib/format';
import type { Invoice, Payment, Expense, Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ReportsPage() {
  const { settings } = useSettings();
  const currency = settings?.currency ?? 'FDJ';
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    setLoading(true);
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const [inv, pay, exp, cli] = await Promise.all([
      supabase.from('invoices').select('*, clients(name)').gte('issue_date', start).lte('issue_date', end).order('issue_date'),
      supabase.from('payments').select('*').gte('payment_date', start).lte('payment_date', end),
      supabase.from('expenses').select('*').gte('expense_date', start).lte('expense_date', end),
      supabase.from('clients').select('*'),
    ]);
    setInvoices((inv.data ?? []) as Invoice[]);
    setPayments((pay.data ?? []) as Payment[]);
    setExpenses((exp.data ?? []) as Expense[]);
    setClients((cli.data ?? []) as Client[]);
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

  const validInvoices = invoices.filter((i) => i.status !== 'cancelled' && i.status !== 'draft');
  const totalRevenue = validInvoices.reduce((s, i) => s + Number(i.total), 0);
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const profit = totalCollected - totalExpenses;

  // Top clients by revenue
  const clientRevenue: Record<string, { name: string; amount: number }> = {};
  validInvoices.forEach((inv) => {
    if (inv.client_id && inv.clients) {
      const c = inv.clients as { name: string };
      if (!clientRevenue[inv.client_id]) clientRevenue[inv.client_id] = { name: c.name, amount: 0 };
      clientRevenue[inv.client_id].amount += Number(inv.total);
    }
  });
  const topClients = Object.entries(clientRevenue).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.amount - a.amount).slice(0, 10);

  // Monthly data
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyData = monthNames.map((month, idx) => {
    const rev = validInvoices.filter((i) => new Date(i.issue_date).getMonth() === idx).reduce((s, i) => s + Number(i.total), 0);
    const exp = expenses.filter((e) => new Date(e.expense_date).getMonth() === idx).reduce((s, e) => s + Number(e.amount), 0);
    return { month, revenue: rev, expenses: exp };
  });

  // Expense by category
  const expenseByCategory = Object.entries(expenseCategoryLabels).map(([key, label]) => ({
    category: label, amount: expenses.filter((e) => e.category === key).reduce((s, e) => s + Number(e.amount), 0),
  })).filter((c) => c.amount > 0);

  // Invoice status distribution
  const statusColors: Record<string, string> = {
    draft: 'hsl(var(--muted-foreground))',
    pending: 'hsl(var(--warning))',
    paid: 'hsl(var(--success))',
    partial: 'hsl(var(--accent))',
    overdue: 'hsl(var(--destructive))',
    cancelled: 'hsl(var(--muted))',
  };
  const statusData = (['draft', 'pending', 'paid', 'partial', 'overdue', 'cancelled'] as const)
    .map((s) => ({ name: invoiceStatusLabels[s], value: invoices.filter((i) => i.status === s).length, color: statusColors[s] }))
    .filter((s) => s.value > 0);

  // Payment methods breakdown
  const methodMap: Record<string, number> = {};
  payments.forEach((p) => { methodMap[p.method] = (methodMap[p.method] ?? 0) + Number(p.amount); });
  const paymentMethodData = Object.entries(methodMap).map(([k, v]) => ({
    method: k === 'cash' ? 'Espèces' : k === 'transfer' ? 'Virement' : k === 'check' ? 'Chèque' : 'Mobile Money',
    amount: v,
  }));

  // Cumulative profit
  let cum = 0;
  const cumulativeData = monthNames.map((month, idx) => {
    const rev = validInvoices.filter((i) => new Date(i.issue_date).getMonth() === idx).reduce((s, i) => s + Number(i.total), 0);
    const exp = expenses.filter((e) => new Date(e.expense_date).getMonth() === idx).reduce((s, e) => s + Number(e.amount), 0);
    cum += rev - exp;
    return { month, cumulative: cum };
  });

  // Quote conversion rate
  const quoteCount = invoices.filter((i) => i.quote_id).length;
  const conversionRate = validInvoices.length > 0 ? (quoteCount / validInvoices.length) * 100 : 0;

  function exportCSV() {
    const rows = [
      ['Numéro', 'Client', 'Date', 'Total', 'Payé', 'Statut'],
      ...validInvoices.map((i) => [i.number, (i.clients as { name: string })?.name ?? '', formatDate(i.issue_date), String(Number(i.total)), String(Number(i.paid_amount)), invoiceStatusLabels[i.status]]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-ventes-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  }

  function exportExpensesCSV() {
    const rows = [
      ['Date', 'Catégorie', 'Description', 'Montant'],
      ...expenses.map((e) => [formatDate(e.expense_date), expenseCategoryLabels[e.category], e.description ?? '', String(Number(e.amount))]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-depenses-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export dépenses téléchargé');
  }

  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))', 'hsl(var(--accent))'];

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Rapports</h1><p className="text-sm text-muted-foreground">Analyse financière et exports</p></div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[0, 1, 2].map((offset) => { const y = new Date().getFullYear() - offset; return <SelectItem key={y} value={String(y)}>{y}</SelectItem>; })}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />Export ventes</Button>
          <Button variant="outline" onClick={exportExpensesCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />Export dépenses</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimer</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Chiffre d'affaires {year}</p><p className="text-2xl font-bold">{formatCurrency(totalRevenue, currency)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Encaissé</p><p className="text-2xl font-bold text-success">{formatCurrency(totalCollected, currency)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Dépenses</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses, currency)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Bénéfice net</p><p className={`text-2xl font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(profit, currency)}</p></CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Ventes vs Dépenses</CardTitle><CardDescription>Évolution mensuelle {year}</CardDescription></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => formatCurrency(v, currency)} />
                    <Bar dataKey="revenue" name="Ventes" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Dépenses" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Dépenses par catégorie</CardTitle><CardDescription>Répartition des charges</CardDescription></CardHeader>
              <CardContent>
                {expenseByCategory.length === 0 ? (
                  <p className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Aucune dépense</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expenseByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis type="category" dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => formatCurrency(v, currency)} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>{expenseByCategory.map((_, idx) => <Cell key={idx} fill={colors[idx % colors.length]} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Additional statistics charts */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-lg">Statut des factures</CardTitle><CardDescription>Répartition par statut</CardDescription></CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Aucune facture</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                        {statusData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Modes de paiement</CardTitle><CardDescription>Encaissements par méthode</CardDescription></CardHeader>
              <CardContent>
                {paymentMethodData.length === 0 ? (
                  <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Aucun paiement</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={paymentMethodData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="method" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => formatCurrency(v, currency)} />
                      <Bar dataKey="amount" name="Montant" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Bénéfice cumulé</CardTitle><CardDescription>Évolution du profit sur l'année</CardDescription></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={cumulativeData}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => formatCurrency(v, currency)} />
                    <Area type="monotone" dataKey="cumulative" name="Bénéfice cumulé" stroke="hsl(var(--chart-4))" fill="url(#cumGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Extra KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Taux de conversion devis</p><p className="text-2xl font-bold text-primary">{conversionRate.toFixed(1)}%</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Factures payées</p><p className="text-2xl font-bold text-success">{invoices.filter((i) => i.status === 'paid').length}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Factures en retard</p><p className="text-2xl font-bold text-destructive">{invoices.filter((i) => i.status === 'overdue').length}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" /><div><CardTitle className="text-lg">Meilleurs clients</CardTitle><CardDescription>Classement par chiffre d'affaires</CardDescription></div></div>
            </CardHeader>
            <CardContent>
              {topClients.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnée</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead className="w-12">Rang</TableHead><TableHead>Client</TableHead><TableHead className="text-right">Chiffre d'affaires</TableHead><TableHead className="text-right">% du total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {topClients.map((c, idx) => (
                      <TableRow key={c.id}>
                        <TableCell><div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${idx < 3 ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}`}>{idx + 1}</div></TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(c.amount, currency)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{((c.amount / totalRevenue) * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

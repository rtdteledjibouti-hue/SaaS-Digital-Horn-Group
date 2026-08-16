'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  Users,
  Package,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Legend,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { formatCurrency, formatDate, invoiceStatusLabels, invoiceStatusVariants } from '@/lib/format';
import type { Invoice, Client, Product, Payment, Expense } from '@/lib/types';

interface DashboardData {
  totalRevenue: number;
  collected: number;
  unpaid: number;
  overdueCount: number;
  activeClients: number;
  lowStockCount: number;
  monthlyData: { month: string; revenue: number; expenses: number }[];
  recentInvoices: (Invoice & { clients?: { name: string } | null })[];
  lowStockProducts: Product[];
  overdueInvoices: (Invoice & { clients?: { name: string } | null })[];
  statusData: { name: string; value: number; color: string }[];
  paymentMethodData: { method: string; amount: number }[];
  cumulativeData: { month: string; cumulative: number }[];
}

export default function DashboardPage() {
  const { settings } = useSettings();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);

      const [invoices, clients, products, payments, expenses] = await Promise.all([
        supabase.from('invoices').select('*').gte('issue_date', yearStart.toISOString().split('T')[0]).lte('issue_date', yearEnd.toISOString().split('T')[0]),
        supabase.from('clients').select('*'),
        supabase.from('products').select('*'),
        supabase.from('payments').select('*').gte('payment_date', yearStart.toISOString().split('T')[0]).lte('payment_date', yearEnd.toISOString().split('T')[0]),
        supabase.from('expenses').select('*').gte('expense_date', yearStart.toISOString().split('T')[0]).lte('expense_date', yearEnd.toISOString().split('T')[0]),
      ]);

      const invoiceList = (invoices.data ?? []) as Invoice[];
      const clientList = (clients.data ?? []) as Client[];
      const productList = (products.data ?? []) as Product[];
      const paymentList = (payments.data ?? []) as Payment[];
      const expenseList = (expenses.data ?? []) as Expense[];

      const totalRevenue = invoiceList.filter((i) => i.status !== 'cancelled' && i.status !== 'draft').reduce((s, i) => s + Number(i.total), 0);
      const collected = paymentList.reduce((s, p) => s + Number(p.amount), 0);
      const unpaid = invoiceList.filter((i) => i.status === 'pending' || i.status === 'partial' || i.status === 'overdue').reduce((s, i) => s + (Number(i.total) - Number(i.paid_amount)), 0);

      const overdueInvoices = invoiceList.filter((i) => {
        if (!i.due_date || i.status === 'paid' || i.status === 'cancelled') return false;
        return new Date(i.due_date) < now;
      });

      const lowStockProducts = productList.filter((p) => !p.is_service && Number(p.stock) <= Number(p.low_stock_threshold));

      // Monthly chart data
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      const monthlyData = monthNames.map((month, idx) => {
        const rev = invoiceList
          .filter((i) => new Date(i.issue_date).getMonth() === idx && i.status !== 'cancelled' && i.status !== 'draft')
          .reduce((s, i) => s + Number(i.total), 0);
        const exp = expenseList
          .filter((e) => new Date(e.expense_date).getMonth() === idx)
          .reduce((s, e) => s + Number(e.amount), 0);
        return { month, revenue: rev, expenses: exp };
      });

      // Recent invoices with client names
      const recentIds = invoiceList.slice(0, 5).map((i) => i.id);
      const { data: recentWithClients } = await supabase
        .from('invoices')
        .select('*, clients(name)')
        .in('id', recentIds)
        .order('created_at', { ascending: false })
        .limit(5);

      const overdueWithClients = await supabase
        .from('invoices')
        .select('*, clients(name)')
        .in('status', ['pending', 'partial', 'overdue'])
        .lt('due_date', now.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5);

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
        .map((s) => ({
          name: invoiceStatusLabels[s],
          value: invoiceList.filter((i) => i.status === s).length,
          color: statusColors[s],
        }))
        .filter((s) => s.value > 0);

      // Payment methods breakdown
      const methodMap: Record<string, number> = {};
      paymentList.forEach((p) => {
        methodMap[p.method] = (methodMap[p.method] ?? 0) + Number(p.amount);
      });
      const paymentMethodData = Object.entries(methodMap).map(([k, v]) => ({
        method: k === 'cash' ? 'Espèces' : k === 'transfer' ? 'Virement' : k === 'check' ? 'Chèque' : 'Mobile Money',
        amount: v,
      }));

      // Cumulative profit
      let cum = 0;
      const cumulativeData = monthNames.map((month, idx) => {
        const rev = invoiceList
          .filter((i) => new Date(i.issue_date).getMonth() === idx && i.status !== 'cancelled' && i.status !== 'draft')
          .reduce((s, i) => s + Number(i.total), 0);
        const exp = expenseList
          .filter((e) => new Date(e.expense_date).getMonth() === idx)
          .reduce((s, e) => s + Number(e.amount), 0);
        cum += rev - exp;
        return { month, cumulative: cum };
      });

      setData({
        totalRevenue,
        collected,
        unpaid,
        overdueCount: overdueInvoices.length,
        activeClients: clientList.length,
        lowStockCount: lowStockProducts.length,
        monthlyData,
        recentInvoices: (recentWithClients ?? []) as (Invoice & { clients?: { name: string } | null })[],
        lowStockProducts,
        overdueInvoices: (overdueWithClients.data ?? []) as (Invoice & { clients?: { name: string } | null })[],
        statusData,
        paymentMethodData,
        cumulativeData,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const currency = settings?.currency ?? 'FDJ';

  const kpis = [
    { label: "Chiffre d'affaires", value: formatCurrency(data.totalRevenue, currency), icon: TrendingUp, trend: '+12%', trendUp: true, color: 'text-primary' },
    { label: 'Montants encaissés', value: formatCurrency(data.collected, currency), icon: Wallet, trend: '+8%', trendUp: true, color: 'text-success' },
    { label: 'Montants impayés', value: formatCurrency(data.unpaid, currency), icon: Clock, trend: `${data.overdueCount} en retard`, trendUp: false, color: 'text-warning' },
    { label: 'Clients actifs', value: String(data.activeClients), icon: Users, trend: 'Total', trendUp: true, color: 'text-accent' },
  ];

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex gap-2">
          <Link href="/invoices/new">
            <Button size="sm">
              <Receipt className="mr-2 h-4 w-4" />
              Nouvelle facture
            </Button>
          </Link>
          <Link href="/quotes/new">
            <Button variant="outline" size="sm">
              <Receipt className="mr-2 h-4 w-4" />
              Nouveau devis
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <div className="flex items-center gap-1 text-xs">
                    {kpi.trendUp ? (
                      <ArrowUpRight className="h-3 w-3 text-success" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-destructive" />
                    )}
                    <span className={kpi.trendUp ? 'text-success' : 'text-destructive'}>{kpi.trend}</span>
                  </div>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${kpi.color}`}>
                  <kpi.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Évolution des ventes</CardTitle>
            <CardDescription>Revenus et dépenses mensuels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.monthlyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value, currency)}
                />
                <Area type="monotone" dataKey="revenue" name="Revenus" stroke="hsl(var(--chart-1))" fill="url(#revGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="hsl(var(--chart-3))" fill="url(#expGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dépenses par catégorie</CardTitle>
            <CardDescription>Répartition des charges</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseChart currency={currency} />
          </CardContent>
        </Card>
      </div>

      {/* Status & Payment Methods */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statut des factures</CardTitle>
            <CardDescription>Répartition par statut</CardDescription>
          </CardHeader>
          <CardContent>
            {data.statusData.length === 0 ? (
              <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Aucune facture</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {data.statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Modes de paiement</CardTitle>
            <CardDescription>Encaissements par méthode</CardDescription>
          </CardHeader>
          <CardContent>
            {data.paymentMethodData.length === 0 ? (
              <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">Aucun paiement</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.paymentMethodData}>
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
          <CardHeader>
            <CardTitle className="text-lg">Bénéfice cumulé</CardTitle>
            <CardDescription>Évolution du profit sur l'année</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => formatCurrency(v, currency)} />
                <Line type="monotone" dataKey="cumulative" name="Bénéfice cumulé" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(data.lowStockCount > 0 || data.overdueCount > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.overdueCount > 0 && (
            <Card className="border-destructive/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Factures en retard</CardTitle>
                    <CardDescription>{data.overdueCount} facture(s) en retard de paiement</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.overdueInvoices.slice(0, 4).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 text-sm">
                    <div>
                      <p className="font-medium">{inv.number}</p>
                      <p className="text-xs text-muted-foreground">{inv.clients?.name ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-destructive">{formatCurrency(Number(inv.total) - Number(inv.paid_amount), currency)}</p>
                      <p className="text-xs text-muted-foreground">Échéance: {formatDate(inv.due_date)}</p>
                    </div>
                  </div>
                ))}
                <Link href="/invoices" className="block">
                  <Button variant="outline" size="sm" className="w-full">
                    Voir toutes les factures
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {data.lowStockCount > 0 && (
            <Card className="border-warning/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Stock critique</CardTitle>
                    <CardDescription>{data.lowStockCount} produit(s) en rupture imminente</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.lowStockProducts.slice(0, 4).map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 text-sm">
                    <div>
                      <p className="font-medium">{prod.name}</p>
                      <p className="text-xs text-muted-foreground">Seuil: {prod.low_stock_threshold}</p>
                    </div>
                    <Badge variant="outline" className="border-warning/40 text-warning">
                      Stock: {prod.stock}
                    </Badge>
                  </div>
                ))}
                <Link href="/stock" className="block">
                  <Button variant="outline" size="sm" className="w-full">
                    Gérer le stock
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Factures récentes</CardTitle>
              <CardDescription>Dernières factures émises</CardDescription>
            </div>
            <Link href="/invoices">
              <Button variant="ghost" size="sm">Voir tout</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentInvoices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune facture pour le moment</p>
          ) : (
            <div className="space-y-2">
              {data.recentInvoices.map((inv) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{inv.number}</p>
                      <p className="text-xs text-muted-foreground">{inv.clients?.name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(Number(inv.total), currency)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(inv.issue_date)}</p>
                    </div>
                    <Badge className={invoiceStatusVariants[inv.status]} variant="outline">
                      {invoiceStatusLabels[inv.status]}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExpenseChart({ currency }: { currency: string }) {
  const [chartData, setChartData] = React.useState<{ category: string; amount: number }[]>([]);

  React.useEffect(() => {
    async function load() {
      const { data } = await supabase.from('expenses').select('*');
      const categoryMap: Record<string, number> = {};
      (data ?? []).forEach((e: Expense) => {
        categoryMap[e.category] = (categoryMap[e.category] ?? 0) + Number(e.amount);
      });
      const labels: Record<string, string> = {
        fuel: 'Carburant', suppliers: 'Fournisseurs', rent: 'Loyer', utilities: 'Charges',
        salaries: 'Salaires', marketing: 'Marketing', other: 'Autre',
      };
      setChartData(Object.entries(categoryMap).map(([k, v]) => ({ category: labels[k] ?? k, amount: v })));
    }
    load();
  }, []);

  if (chartData.length === 0) {
    return <p className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Aucune dépense enregistrée</p>;
  }

  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))', 'hsl(var(--accent))'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
        <YAxis type="category" dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
          formatter={(value: number) => formatCurrency(value, currency)}
        />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
          {chartData.map((_, idx) => (
            <Cell key={idx} fill={colors[idx % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

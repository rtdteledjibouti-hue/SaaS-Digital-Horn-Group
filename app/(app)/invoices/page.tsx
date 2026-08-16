'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Search, Receipt, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate, invoiceStatusLabels, invoiceStatusVariants } from '@/lib/format';
import type { Invoice } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const { settings } = useSettings();
  const { profile } = useAuth();
  const [invoices, setInvoices] = React.useState<(Invoice & { clients?: { name: string } | null })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [page, setPage] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [deleteTarget, setDeleteTarget] = React.useState<Invoice | null>(null);
  const [monthInvoiceCount, setMonthInvoiceCount] = React.useState(0);
  const currency = settings?.currency ?? 'FDJ';

  const isStarter = (profile?.plan ?? 'starter') === 'starter';
  const monthLimit = 10;

  async function load() {
    setLoading(true);
    let query = supabase.from('invoices').select('*, clients(name)', { count: 'exact' });
    if (search) query = query.or(`number.ilike.%${search}%`);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    query = query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, error, count: c } = await query;
    if (error) toast.error(error.message);
    setInvoices((data ?? []) as (Invoice & { clients?: { name: string } | null })[]);
    setCount(c ?? 0);
    setLoading(false);

    // Fetch this month's invoice count for Starter limit display
    if (isStarter) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const { count: mc } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .gte('issue_date', monthStart)
        .lte('issue_date', monthEnd);
      setMonthInvoiceCount(mc ?? 0);
    }
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, search, statusFilter]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from('invoice_items').delete().eq('invoice_id', deleteTarget.id);
    await supabase.from('payments').delete().eq('invoice_id', deleteTarget.id);
    const { error } = await supabase.from('invoices').delete().eq('id', deleteTarget.id);
    if (error) { toast.error('Erreur de suppression'); return; }
    toast.success('Facture supprimée');
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Factures</h1><p className="text-sm text-muted-foreground">Gérez vos factures</p></div>
        <Link href="/invoices/new"><Button><Plus className="mr-2 h-4 w-4" />Nouvelle facture</Button></Link>
      </div>

      {isStarter && (
        <div className={`flex items-center justify-between rounded-lg border p-4 ${monthInvoiceCount >= monthLimit ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${monthInvoiceCount >= monthLimit ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Plan Starter : {monthInvoiceCount}/{monthLimit} factures ce mois-ci
              </p>
              <p className="text-xs text-muted-foreground">
                {monthInvoiceCount >= monthLimit
                  ? 'Limite atteinte. Passez au plan Business pour des factures illimitées.'
                  : `${monthLimit - monthInvoiceCount} facture(s) restante(s) ce mois-ci.`}
              </p>
            </div>
          </div>
          <Link href="/checkout?plan=business">
            <Button size="sm" variant={monthInvoiceCount >= monthLimit ? 'default' : 'outline'}>
              Passer à Business
            </Button>
          </Link>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par numéro..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(invoiceStatusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Receipt className="mb-3 h-10 w-10 opacity-40" /><p>Aucune facture trouvée</p></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead>
                    <TableHead>Échéance</TableHead><TableHead className="text-right">Montant</TableHead><TableHead className="text-right">Payé</TableHead>
                    <TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.number || '—'}</TableCell>
                      <TableCell>{inv.clients?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(inv.issue_date)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(inv.due_date)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(inv.total), currency)}</TableCell>
                      <TableCell className="text-right text-sm text-success">{formatCurrency(Number(inv.paid_amount), currency)}</TableCell>
                      <TableCell><Badge variant="outline" className={invoiceStatusVariants[inv.status]}>{invoiceStatusLabels[inv.status]}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/invoices/${inv.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(inv)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">{count} facture(s) au total</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Suivant</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle><AlertDialogDescription>Action irréversible. Les paiements liés seront aussi supprimés.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

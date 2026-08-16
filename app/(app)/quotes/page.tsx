'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Plus, Search, FileText, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { formatCurrency, formatDate, quoteStatusLabels, quoteStatusVariants } from '@/lib/format';
import type { Quote } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const PAGE_SIZE = 10;

export default function QuotesPage() {
  const { settings } = useSettings();
  const [quotes, setQuotes] = React.useState<(Quote & { clients?: { name: string } | null })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [deleteTarget, setDeleteTarget] = React.useState<Quote | null>(null);
  const currency = settings?.currency ?? 'FDJ';

  async function load() {
    setLoading(true);
    let query = supabase.from('quotes').select('*, clients(name)', { count: 'exact' });
    if (search) query = query.or(`number.ilike.%${search}%`);
    query = query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, error, count: c } = await query;
    if (error) toast.error(error.message);
    setQuotes((data ?? []) as (Quote & { clients?: { name: string } | null })[]);
    setCount(c ?? 0);
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, search]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error: e1 } = await supabase.from('quote_items').delete().eq('quote_id', deleteTarget.id);
    const { error: e2 } = await supabase.from('quotes').delete().eq('id', deleteTarget.id);
    if (e1 || e2) { toast.error('Erreur de suppression'); return; }
    toast.success('Devis supprimé');
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Devis</h1><p className="text-sm text-muted-foreground">Créez et gérez vos devis</p></div>
        <Link href="/quotes/new"><Button><Plus className="mr-2 h-4 w-4" />Nouveau devis</Button></Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par numéro..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><FileText className="mb-3 h-10 w-10 opacity-40" /><p>Aucun devis trouvé</p></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead>
                    <TableHead>Expire le</TableHead><TableHead className="text-right">Montant</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.number || '—'}</TableCell>
                      <TableCell>{q.clients?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(q.issue_date)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(q.expiry_date)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(q.total), currency)}</TableCell>
                      <TableCell><Badge variant="outline" className={quoteStatusVariants[q.status]}>{quoteStatusLabels[q.status]}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/quotes/${q.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(q)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">{count} devis au total</p>
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
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle><AlertDialogDescription>Action irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Plus, TrendingDown, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { formatCurrency, formatDate, expenseCategoryLabels } from '@/lib/format';
import type { Expense, ExpenseCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ExpensesPage() {
  const { settings } = useSettings();
  const currency = settings?.currency ?? 'FDJ';
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = React.useState('all');

  const [form, setForm] = React.useState({ category: 'fuel' as ExpenseCategory, description: '', amount: 0, expense_date: new Date().toISOString().split('T')[0] });

  async function load() {
    setLoading(true);
    let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
    if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setExpenses((data ?? []) as Expense[]);
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [categoryFilter]);

  function openNew() { setEditing(null); setForm({ category: 'fuel', description: '', amount: 0, expense_date: new Date().toISOString().split('T')[0] }); setDialogOpen(true); }
  function openEdit(e: Expense) { setEditing(e); setForm({ category: e.category, description: e.description ?? '', amount: Number(e.amount), expense_date: e.expense_date }); setDialogOpen(true); }

  async function handleSave() {
    if (!form.amount || form.amount <= 0) { toast.error('Montant invalide'); return; }
    if (editing) {
      const { error } = await supabase.from('expenses').update(form).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Dépense mise à jour');
    } else {
      const { error } = await supabase.from('expenses').insert(form);
      if (error) { toast.error(error.message); return; }
      toast.success('Dépense enregistrée');
    }
    setDialogOpen(false);
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from('expenses').delete().eq('id', deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Dépense supprimée');
    setDeleteTarget(null);
    load();
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const byCategory = Object.entries(expenseCategoryLabels).map(([key, label]) => ({
    key, label, amount: expenses.filter((e) => e.category === key).reduce((s, e) => s + Number(e.amount), 0),
  })).filter((c) => c.amount > 0);

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Dépenses</h1><p className="text-sm text-muted-foreground">Saisie et suivi des charges</p></div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouvelle dépense</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total dépenses</p><p className="text-2xl font-bold text-destructive">{formatCurrency(total, currency)}</p></CardContent></Card>
        {byCategory.slice(0, 3).map((c) => (
          <Card key={c.key}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{c.label}</p><p className="text-xl font-bold">{formatCurrency(c.amount, currency)}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {Object.entries(expenseCategoryLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><TrendingDown className="mb-3 h-10 w-10 opacity-40" /><p>Aucune dépense enregistrée</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Date</TableHead><TableHead>Catégorie</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Montant</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(e.expense_date)}</TableCell>
                    <TableCell><Badge variant="secondary">{expenseCategoryLabels[e.category]}</Badge></TableCell>
                    <TableCell>{e.description || '—'}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">{formatCurrency(Number(e.amount), currency)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(e)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Modifier la dépense' : 'Nouvelle dépense'}</DialogTitle><DialogDescription>Enregistrez une charge</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Catégorie *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(expenseCategoryLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Montant *</Label><Input type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleSave}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle><AlertDialogDescription>Action irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Wallet, Trash2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { formatCurrency, formatDate, paymentMethodLabels } from '@/lib/format';
import type { Payment, Invoice } from '@/lib/types';
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

export default function PaymentsPage() {
  const { settings } = useSettings();
  const currency = settings?.currency ?? 'FDJ';
  const [payments, setPayments] = React.useState<(Payment & { invoices?: { number: string; total: number } | null })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Payment | null>(null);
  const [search, setSearch] = React.useState('');

  const [unpaidInvoices, setUnpaidInvoices] = React.useState<Invoice[]>([]);
  const [form, setForm] = React.useState({ invoice_id: '', amount: 0, method: 'cash' as string, payment_date: new Date().toISOString().split('T')[0], note: '' });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('payments').select('*, invoices(number, total)').order('payment_date', { ascending: false });
    if (error) toast.error(error.message);
    setPayments((data ?? []) as (Payment & { invoices?: { number: string; total: number } | null })[]);
    setLoading(false);
  }

  async function loadUnpaidInvoices() {
    const { data } = await supabase.from('invoices').select('*').in('status', ['pending', 'partial', 'overdue']).order('number');
    setUnpaidInvoices((data ?? []) as Invoice[]);
  }

  React.useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!form.invoice_id) { toast.error('Sélectionnez une facture'); return; }
    if (!form.amount || form.amount <= 0) { toast.error('Montant invalide'); return; }

    const { data: inv } = await supabase.from('invoices').select('*').eq('id', form.invoice_id).maybeSingle();
    if (!inv) { toast.error('Facture introuvable'); return; }

    const newPaid = Number(inv.paid_amount) + Number(form.amount);
    const newStatus = newPaid >= Number(inv.total) ? 'paid' : 'partial';

    const { error: payError } = await supabase.from('payments').insert({
      invoice_id: form.invoice_id,
      amount: form.amount,
      method: form.method,
      payment_date: form.payment_date,
      note: form.note,
    });
    if (payError) { toast.error(payError.message); return; }

    const { error: invError } = await supabase.from('invoices').update({ paid_amount: newPaid, status: newStatus }).eq('id', form.invoice_id);
    if (invError) { toast.error(invError.message); return; }

    toast.success('Paiement enregistré');
    setDialogOpen(false);
    setForm({ invoice_id: '', amount: 0, method: 'cash', payment_date: new Date().toISOString().split('T')[0], note: '' });
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    // Revert invoice paid amount
    const { data: pay } = await supabase.from('payments').select('*').eq('id', deleteTarget.id).maybeSingle();
    if (pay) {
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', pay.invoice_id).maybeSingle();
      if (inv) {
        const newPaid = Math.max(0, Number(inv.paid_amount) - Number(pay.amount));
        const newStatus = newPaid <= 0 ? 'pending' : newPaid >= Number(inv.total) ? 'paid' : 'partial';
        await supabase.from('invoices').update({ paid_amount: newPaid, status: newStatus }).eq('id', inv.id);
      }
    }
    await supabase.from('payments').delete().eq('id', deleteTarget.id);
    toast.success('Paiement supprimé');
    setDeleteTarget(null);
    load();
  }

  const filtered = payments.filter((p) => p.invoices?.number?.toLowerCase().includes(search.toLowerCase()));

  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Paiements</h1><p className="text-sm text-muted-foreground">Suivi des encaissements</p></div>
        <Button onClick={() => { loadUnpaidInvoices(); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nouveau paiement</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total encaissé</p><p className="text-2xl font-bold text-success">{formatCurrency(totalCollected, currency)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Nombre de paiements</p><p className="text-2xl font-bold">{payments.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Factures impayées</p><p className="text-2xl font-bold text-warning">{unpaidInvoices.length || '—'}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par facture..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Wallet className="mb-3 h-10 w-10 opacity-40" /><p>Aucun paiement enregistré</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facture</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Montant</TableHead>
                  <TableHead>Mode</TableHead><TableHead>Note</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.invoices?.number ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(p.payment_date)}</TableCell>
                    <TableCell className="text-right font-medium text-success">{formatCurrency(Number(p.amount), currency)}</TableCell>
                    <TableCell><Badge variant="secondary">{paymentMethodLabels[p.method as keyof typeof paymentMethodLabels]}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.note || '—'}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle><DialogDescription>Associez un encaissement à une facture</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Facture *</Label>
              <Select value={form.invoice_id} onValueChange={(v) => {
                const inv = unpaidInvoices.find((i) => i.id === v);
                setForm({ ...form, invoice_id: v, amount: inv ? Number(inv.total) - Number(inv.paid_amount) : 0 });
              }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une facture" /></SelectTrigger>
                <SelectContent>
                  {unpaidInvoices.map((inv) => <SelectItem key={inv.id} value={inv.id}>{inv.number} — Reste: {formatCurrency(Number(inv.total) - Number(inv.paid_amount), currency)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Montant *</Label><Input type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Mode</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(paymentMethodLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Note</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleSave}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle><AlertDialogDescription>Le montant sera déduit de la facture.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

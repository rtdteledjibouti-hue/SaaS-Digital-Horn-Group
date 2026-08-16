'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/format';
import type { Client, Product, QuoteItem, InvoiceItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface LineItem {
  id?: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface DocumentEditorProps {
  mode: 'quote' | 'invoice';
  docId?: string;
}

export default function DocumentEditor({ mode, docId }: DocumentEditorProps) {
  const { settings } = useSettings();
  const { profile } = useAuth();
  const currency = settings?.currency ?? 'FDJ';
  const taxRate = Number(settings?.tax_rate ?? 0);

  const [clients, setClients] = React.useState<Client[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [clientId, setClientId] = React.useState<string>('');
  const [issueDate, setIssueDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [items, setItems] = React.useState<LineItem[]>([{ product_id: null, description: '', quantity: 1, unit_price: 0, total: 0 }]);
  const [saving, setSaving] = React.useState(false);
  const [existingDoc, setExistingDoc] = React.useState<{ id: string; number: string | null; status: string } | null>(null);

  React.useEffect(() => {
    async function loadMeta() {
      const [c, p] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
      ]);
      setClients((c.data ?? []) as Client[]);
      setProducts((p.data ?? []) as Product[]);
    }
    loadMeta();
  }, []);

  React.useEffect(() => {
    if (!docId) return;
    async function loadDoc() {
      const table = mode === 'quote' ? 'quotes' : 'invoices';
      const itemsTable = mode === 'quote' ? 'quote_items' : 'invoice_items';
      const { data: doc } = await supabase.from(table).select('*').eq('id', docId).maybeSingle();
      if (!doc) return;
      setExistingDoc({ id: doc.id, number: doc.number, status: doc.status });
      setClientId(doc.client_id ?? '');
      setIssueDate(doc.issue_date);
      setDueDate(mode === 'invoice' ? doc.due_date ?? '' : doc.expiry_date ?? '');
      setNotes(doc.notes ?? '');
      const { data: dbItems } = await supabase.from(itemsTable).select('*').eq(mode === 'quote' ? 'quote_id' : 'invoice_id', docId).order('id');
      if (dbItems && dbItems.length > 0) {
        setItems(dbItems.map((i: QuoteItem | InvoiceItem) => ({
          id: i.id, product_id: i.product_id, description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), total: Number(i.total),
        })));
      }
    }
    loadDoc();
  }, [docId, mode]);

  function addItem() {
    setItems([...items, { product_id: null, description: '', quantity: 1, unit_price: 0, total: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof LineItem, value: string | number | null) {
    const newItems = [...items];
    const item = { ...newItems[idx] };
    if (field === 'quantity' || field === 'unit_price') {
      item[field] = Number(value) || 0;
    } else if (field === 'product_id') {
      item.product_id = value as string | null;
      if (value) {
        const prod = products.find((p) => p.id === value);
        if (prod) { item.unit_price = Number(prod.price); item.description = prod.name; }
      }
    } else {
      (item as Record<string, unknown>)[field] = value;
    }
    item.total = item.quantity * item.unit_price;
    newItems[idx] = item;
    setItems(newItems);
  }

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function handleSave(status?: string) {
    if (!clientId) { toast.error('Sélectionnez un client'); return; }
    if (items.every((i) => !i.description.trim())) { toast.error('Ajoutez au moins une ligne'); return; }

    // Starter plan limit: 10 invoices/month for new invoices only
    if (mode === 'invoice' && !docId) {
      const plan = profile?.plan ?? 'starter';
      if (plan === 'starter') {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        const { count } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .gte('issue_date', monthStart)
          .lte('issue_date', monthEnd);
        if ((count ?? 0) >= 10) {
          toast.error('Limite atteinte : votre plan Starter permet 10 factures par mois. Passez au plan Business pour des factures illimitées.');
          return;
        }
      }
    }

    setSaving(true);

    const table = mode === 'quote' ? 'quotes' : 'invoices';
    const itemsTable = mode === 'quote' ? 'quote_items' : 'invoice_items';
    const foreignKey = mode === 'quote' ? 'quote_id' : 'invoice_id';

    const docData: Record<string, unknown> = {
      client_id: clientId,
      issue_date: issueDate,
      notes,
      subtotal,
      tax_amount: taxAmount,
      total,
    };
    if (mode === 'quote') {
      docData.expiry_date = dueDate || null;
    } else {
      docData.due_date = dueDate || null;
    }
    if (status) docData.status = status;

    let savedDocId = docId;

    try {
      if (docId && existingDoc) {
        const { error } = await supabase.from(table).update(docData).eq('id', docId);
        if (error) throw error;
        await supabase.from(itemsTable).delete().eq(foreignKey, docId);
      } else {
        // Generate sequential number
        if (mode === 'quote') {
          const seq = (settings?.quote_seq ?? 0) + 1;
          const year = new Date().getFullYear();
          docData.number = `${settings?.quote_prefix ?? 'DEV'}-${year}-${String(seq).padStart(4, '0')}`;
        } else {
          const seq = (settings?.invoice_seq ?? 0) + 1;
          const year = new Date().getFullYear();
          docData.number = `${settings?.invoice_prefix ?? 'FAC'}-${year}-${String(seq).padStart(4, '0')}`;
        }
        if (!status) docData.status = mode === 'quote' ? 'draft' : 'draft';
        const { data, error } = await supabase.from(table).insert(docData).select().single();
        if (error) throw error;
        savedDocId = data.id;

        // Update sequence counter
        const seqField = mode === 'quote' ? 'quote_seq' : 'invoice_seq';
        await supabase.from('company_settings').update({ [seqField]: ((mode === 'quote' ? settings?.quote_seq : settings?.invoice_seq) ?? 0) + 1 }).eq('id', settings?.id);
      }

      const itemInserts = items.map((i) => ({
        [foreignKey]: savedDocId,
        product_id: i.product_id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total: i.total,
      }));
      const { error: itemError } = await supabase.from(itemsTable).insert(itemInserts);
      if (itemError) throw itemError;

      // Stock decrement for invoices
      if (mode === 'invoice' && status && status !== 'draft' && status !== 'cancelled') {
        for (const item of items) {
          if (item.product_id) {
            const prod = products.find((p) => p.id === item.product_id);
            if (prod && !prod.is_service) {
              await supabase.from('products').update({ stock: Number(prod.stock) - item.quantity }).eq('id', item.product_id);
              await supabase.from('stock_logs').insert({ product_id: item.product_id, type: 'out', quantity: item.quantity, note: `Facture ${docData.number ?? ''}` });
            }
          }
        }
      }

      toast.success(mode === 'quote' ? 'Devis enregistré' : 'Facture enregistrée');
      window.location.href = mode === 'quote' ? `/quotes/${savedDocId}` : `/invoices/${savedDocId}`;
    } catch (err) {
      const e = err as Error;
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const title = mode === 'quote' ? (docId ? 'Modifier le devis' : 'Nouveau devis') : (docId ? 'Modifier la facture' : 'Nouvelle facture');

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}><ArrowLeft className="h-5 w-5" /></Button>
        <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="text-sm text-muted-foreground">{existingDoc?.number && `N° ${existingDoc.number}`}</p></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date d'émission</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{mode === 'quote' ? "Date d'expiration" : "Date d'échéance"}</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Conditions, remarques..." />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Lignes</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-2 h-4 w-4" />Ajouter une ligne</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article / Description</TableHead>
                  <TableHead className="w-20">Qté</TableHead>
                  <TableHead className="w-32">Prix unit.</TableHead>
                  <TableHead className="w-32 text-right">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select value={item.product_id ?? 'custom'} onValueChange={(v) => updateItem(idx, 'product_id', v === 'custom' ? null : v)}>
                        <SelectTrigger className="mb-1"><SelectValue placeholder="Produit / Service" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Saisie libre</SelectItem>
                          {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description" />
                    </TableCell>
                    <TableCell><Input type="number" min="1" step="any" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="w-20" /></TableCell>
                    <TableCell><Input type="number" min="0" step="any" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} /></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total, currency)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)} disabled={items.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sous-total</span><span className="font-medium">{formatCurrency(subtotal, currency)}</span></div>
              {taxRate > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">TVA ({taxRate}%)</span><span className="font-medium">{formatCurrency(taxAmount, currency)}</span></div>}
              <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span className="text-primary">{formatCurrency(total, currency)}</span></div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button onClick={() => handleSave()} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Enregistrement...' : 'Enregistrer en brouillon'}</Button>
              <Button variant="outline" onClick={() => handleSave(mode === 'quote' ? 'sent' : 'pending')} disabled={saving}>{mode === 'quote' ? 'Enregistrer et envoyer' : 'Enregistrer et émettre'}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

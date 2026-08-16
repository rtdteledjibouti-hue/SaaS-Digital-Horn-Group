'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Printer, FilePlus2, Send, Check, X, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { formatCurrency, formatDate, invoiceStatusLabels, invoiceStatusVariants, quoteStatusLabels, quoteStatusVariants } from '@/lib/format';
import type { Quote, Invoice, QuoteItem, InvoiceItem, Client, CompanySettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DocumentDetailProps {
  mode: 'quote' | 'invoice';
  id: string;
}

export default function DocumentDetail({ mode, id }: DocumentDetailProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const currency = settings?.currency ?? 'FDJ';
  const [doc, setDoc] = React.useState<(Quote & { clients?: Client | null }) | (Invoice & { clients?: Client | null }) | null>(null);
  const [items, setItems] = React.useState<(QuoteItem | InvoiceItem)[]>([]);
  const [loading, setLoading] = React.useState(true);

  const table = mode === 'quote' ? 'quotes' : 'invoices';
  const itemsTable = mode === 'quote' ? 'quote_items' : 'invoice_items';
  const foreignKey = mode === 'quote' ? 'quote_id' : 'invoice_id';

  async function load() {
    setLoading(true);
    const { data: d } = await supabase.from(table).select('*, clients(*)').eq('id', id).maybeSingle();
    setDoc(d as (Quote & { clients?: Client | null }) | (Invoice & { clients?: Client | null }) | null);
    const { data: its } = await supabase.from(itemsTable).select('*').eq(foreignKey, id).order('id');
    setItems((its ?? []) as (QuoteItem | InvoiceItem)[]);
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function updateStatus(status: string) {
    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Statut mis à jour');
    load();
  }

  async function convertToInvoice() {
    if (mode !== 'quote' || !doc) return;
    const q = doc as Quote;
    const seq = (settings?.invoice_seq ?? 0) + 1;
    const year = new Date().getFullYear();
    const number = `${settings?.invoice_prefix ?? 'FAC'}-${year}-${String(seq).padStart(4, '0')}`;

    const { data: inv, error } = await supabase.from('invoices').insert({
      client_id: q.client_id,
      quote_id: q.id,
      number,
      status: 'pending',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: q.expiry_date,
      subtotal: q.subtotal,
      tax_amount: q.tax_amount,
      total: q.total,
      notes: q.notes,
    }).select().single();
    if (error) { toast.error(error.message); return; }

    const itemInserts = items.map((i) => ({
      invoice_id: inv.id,
      product_id: i.product_id,
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      total: Number(i.total),
    }));
    await supabase.from('invoice_items').insert(itemInserts);
    await supabase.from('quotes').update({ status: 'converted' }).eq('id', id);
    await supabase.from('company_settings').update({ invoice_seq: seq }).eq('id', settings?.id);

    toast.success('Devis converti en facture');
    router.push(`/invoices/${inv.id}`);
  }

  function handlePrint() {
    window.print();
  }

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!doc) return <div className="p-8 text-center text-muted-foreground">Document introuvable</div>;

  const d = doc as Quote & Invoice & { clients?: Client | null };
  const statusLabels = mode === 'quote' ? quoteStatusLabels : invoiceStatusLabels;
  const statusVariants = mode === 'quote' ? quoteStatusVariants : invoiceStatusVariants;

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(mode === 'quote' ? '/quotes' : '/invoices')}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{d.number}</h1>
            <p className="text-sm text-muted-foreground">{mode === 'quote' ? 'Devis' : 'Facture'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimer</Button>
          {mode === 'quote' && (d as Quote).status !== 'converted' && (d as Quote).status !== 'cancelled' && (
            <Button onClick={convertToInvoice}><FilePlus2 className="mr-2 h-4 w-4" />Convertir en facture</Button>
          )}
        </div>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="print:border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold">{mode === 'quote' ? 'DEVIS' : 'FACTURE'}</h2>
              <p className="text-lg text-muted-foreground">{d.number}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{settings?.name ?? 'Mon Entreprise'}</p>
              {settings?.address && <p className="text-sm text-muted-foreground">{settings.address}</p>}
              {settings?.phone && <p className="text-sm text-muted-foreground">{settings.phone}</p>}
              {settings?.email && <p className="text-sm text-muted-foreground">{settings.email}</p>}
              {settings?.legal_id && <p className="text-sm text-muted-foreground">ID: {settings.legal_id}</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Client</p>
              <p className="font-medium">{d.clients?.name ?? '—'}</p>
              {d.clients?.address && <p className="text-sm text-muted-foreground">{d.clients.address}</p>}
              {d.clients?.city && <p className="text-sm text-muted-foreground">{[d.clients.city, d.clients.country].join(', ')}</p>}
              {d.clients?.phone && <p className="text-sm text-muted-foreground">{d.clients.phone}</p>}
              {d.clients?.email && <p className="text-sm text-muted-foreground">{d.clients.email}</p>}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Date d'émission:</span><span className="font-medium">{formatDate(d.issue_date)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{mode === 'quote' ? "Date d'expiration:" : "Date d'échéance:"}</span><span className="font-medium">{formatDate(mode === 'quote' ? (d as Quote).expiry_date : (d as Invoice).due_date)}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Statut:</span><Badge variant="outline" className={statusVariants[d.status as keyof typeof statusVariants]}>{statusLabels[d.status as keyof typeof statusLabels]}</Badge></div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead className="text-right">Prix unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.unit_price), currency)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(item.total), currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ml-auto w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sous-total</span><span>{formatCurrency(Number(d.subtotal), currency)}</span></div>
            {Number(d.tax_amount) > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">TVA</span><span>{formatCurrency(Number(d.tax_amount), currency)}</span></div>}
            <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span className="text-primary">{formatCurrency(Number(d.total), currency)}</span></div>
            {mode === 'invoice' && Number((d as Invoice).paid_amount) > 0 && (
              <>
                <div className="flex justify-between text-sm text-success"><span>Payé</span><span>{formatCurrency(Number((d as Invoice).paid_amount), currency)}</span></div>
                <div className="flex justify-between text-sm font-semibold text-destructive"><span>Reste à payer</span><span>{formatCurrency(Number(d.total) - Number((d as Invoice).paid_amount), currency)}</span></div>
              </>
            )}
          </div>

          {d.notes && <div className="border-t pt-4"><p className="text-xs font-semibold uppercase text-muted-foreground">Notes</p><p className="text-sm">{d.notes}</p></div>}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 print:hidden">
        {mode === 'quote' && (
          <>
            {(d as Quote).status === 'draft' && <Button onClick={() => updateStatus('sent')}><Send className="mr-2 h-4 w-4" />Marquer comme envoyé</Button>}
            {(d as Quote).status === 'sent' && (
              <>
                <Button onClick={() => updateStatus('accepted')} className="bg-success text-success-foreground hover:bg-success/90"><Check className="mr-2 h-4 w-4" />Accepté</Button>
                <Button variant="outline" onClick={() => updateStatus('refused')}><X className="mr-2 h-4 w-4" />Refusé</Button>
              </>
            )}
          </>
        )}
        {mode === 'invoice' && (
          <div className="flex items-center gap-2">
            <Select defaultValue={d.status} onValueChange={(v) => updateStatus(v)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(invoiceStatusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Phone, MapPin, Pencil, Trash2, Receipt, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { formatCurrency, formatDate, invoiceStatusLabels, invoiceStatusVariants, quoteStatusLabels, quoteStatusVariants } from '@/lib/format';
import type { Client, Invoice, Quote } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { settings } = useSettings();
  const [client, setClient] = React.useState<Client | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const currency = settings?.currency ?? 'FDJ';

  async function load() {
    setLoading(true);
    const [c, inv, q] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).maybeSingle(),
      supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('quotes').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ]);
    setClient(c.data as Client | null);
    setInvoices((inv.data ?? []) as Invoice[]);
    setQuotes((q.data ?? []) as Quote[]);
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function handleDelete() {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Client supprimé');
    router.push('/clients');
  }

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!client) return <div className="p-8 text-center text-muted-foreground">Client introuvable</div>;

  const totalInvoiced = invoices.filter(i => i.status !== 'cancelled' && i.status !== 'draft').reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.paid_amount), 0);

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center gap-4">
        <Link href="/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground">Fiche client</p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Modifier</Button>
        <Button variant="outline" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4 text-destructive" />Supprimer</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span>{client.email || '—'}</span></div>
            <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{client.phone || '—'}</span></div>
            <div className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" /><div><p>{client.address || '—'}</p><p className="text-muted-foreground">{[client.city, client.country].filter(Boolean).join(', ')}</p></div></div>
            {client.notes && <div className="pt-2 border-t"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{client.notes}</p></div>}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-3">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total facturé</p><p className="text-2xl font-bold">{formatCurrency(totalInvoiced, currency)}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total encaissé</p><p className="text-2xl font-bold text-success">{formatCurrency(totalPaid, currency)}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Solde dû</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalInvoiced - totalPaid, currency)}</p></CardContent></Card>
        </div>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Factures ({invoices.length})</TabsTrigger>
          <TabsTrigger value="quotes">Devis ({quotes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-4">
              {invoices.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Aucune facture pour ce client</div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Receipt className="h-4 w-4" /></div>
                        <div><p className="font-medium">{inv.number}</p><p className="text-xs text-muted-foreground">{formatDate(inv.issue_date)}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatCurrency(Number(inv.total), currency)}</span>
                        <Badge variant="outline" className={invoiceStatusVariants[inv.status]}>{invoiceStatusLabels[inv.status]}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="quotes">
          <Card>
            <CardContent className="p-4">
              {quotes.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Aucun devis pour ce client</div>
              ) : (
                <div className="space-y-2">
                  {quotes.map((q) => (
                    <Link key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent"><FileText className="h-4 w-4" /></div>
                        <div><p className="font-medium">{q.number}</p><p className="text-xs text-muted-foreground">{formatDate(q.issue_date)}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatCurrency(Number(q.total), currency)}</span>
                        <Badge variant="outline" className={quoteStatusVariants[q.status]}>{quoteStatusLabels[q.status]}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditClientDialog open={editOpen} onOpenChange={setEditOpen} client={client} onSaved={load} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle><AlertDialogDescription>Action irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditClientDialog({ open, onOpenChange, client, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; client: Client; onSaved: () => void }) {
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', address: '', city: '', country: '', notes: '' });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm({ name: client.name, email: client.email ?? '', phone: client.phone ?? '', address: client.address ?? '', city: client.city ?? '', country: client.country, notes: client.notes ?? '' });
  }, [client, open]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('clients').update(form).eq('id', client.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Client mis à jour');
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Modifier le client</DialogTitle><DialogDescription>Mettez à jour les informations</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-2"><Label>Pays</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

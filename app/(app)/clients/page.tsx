'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Search, Users, Mail, Phone, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { formatCurrency, formatDate, initials } from '@/lib/format';
import type { Client, Invoice, Quote } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const PAGE_SIZE = 10;

export default function ClientsPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [clients, setClients] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [editing, setEditing] = React.useState<Client | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Client | null>(null);

  const currency = settings?.currency ?? 'FDJ';

  async function load() {
    setLoading(true);
    let query = supabase.from('clients').select('*', { count: 'exact' });
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    query = query.order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, error, count: c } = await query;
    if (error) toast.error('Erreur: ' + error.message);
    setClients((data ?? []) as Client[]);
    setCount(c ?? 0);
    setLoading(false);
  }

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, search]);

  const totalPages = Math.ceil(count / PAGE_SIZE);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(c: Client) {
    setEditing(c);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from('clients').delete().eq('id', deleteTarget.id);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Client supprimé');
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Gérez votre base de clients</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nouveau client</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, email ou téléphone..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="mb-3 h-10 w-10 opacity-40" />
              <p>Aucun client trouvé</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/clients/${c.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initials(c.name)}</div>
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">{c.email || '—'}</div>
                        <div className="text-xs text-muted-foreground">{c.phone || '—'}</div>
                      </TableCell>
                      <TableCell>{c.city || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(c.balance), currency)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">{count} client(s) au total</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Précédent</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Suivant</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ClientDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={load} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Les factures et devis liés seront conservés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClientDialog({ open, onOpenChange, editing, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; editing: Client | null; onSaved: () => void }) {
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', address: '', city: '', country: "Côte d'Ivoire", notes: '' });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, email: editing.email ?? '', phone: editing.phone ?? '', address: editing.address ?? '', city: editing.city ?? '', country: editing.country, notes: editing.notes ?? '' });
    } else {
      setForm({ name: '', email: '', phone: '', address: '', city: '', country: "Côte d'Ivoire", notes: '' });
    }
  }, [editing, open]);

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Le nom est obligatoire'); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('clients').update(form).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Client mis à jour');
    } else {
      const { error } = await supabase.from('clients').insert(form);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Client créé');
    }
    setSaving(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          <DialogDescription>{editing ? 'Mettez à jour les informations' : 'Ajoutez un nouveau client à votre base'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="name">Nom *</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du client ou entreprise" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="phone">Téléphone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="address">Adresse</Label><Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="city">Ville</Label><Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="country">Pays</Label><Input id="country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

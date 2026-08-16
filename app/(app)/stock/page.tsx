'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Plus, Package, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Product, StockLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StockPage() {
  const { settings } = useSettings();
  const currency = settings?.currency ?? 'FDJ';
  const [products, setProducts] = React.useState<Product[]>([]);
  const [logs, setLogs] = React.useState<(StockLog & { products?: { name: string } | null })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Product | null>(null);
  const [movementOpen, setMovementOpen] = React.useState(false);
  const [movementProduct, setMovementProduct] = React.useState<Product | null>(null);
  const [movement, setMovement] = React.useState({ type: 'in', quantity: 0, note: '' });

  async function load() {
    setLoading(true);
    const [p, l] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('stock_logs').select('*, products(name)').order('created_at', { ascending: false }).limit(50),
    ]);
    setProducts((p.data ?? []) as Product[]);
    setLogs((l.data ?? []) as (StockLog & { products?: { name: string } | null })[]);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error('Le nom est obligatoire'); return; }
    const { id, ...data } = editing;
    if (id) {
      const { error } = await supabase.from('products').update(data).eq('id', id);
      if (error) { toast.error(error.message); return; }
      toast.success('Produit mis à jour');
    } else {
      const { error } = await supabase.from('products').insert(data);
      if (error) { toast.error(error.message); return; }
      toast.success('Produit créé');
    }
    setDialogOpen(false);
    load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Produit supprimé');
    setDeleteTarget(null);
    load();
  }

  async function handleMovement() {
    if (!movementProduct || !movement.quantity) return;
    const qty = movement.type === 'out' ? -Math.abs(movement.quantity) : Math.abs(movement.quantity);
    const newStock = Number(movementProduct.stock) + qty;
    const { error: e1 } = await supabase.from('products').update({ stock: newStock }).eq('id', movementProduct.id);
    const { error: e2 } = await supabase.from('stock_logs').insert({ product_id: movementProduct.id, type: movement.type, quantity: Math.abs(movement.quantity), note: movement.note });
    if (e1 || e2) { toast.error('Erreur'); return; }
    toast.success('Mouvement enregistré');
    setMovementOpen(false);
    setMovement({ type: 'in', quantity: 0, note: '' });
    load();
  }

  const lowStock = products.filter((p) => !p.is_service && Number(p.stock) <= Number(p.low_stock_threshold));
  const totalValue = products.filter(p => !p.is_service).reduce((s, p) => s + Number(p.stock) * Number(p.price), 0);

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Stocks</h1><p className="text-sm text-muted-foreground">Gérez vos produits et mouvements</p></div>
        <Button onClick={() => { setEditing({ id: '', user_id: '', name: '', sku: '', description: '', price: 0, stock: 0, low_stock_threshold: 5, is_service: false, created_at: '' }); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nouveau produit</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total produits</p><p className="text-2xl font-bold">{products.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Valeur du stock</p><p className="text-2xl font-bold">{formatCurrency(totalValue, currency)}</p></CardContent></Card>
        <Card className={lowStock.length > 0 ? 'border-warning/30' : ''}><CardContent className="p-5"><p className="text-sm text-muted-foreground">Stock critique</p><p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-warning' : ''}`}>{lowStock.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="products">
        <TabsList><TabsTrigger value="products">Produits</TabsTrigger><TabsTrigger value="logs">Mouvements</TabsTrigger></TabsList>

        <TabsContent value="products">
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Package className="mb-3 h-10 w-10 opacity-40" /><p>Aucun produit</p></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Prix</TableHead>
                      <TableHead className="text-right">Stock</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => {
                      const isLow = !p.is_service && Number(p.stock) <= Number(p.low_stock_threshold);
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div><p className="font-medium">{p.name}</p>{p.is_service && <Badge variant="secondary" className="mt-0.5">Service</Badge>}</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.sku || '—'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(p.price), currency)}</TableCell>
                          <TableCell className="text-right font-medium">{p.is_service ? '—' : p.stock}</TableCell>
                          <TableCell>{!p.is_service && isLow ? <Badge variant="outline" className="border-warning/40 text-warning"><AlertTriangle className="mr-1 h-3 w-3" />Critique</Badge> : !p.is_service ? <Badge variant="outline" className="border-success/40 text-success">OK</Badge> : '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {!p.is_service && <Button variant="ghost" size="icon" title="Mouvement" onClick={() => { setMovementProduct(p); setMovementOpen(true); }}><ArrowDownCircle className="h-4 w-4" /></Button>}
                              <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardContent className="p-4">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Aucun mouvement enregistré</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Produit</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Quantité</TableHead><TableHead>Note</TableHead><TableHead>Date</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.products?.name ?? '—'}</TableCell>
                        <TableCell>
                          {l.type === 'in' ? <Badge className="bg-success/15 text-success border-success/30" variant="outline"><ArrowDownCircle className="mr-1 h-3 w-3" />Entrée</Badge> :
                           l.type === 'out' ? <Badge className="bg-destructive/15 text-destructive border-destructive/30" variant="outline"><ArrowUpCircle className="mr-1 h-3 w-3" />Sortie</Badge> :
                           <Badge variant="secondary">Ajustement</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{l.quantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.note || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDateTime(l.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle><DialogDescription>Ajoutez ou modifiez un produit/service</DialogDescription></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="pname">Nom *</Label><Input id="pname" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>SKU</Label><Input value={editing.sku ?? ''} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} /></div>
                <div className="space-y-2"><Label>Prix *</Label><Input type="number" min="0" step="any" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Stock initial</Label><Input type="number" step="any" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} disabled={editing.is_service} /></div>
                <div className="space-y-2"><Label>Seuil d'alerte</Label><Input type="number" step="any" value={editing.low_stock_threshold} onChange={(e) => setEditing({ ...editing, low_stock_threshold: Number(e.target.value) })} disabled={editing.is_service} /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="service" checked={editing.is_service} onChange={(e) => setEditing({ ...editing, is_service: e.target.checked, stock: e.target.checked ? 0 : editing.stock })} className="rounded" />
                <Label htmlFor="service">C'est un service (pas de stock)</Label>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleSave}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement Dialog */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Mouvement de stock</DialogTitle><DialogDescription>{movementProduct?.name} — Stock actuel: {movementProduct?.stock}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Type</Label>
              <Select value={movement.type} onValueChange={(v) => setMovement({ ...movement, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrée (+)</SelectItem>
                  <SelectItem value="out">Sortie (-)</SelectItem>
                  <SelectItem value="adjust">Ajustement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Quantité *</Label><Input type="number" min="0" step="any" value={movement.quantity} onChange={(e) => setMovement({ ...movement, quantity: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Note</Label><Textarea value={movement.note} onChange={(e) => setMovement({ ...movement, note: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMovementOpen(false)}>Annuler</Button><Button onClick={handleMovement}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle><AlertDialogDescription>Action irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

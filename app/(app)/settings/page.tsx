'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Save, Building2, UserCog, MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { roleLabels } from '@/lib/format';
import type { CompanySettings, Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const { settings, refresh } = useSettings();
  const { profile } = useAuth();
  const [form, setForm] = React.useState<Partial<CompanySettings>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('company_settings').update({
      name: form.name,
      address: form.address,
      phone: form.phone,
      email: form.email,
      legal_id: form.legal_id,
      tax_rate: form.tax_rate,
      currency: form.currency,
      invoice_prefix: form.invoice_prefix,
      quote_prefix: form.quote_prefix,
    }).eq('id', form.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Paramètres enregistrés');
    refresh();
  }

  return (
    <div className="space-y-6 animate-in-fade">
      <div><h1 className="text-2xl font-bold tracking-tight">Paramètres</h1><p className="text-sm text-muted-foreground">Configuration de votre espace</p></div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company"><Building2 className="mr-2 h-4 w-4" />Entreprise</TabsTrigger>
          <TabsTrigger value="profile"><UserCog className="mr-2 h-4 w-4" />Profil</TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageSquare className="mr-2 h-4 w-4" />WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader><CardTitle className="text-lg">Informations de l'entreprise</CardTitle><CardDescription>Ces informations apparaissent sur vos devis et factures</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Nom de l'entreprise</Label><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Identifiant légal (RCCM, IF...)</Label><Input value={form.legal_id ?? ''} onChange={(e) => setForm({ ...form, legal_id: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Adresse</Label><Textarea value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label>Devise</Label><Input value={form.currency ?? 'FDJ'} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                <div className="space-y-2"><Label>TVA (%)</Label><Input type="number" min="0" step="any" value={form.tax_rate ?? 0} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Préfixe facture</Label><Input value={form.invoice_prefix ?? 'FAC'} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Préfixe devis</Label><Input value={form.quote_prefix ?? 'DEV'} onChange={(e) => setForm({ ...form, quote_prefix: e.target.value })} /></div>
              </div>
              <Button onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-lg">Mon profil</CardTitle><CardDescription>Vos informations personnelles</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Nom complet</Label><Input defaultValue={profile?.full_name ?? ''} readOnly /></div>
                <div className="space-y-2"><Label>Email</Label><Input defaultValue={profile?.email ?? ''} readOnly /></div>
              </div>
              <div className="space-y-2"><Label>Rôle</Label><div><Badge variant="secondary">{roleLabels[profile?.role ?? 'commercial']}</Badge></div></div>
              <p className="text-sm text-muted-foreground">Pour modifier votre profil, contactez l'administrateur.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card>
            <CardHeader><CardTitle className="text-lg">Notifications WhatsApp</CardTitle><CardDescription>Envoi automatique de devis et factures, et relances</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <p className="text-sm text-muted-foreground">L'intégration WhatsApp nécessite la configuration de l'API Twilio WhatsApp ou Meta Cloud API via une fonction serveur (Edge Function). Cette fonctionnalité sera activée après connexion de votre compte WhatsApp Business.</p>
              </div>
              <div className="space-y-2"><Label>Numéro WhatsApp Business</Label><Input placeholder="+225 07 00 00 00 00" /></div>
              <div className="space-y-2"><Label>Message de relance (facture en retard)</Label><Textarea defaultValue="Bonjour, votre facture {numero} d'un montant de {montant} est en retard de paiement. Merci de régulariser dans les meilleurs délais." /></div>
              <Button variant="outline"><Send className="mr-2 h-4 w-4" />Tester l'envoi</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

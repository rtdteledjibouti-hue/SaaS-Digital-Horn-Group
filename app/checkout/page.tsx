'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { CheckCircle2, ArrowLeft, Smartphone, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

const planDetails: Record<string, { name: string; price: string; period: string; features: string[] }> = {
  business: {
    name: 'Business',
    price: '15 000',
    period: 'FDJ/mois',
    features: ['Factures illimitées', '3 utilisateurs', 'Gestion de stock', 'Rapports avancés', 'Exports CSV', 'Support email'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Sur mesure',
    period: '',
    features: ['Utilisateurs illimités', 'Multi-sociétés', 'WhatsApp automation', 'API access', 'Support prioritaire'],
  },
};

type PayState = 'idle' | 'submitting' | 'pending' | 'approved' | 'failed';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading } = useAuth();
  const planId = searchParams.get('plan') || 'business';
  const plan = planDetails[planId] ?? planDetails.business;

  const [phone, setPhone] = React.useState('');
  const [payState, setPayState] = React.useState<PayState>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [referenceId, setReferenceId] = React.useState('');
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  React.useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function pollStatus(refId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/waafi-payment`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: 'check-status', referenceId: refId }),
          },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'approved') {
          setPayState('approved');
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === 'failed') {
          setPayState('failed');
          setErrorMsg('Le paiement a échoué. Veuillez réessayer.');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Entrez un numéro de téléphone valide (ex: 25377821121)');
      return;
    }

    setPayState('submitting');
    setErrorMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/waafi-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan: planId, phone }),
        },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error ?? 'Erreur de connexion au service de paiement');
        setPayState('failed');
        return;
      }

      const data = await res.json();

      if (data.status === 'approved') {
        setPayState('approved');
      } else if (data.status === 'failed') {
        setPayState('failed');
        setErrorMsg('Le paiement a échoué. Vérifiez votre solde et réessayez.');
      } else {
        setPayState('pending');
        setReferenceId(data.referenceId);
        pollStatus(data.referenceId);
      }
    } catch {
      setErrorMsg('Erreur de connexion. Veuillez réessayer.');
      setPayState('failed');
    }
  }

  if (payState === 'approved') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/logo-dhg.png" alt="Digital Horn Group" width={48} height={48} className="rounded-xl shadow-lg shadow-primary/20" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Digital Horn Group</h1>
            <p className="text-sm text-muted-foreground">Facturation & Gestion</p>
          </div>
        </div>

        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold">Paiement réussi !</h2>
            <p className="mt-2 text-muted-foreground">
              Votre plan {plan.name} est maintenant actif. Vous pouvez profiter de toutes les fonctionnalités.
            </p>
            <Button className="mt-6 w-full" onClick={() => router.push('/dashboard')}>
              Accéder au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="mb-8 flex items-center gap-3">
        <Image src="/logo-dhg.png" alt="Digital Horn Group" width={48} height={48} className="rounded-xl shadow-lg shadow-primary/20" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Digital Horn Group</h1>
          <p className="text-sm text-muted-foreground">Facturation & Gestion</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Plan {plan.name}</CardTitle>
          <CardDescription>
            Finalisez votre abonnement via Waafi Pay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{plan.price}</span>
            {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
          </div>

          <ul className="space-y-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                {f}
              </li>
            ))}
          </ul>

          {payState === 'pending' ? (
            <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="font-medium text-primary">Paiement en cours...</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vous allez recevoir une notification sur votre téléphone ({phone}) pour confirmer le paiement via Waafi Pay. Composez votre code PIN pour valider.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                En attente de confirmation... Ne fermez pas cette page.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone Waafi</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="25377821121"
                    className="pl-9"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={payState === 'submitting'}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Entrez votre numéro au format international sans le + (ex: 25377821121)
                </p>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">{errorMsg}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={payState === 'submitting'}>
                {payState === 'submitting' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Payer {plan.price} {plan.period}
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <Smartphone className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Paiement sécurisé via Waafi Pay (Telesom, Zaad, Sahal). Vous recevrez une notification sur votre mobile pour confirmer la transaction.
            </p>
          </div>

          <Button variant="ghost" className="w-full" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={null}>
      <CheckoutContent />
    </React.Suspense>
  );
}

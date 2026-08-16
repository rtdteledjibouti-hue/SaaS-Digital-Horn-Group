'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  FileText,
  Receipt,
  Users,
  Package,
  TrendingDown,
  BarChart3,
  Wallet,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const features = [
  { icon: FileText, title: 'Devis professionnels', desc: 'Créez et envoyez des devis en quelques clics, convertissez-les en factures.' },
  { icon: Receipt, title: 'Facturation', desc: 'Émettez des factures avec numérotation automatique et suivi des paiements.' },
  { icon: Users, title: 'CRM clients', desc: 'Gérez votre base de clients avec historique complet des transactions.' },
  { icon: Package, title: 'Gestion de stock', desc: 'Suivez vos produits, alertes de stock bas, et mouvements en temps réel.' },
  { icon: Wallet, title: 'Paiements', desc: 'Enregistrez les encaissements par espèces, virement, chèque ou mobile money.' },
  { icon: TrendingDown, title: 'Dépenses', desc: 'Saisissez et catégorisez vos charges pour un suivi financier complet.' },
  { icon: BarChart3, title: 'Rapports & analytics', desc: 'Tableaux de bord, chiffre d\'affaires, bénéfices, exports CSV.' },
  { icon: Smartphone, title: 'WhatsApp', desc: 'Envoi automatique de devis et factures, relances de paiement.' },
];

const plans = [
  { id: 'starter', name: 'Starter', price: 'Gratuit', period: '', features: ['Jusqu\'à 10 factures/mois', '1 utilisateur', 'Devis et factures', 'CRM clients'], highlight: false },
  { id: 'business', name: 'Business', price: '15 000', period: 'FDJ/mois', features: ['Factures illimitées', '3 utilisateurs', 'Gestion de stock', 'Rapports avancés', 'Exports CSV', 'Support email'], highlight: true },
  { id: 'enterprise', name: 'Enterprise', price: 'Sur mesure', period: '', features: ['Utilisateurs illimités', 'Multi-sociétés', 'WhatsApp automation', 'API access', 'Support prioritaire'], highlight: false },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-2">
            <Image src="/logo-dhg.png" alt="Digital Horn Group" width={36} height={36} className="rounded-lg" />
            <span className="text-xl font-bold tracking-tight">Digital Horn Group</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push('/login')}>
              Connexion
            </Button>
            <Button onClick={() => router.push('/signup')}>
              Essai gratuit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-primary" />
              Facturation & gestion ERP/CRM pour entreprises
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Gérez votre entreprise
              <br />
              <span className="text-primary">en toute simplicité</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Devis, factures, paiements, stock, clients et rapports — tout réuni dans une seule application
              pensée pour les entreprises.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={() => router.push('/signup')} className="w-full sm:w-auto">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push('/login')} className="w-full sm:w-auto">
                Voir une démo
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Sans carte bancaire
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Configuration en 2 minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Tout ce dont vous avez besoin</h2>
            <p className="mt-3 text-muted-foreground">
              Une suite complète d'outils pour gérer chaque aspect de votre activité
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            <div>
              <p className="text-4xl font-bold text-primary">500+</p>
              <p className="mt-1 text-sm text-muted-foreground">Entreprises utilisatrices</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary">50k+</p>
              <p className="mt-1 text-sm text-muted-foreground">Factures émises</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-primary">99.9%</p>
              <p className="mt-1 text-sm text-muted-foreground">Disponibilité</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Des tarifs simples</h2>
            <p className="mt-3 text-muted-foreground">Choisissez le plan qui correspond à votre activité</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-xl border bg-card p-8 ${
                  p.highlight ? 'border-primary shadow-lg ring-1 ring-primary/20' : ''
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Le plus populaire
                  </div>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{p.price}</span>
                  {p.period && <span className="text-sm text-muted-foreground">{p.period}</span>}
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  variant={p.highlight ? 'default' : 'outline'}
                  onClick={() => router.push(`/signup?plan=${p.id}`)}
                >
                  Choisir {p.name}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-primary p-12 text-center text-primary-foreground">
            <div className="absolute inset-0 -z-10 opacity-10">
              <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-white" />
              <div className="absolute -right-20 -bottom-20 h-60 w-60 rounded-full bg-white" />
            </div>
            <Shield className="mx-auto mb-4 h-12 w-12" />
            <h2 className="text-3xl font-bold">Prêt à digitaliser votre gestion ?</h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
              Rejoignez les centaines d'entreprises qui font confiance à Digital Horn Group pour leur facturation
              et leur gestion au quotidien.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-6"
              onClick={() => router.push('/signup')}
            >
              Créer mon compte gratuit
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/logo-dhg.png" alt="Digital Horn Group" width={28} height={28} className="rounded-md" />
              <span className="font-semibold">Digital Horn Group</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Digital Horn Group. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

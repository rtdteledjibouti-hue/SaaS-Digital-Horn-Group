'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, Lock, Mail, User } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'starter';
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    const { error, userId } = await signUp(email, password, fullName, 'admin');

    if (error) {
      setLoading(false);
      toast.error(error);
      return;
    }

    // Enregistre le plan choisi sur le profil
    if (userId) {
      await supabase.from('profiles').update({
        plan: selectedPlan,
        plan_status: selectedPlan === 'starter' ? 'active' : 'pending_payment',
      }).eq('id', userId);
    }

    setLoading(false);
    toast.success('Compte créé avec succès');

    if (selectedPlan === 'starter') {
      router.push('/dashboard');
    } else {
      router.push(`/checkout?plan=${selectedPlan}`);
    }
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
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <CardDescription>Inscrivez-vous pour commencer à gérer votre activité</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="Jean Kouassi"
                  className="pl-9"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@entreprise.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer mon compte
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Déjà inscrit ?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={null}>
      <SignupContent />
    </React.Suspense>
  );
}

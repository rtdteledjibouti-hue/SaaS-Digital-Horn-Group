'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { signOut, profile } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  async function handleSignOut() {
    await signOut();
    toast.success('Déconnexion réussie');
    router.push('/login');
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-sm lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Changer de thème"
        >
          {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <div className="hidden items-center gap-2 border-l pl-3 sm:flex">
          <div className="text-right">
            <p className="text-sm font-medium leading-none">{profile?.full_name || 'Utilisateur'}</p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Déconnexion">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

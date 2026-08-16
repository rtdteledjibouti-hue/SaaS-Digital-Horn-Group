'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  Wallet,
  Package,
  TrendingDown,
  BarChart3,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { roleLabels } from '@/lib/format';
import type { UserRole } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin', 'accountant', 'commercial'] },
  { href: '/clients', label: 'Clients', icon: Users, roles: ['admin', 'accountant', 'commercial'] },
  { href: '/quotes', label: 'Devis', icon: FileText, roles: ['admin', 'accountant', 'commercial'] },
  { href: '/invoices', label: 'Factures', icon: Receipt, roles: ['admin', 'accountant', 'commercial'] },
  { href: '/payments', label: 'Paiements', icon: Wallet, roles: ['admin', 'accountant'] },
  { href: '/stock', label: 'Stocks', icon: Package, roles: ['admin', 'accountant', 'commercial'] },
  { href: '/expenses', label: 'Dépenses', icon: TrendingDown, roles: ['admin', 'accountant'] },
  { href: '/reports', label: 'Rapports', icon: BarChart3, roles: ['admin', 'accountant'] },
  { href: '/settings', label: 'Paramètres', icon: Settings, roles: ['admin'] },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const role = profile?.role ?? 'commercial';

  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <Image src="/logo-dhg.png" alt="Digital Horn Group" width={36} height={36} className="rounded-lg" />
          <div>
            <p className="text-lg font-bold leading-none">Digital Horn Group</p>
            <p className="text-xs text-muted-foreground">ERP & CRM</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded p-1 hover:bg-muted lg:hidden">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin p-3">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.full_name || 'Utilisateur'}</p>
              <p className="text-xs text-muted-foreground">{roleLabels[role]}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

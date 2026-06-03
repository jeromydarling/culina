import { Outlet } from 'react-router-dom';
import {
  Home,
  CalendarPlus,
  CalendarCheck,
  FileCheck2,
  ChefHat,
  Store,
  Wallet,
  GraduationCap,
  Wrench,
  Settings,
  CreditCard,
  Megaphone,
  Users,
  Sparkles,
} from 'lucide-react';
import { DashboardLayout, type NavItem } from '@/components/layout/DashboardLayout';

const nav: NavItem[] = [
  { to: '/tenant', label: 'Home', icon: Home },
  { to: '/tenant/book', label: 'Book a Space', icon: CalendarPlus },
  { to: '/tenant/bookings', label: 'My Bookings', icon: CalendarCheck },
  { to: '/tenant/documents', label: 'My Documents', icon: FileCheck2 },
  { to: '/tenant/recipes', label: 'Recipe & Cost Lab', icon: ChefHat },
  { to: '/tenant/products', label: 'Products & Storefront', icon: Store },
  { to: '/tenant/marketing', label: 'Marketing Studio', icon: Sparkles },
  { to: '/tenant/grants', label: 'Grant Finder', icon: Wallet },
  { to: '/tenant/learning', label: 'Learning Hub', icon: GraduationCap },
  { to: '/tenant/mentors', label: 'Mentors', icon: Users },
  { to: '/tenant/community', label: 'Community', icon: Megaphone },
  { to: '/tenant/tools', label: 'Business Tools', icon: Wrench },
  { to: '/tenant/stripe-connect', label: 'Payments', icon: CreditCard },
  { to: '/tenant/settings', label: 'Settings', icon: Settings },
];

export default function TenantLayout() {
  return (
    <DashboardLayout nav={nav} title="Maker">
      <Outlet />
    </DashboardLayout>
  );
}

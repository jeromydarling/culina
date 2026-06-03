import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, Wallet, BookOpen } from 'lucide-react';
import { DashboardLayout, type NavItem } from '@/components/layout/DashboardLayout';

const nav: NavItem[] = [
  { to: '/admin', label: 'Platform Overview', icon: LayoutDashboard },
  { to: '/admin/kitchens', label: 'Kitchens', icon: Building2 },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/grants', label: 'Grants', icon: Wallet },
  { to: '/admin/content', label: 'Learning Content', icon: BookOpen },
];

export default function AdminLayout() {
  return (
    <DashboardLayout nav={nav} title="Admin">
      <Outlet />
    </DashboardLayout>
  );
}
